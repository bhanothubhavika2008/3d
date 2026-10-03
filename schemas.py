"""
Pydantic schemas for request/response models
"""
from pydantic import BaseModel
from typing import Optional, Any


class GenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str
    multi_image_note: Optional[str] = None


class GenerationStatus(BaseModel):
    stage: str
    progress: int  # 0–100


class GenerationResult(BaseModel):
    glb_url: Optional[str]
    gltf_url: Optional[str]
    obj_url: Optional[str]
    glb_size_bytes: Optional[int]
    generation_time_seconds: Optional[float]
    format: str


class JobStatus(BaseModel):
    job_id: str
    status: str          # queued | processing | complete | error
    stage: str
    progress: int
    result: Optional[Any] = None
    error: Optional[str] = None
