"""
Health check and system status routes
"""
from fastapi import APIRouter
import torch
import platform
import psutil

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Photo2Model API is running"}


@router.get("/system-info")
async def system_info():
    """Returns GPU/CPU availability info"""
    gpu_available = torch.cuda.is_available()
    gpu_name = None
    gpu_memory = None

    if gpu_available:
        gpu_name = torch.cuda.get_device_name(0)
        mem = torch.cuda.get_device_properties(0).total_memory
        gpu_memory = f"{mem / 1024**3:.1f} GB"

    return {
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "gpu_memory": gpu_memory,
        "cpu_count": psutil.cpu_count(),
        "ram_total_gb": round(psutil.virtual_memory().total / 1024**3, 1),
        "ram_available_gb": round(psutil.virtual_memory().available / 1024**3, 1),
        "platform": platform.system(),
        "python_version": platform.python_version(),
        "torch_version": torch.__version__,
    }
