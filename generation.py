"""
3D Generation API endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import uuid
import os
import time
import asyncio
from pathlib import Path

from ..services.model_service import ModelService
from ..services.image_service import ImageService
from ..models.schemas import GenerationResponse, GenerationStatus, JobStatus

router = APIRouter(tags=["generation"])

# In-memory job store (use Redis/DB in production)
jobs: dict = {}

model_service = ModelService()
image_service = ImageService()


@router.post("/generate", response_model=GenerationResponse)
async def generate_3d_model(
    background_tasks: BackgroundTasks,
    primary_image: UploadFile = File(...),
    secondary_images: Optional[List[UploadFile]] = File(default=None),
):
    """
    Accept one or more images and kick off 3D generation.
    Returns a job_id to poll for status.
    """
    # Validate primary image
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if primary_image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format: {primary_image.content_type}. Allowed: JPG, PNG, WEBP"
        )

    # Check file size (max 20MB)
    contents = await primary_image.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 20MB.")

    job_id = str(uuid.uuid4())
    output_dir = Path(os.getenv("OUTPUT_DIR", "./outputs")) / job_id
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save primary image
    primary_path = output_dir / f"primary{Path(primary_image.filename).suffix or '.png'}"
    with open(primary_path, "wb") as f:
        f.write(contents)

    # Save secondary images if provided
    secondary_paths = []
    if secondary_images:
        for i, img in enumerate(secondary_images):
            if img.filename and img.size and img.size > 0:
                img_contents = await img.read()
                sec_path = output_dir / f"secondary_{i}{Path(img.filename).suffix or '.png'}"
                with open(sec_path, "wb") as f:
                    f.write(img_contents)
                secondary_paths.append(str(sec_path))

    # Initialize job
    jobs[job_id] = {
        "status": "queued",
        "stage": "Uploading image...",
        "progress": 0,
        "primary_image": str(primary_path),
        "secondary_images": secondary_paths,
        "output_dir": str(output_dir),
        "created_at": time.time(),
        "result": None,
        "error": None,
    }

    # Run generation in background
    background_tasks.add_task(run_generation, job_id)

    return GenerationResponse(
        job_id=job_id,
        status="queued",
        message="Generation job started",
        multi_image_note=(
            "Note: The selected model (TripoSR) is a single-image reconstruction model. "
            "Only the primary image will be used for 3D generation. "
            "Multi-view support requires models like Zero123++ or InstantMesh."
            if secondary_paths else None
        )
    )


async def run_generation(job_id: str):
    """Background task: runs full 2D→3D pipeline"""
    job = jobs[job_id]

    try:
        def update(stage: str, progress: int):
            job["status"] = "processing"
            job["stage"] = stage
            job["progress"] = progress

        update("Preparing image...", 10)
        await asyncio.sleep(0.1)

        # Preprocess image
        processed_path = image_service.preprocess(
            job["primary_image"],
            job["output_dir"]
        )
        update("Generating 3D geometry...", 30)

        # Run model inference
        start_time = time.time()
        mesh_path = await asyncio.get_event_loop().run_in_executor(
            None,
            model_service.generate_mesh,
            processed_path,
            job["output_dir"],
            lambda s, p: update(s, p)
        )
        generation_time = time.time() - start_time

        update("Creating texture...", 75)
        await asyncio.sleep(0.1)

        update("Building 3D model...", 85)
        # Export to GLB + OBJ
        exports = model_service.export_model(mesh_path, job["output_dir"])

        update("Loading model...", 95)
        await asyncio.sleep(0.1)

        glb_path = exports.get("glb")
        obj_path = exports.get("obj")
        gltf_path = exports.get("gltf")

        glb_size = os.path.getsize(glb_path) if glb_path and os.path.exists(glb_path) else 0

        job["status"] = "complete"
        job["stage"] = "Complete"
        job["progress"] = 100
        job["result"] = {
            "glb_url": f"/outputs/{job_id}/{Path(glb_path).name}" if glb_path else None,
            "gltf_url": f"/outputs/{job_id}/{Path(gltf_path).name}" if gltf_path else None,
            "obj_url": f"/outputs/{job_id}/{Path(obj_path).name}" if obj_path else None,
            "glb_size_bytes": glb_size,
            "generation_time_seconds": round(generation_time, 1),
            "format": "GLB",
        }

    except FileNotFoundError as e:
        job["status"] = "error"
        job["error"] = (
            "TripoSR model not found. Please follow the installation steps in README.md "
            "to download the model weights. " + str(e)
        )
    except RuntimeError as e:
        msg = str(e)
        if "CUDA" in msg or "cuda" in msg:
            job["status"] = "error"
            job["error"] = f"GPU error: {msg}. Try setting USE_CPU_FALLBACK=true in .env."
        else:
            job["status"] = "error"
            job["error"] = f"Generation failed: {msg}"
    except Exception as e:
        job["status"] = "error"
        job["error"] = f"Unexpected error during generation: {type(e).__name__}: {str(e)}"


@router.get("/job/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Poll job status"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        stage=job["stage"],
        progress=job["progress"],
        result=job.get("result"),
        error=job.get("error"),
    )


@router.get("/download/{job_id}/{filename}")
async def download_file(job_id: str, filename: str):
    """Download a generated model file"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    output_dir = Path(jobs[job_id]["output_dir"])
    file_path = output_dir / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Security: ensure path is within output dir
    if not str(file_path.resolve()).startswith(str(output_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )
