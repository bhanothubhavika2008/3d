"""
Model service — wraps TripoSR (stabilityai/TripoSR) for 2D → 3D inference.

TripoSR is an open-source, MIT-licensed single-image 3D reconstruction model
from Stability AI & Tripo AI. It runs locally with no external API calls.

Installation (see README.md):
    pip install -r requirements.txt
    python -c "from tsr.system import TSR; TSR.from_pretrained('stabilityai/TripoSR')"

The service is designed to be replaceable: swap out _load_model() and
generate_mesh() to use InstantMesh, Zero123++, or any other open-source model.
"""
import os
import torch
from pathlib import Path
from PIL import Image
import numpy as np
from typing import Callable, Optional


# ──────────────────────────────────────────────────────────────────────────────
# Device selection
# ──────────────────────────────────────────────────────────────────────────────
def _get_device() -> torch.device:
    force_cpu = os.getenv("USE_CPU_FALLBACK", "false").lower() == "true"
    if not force_cpu and torch.cuda.is_available():
        print("[ModelService] Using CUDA GPU for inference.")
        return torch.device("cuda:0")
    elif not force_cpu and torch.backends.mps.is_available():
        print("[ModelService] Using Apple MPS for inference.")
        return torch.device("mps")
    else:
        print("[ModelService] WARNING: Using CPU. Generation may take 5–15 minutes.")
        return torch.device("cpu")


DEVICE = _get_device()
_model_cache = None   # Lazy-loaded singleton


# ──────────────────────────────────────────────────────────────────────────────
# Model loading
# ──────────────────────────────────────────────────────────────────────────────
def _load_model():
    """Load TripoSR from HuggingFace Hub (cached after first download)."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    try:
        from tsr.system import TSR
    except ImportError:
        raise FileNotFoundError(
            "TripoSR package not found. "
            "Please run: pip install -r requirements.txt  "
            "and clone https://github.com/VAST-AI-Research/TripoSR into the backend directory."
        )

    print("[ModelService] Loading TripoSR model (first run may download ~1 GB)...")
    model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model = model.to(DEVICE)
    model.eval()
    _model_cache = model
    print("[ModelService] TripoSR loaded successfully.")
    return model


# ──────────────────────────────────────────────────────────────────────────────
# ModelService
# ──────────────────────────────────────────────────────────────────────────────
class ModelService:
    """
    Thin wrapper around TripoSR.

    To swap in a different model (e.g. InstantMesh):
    - Override _run_inference() with the new model's forward pass.
    - Override _extract_mesh() if the new model returns a different mesh format.
    """

    def generate_mesh(
        self,
        preprocessed_image_path: str,
        output_dir: str,
        progress_cb: Optional[Callable[[str, int], None]] = None,
    ) -> str:
        """
        Run TripoSR inference and extract the 3D mesh.

        Returns path to the raw mesh file (.obj or .glb).
        """
        def _progress(stage: str, pct: int):
            if progress_cb:
                progress_cb(stage, pct)

        _progress("Loading 3D model weights...", 35)
        model = _load_model()

        _progress("Generating 3D geometry...", 45)
        image = Image.open(preprocessed_image_path).convert("RGB")
        image_np = np.array(image) / 255.0

        with torch.no_grad():
            scene_codes = model([image_np], device=DEVICE)

        _progress("Extracting mesh from neural field...", 60)
        meshes = model.extract_mesh(
            scene_codes,
            resolution=256,           # increase to 512 for higher quality (slower)
            threshold=25.0,
        )

        if not meshes:
            raise RuntimeError("TripoSR returned no mesh. The image may be too ambiguous.")

        mesh = meshes[0]

        _progress("Creating texture...", 72)
        mesh_path = str(Path(output_dir) / "mesh.obj")
        mesh.export(mesh_path)
        print(f"[ModelService] Mesh saved to {mesh_path}")
        return mesh_path

    def export_model(self, mesh_path: str, output_dir: str) -> dict:
        """
        Convert the raw mesh to GLB, GLTF and OBJ for download.

        Returns dict with keys: glb, gltf, obj  (paths or None)
        """
        out = Path(output_dir)
        results = {"glb": None, "gltf": None, "obj": None}

        try:
            import trimesh

            mesh = trimesh.load(mesh_path, force="mesh")

            # OBJ (already exists from TripoSR, just note the path)
            results["obj"] = mesh_path

            # GLB — binary GLTF, compact, preferred for web viewers
            glb_path = str(out / "model.glb")
            mesh.export(glb_path)
            results["glb"] = glb_path

            # GLTF — text JSON variant
            gltf_path = str(out / "model.gltf")
            mesh.export(gltf_path)
            results["gltf"] = gltf_path

            print(f"[ModelService] Exports: GLB={glb_path}, GLTF={gltf_path}, OBJ={mesh_path}")
        except ImportError:
            raise RuntimeError(
                "trimesh not installed. Run: pip install trimesh"
            )
        except Exception as e:
            raise RuntimeError(f"Model export failed: {e}")

        return results
