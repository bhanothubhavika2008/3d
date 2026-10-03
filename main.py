"""
FastAPI application factory
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from .api.routes import router
from .api.generation import router as gen_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Photo2Model API",
        description="2D to 3D model generation using open-source AI",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Ensure output directory exists
    outputs_dir = Path(os.getenv("OUTPUT_DIR", "./outputs"))
    outputs_dir.mkdir(parents=True, exist_ok=True)

    # Serve generated model files
    app.mount("/outputs", StaticFiles(directory=str(outputs_dir)), name="outputs")

    app.include_router(router, prefix="/api/v1")
    app.include_router(gen_router, prefix="/api/v1")

    return app
