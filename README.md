# Photo2Model

**Turn a 2D photo into an interactive 3D model — locally, with no paid APIs.**

```
2D Photo → TripoSR (open-source AI) → Real 3D Mesh → WebGL Viewer
```

## Architecture

```
/photo2model
  /frontend          React + TypeScript + Three.js / React Three Fiber
  /backend           Python + FastAPI + PyTorch + TripoSR
```

- **Frontend** → Vite + React 18 + R3F (Three.js) — drag-and-drop upload, live progress, GLB viewer, downloads
- **Backend** → FastAPI with async background jobs — image preprocessing, TripoSR inference, trimesh GLB export
- **AI Model** → [TripoSR](https://github.com/VAST-AI-Research/TripoSR) by Stability AI & Tripo AI (MIT license, self-hosted, ~1 GB model weights)

---

## Requirements

| Component | Minimum                           |
|-----------|-----------------------------------|
| OS        | Linux / macOS / Windows (WSL2)    |
| Python    | 3.10+                             |
| Node.js   | 18+                               |
| RAM       | 8 GB (16 GB recommended)          |
| GPU       | CUDA 11.8+ GPU **strongly recommended** |
| Disk      | ~5 GB for model weights + outputs |

> **No GPU?**  
> TripoSR can run on CPU but will take **5–20 minutes per image**.  
> Set `USE_CPU_FALLBACK=true` in `backend/.env` to skip the GPU check.

---

## Quick Start

### 1. Clone & set up backend

```bash
cd photo2model/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install TripoSR (open-source, MIT licensed)
pip install git+https://github.com/VAST-AI-Research/TripoSR.git

# (Optional but recommended) Install rembg for background removal
pip install rembg[gpu]            # GPU version
# pip install rembg               # CPU-only version
```

### 2. Configure backend

```bash
cp .env.example .env
# Edit .env if needed (OUTPUT_DIR, USE_CPU_FALLBACK, MESH_RESOLUTION)
```

### 3. Start backend

```bash
cd photo2model/backend
source venv/bin/activate
python main.py
```

Backend runs on **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

---

### 4. Set up & start frontend

```bash
cd photo2model/frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## GPU Installation (CUDA)

If you have an NVIDIA GPU, install the CUDA-compatible PyTorch build:

```bash
# Check your CUDA version: nvidia-smi
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
# or for CUDA 12.1:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## Model Weights

TripoSR downloads model weights automatically from HuggingFace Hub on first use (~1 GB):

```
~/.cache/huggingface/hub/models--stabilityai--TripoSR/
```

To pre-download manually:
```python
from tsr.system import TSR
TSR.from_pretrained("stabilityai/TripoSR")
```

---

## API Endpoints

| Method | Path                          | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/v1/health`              | Health check                         |
| GET    | `/api/v1/system-info`         | GPU/CPU info                         |
| POST   | `/api/v1/generate`            | Start a generation job               |
| GET    | `/api/v1/job/{job_id}`        | Poll job status                      |
| GET    | `/api/v1/download/{id}/{file}`| Download generated model file        |
| GET    | `/outputs/{job_id}/{file}`    | Static file serving (GLB, OBJ, etc.) |

### POST /api/v1/generate

```
Content-Type: multipart/form-data

primary_image:    File   (required) — JPG, PNG, or WEBP, max 20 MB
secondary_images: File[] (optional) — additional angles
```

Returns `{ job_id, status, message, multi_image_note? }`

### GET /api/v1/job/{job_id}

Returns:
```json
{
  "job_id": "...",
  "status": "queued | processing | complete | error",
  "stage": "Generating 3D geometry...",
  "progress": 60,
  "result": {
    "glb_url": "/outputs/.../model.glb",
    "gltf_url": "/outputs/.../model.gltf",
    "obj_url": "/outputs/.../mesh.obj",
    "glb_size_bytes": 524288,
    "generation_time_seconds": 45.2,
    "format": "GLB"
  },
  "error": null
}
```

---

## Single-Image Reconstruction: Limitations

TripoSR is a **single-image** 3D reconstruction model. This means:

- Only the **primary image** is used for 3D generation
- The back/underside of the object will be **inferred**, not reconstructed from real data
- Results are best for **objects with clear silhouettes** and **neutral backgrounds**
- Background removal (via `rembg`) significantly improves output quality
- Complex, highly detailed scenes (e.g., landscapes, crowds) produce poor results

### Tips for best results

- Use a **well-lit photo** with the object centered
- **Single object** on a plain background works best
- Use the **rembg** optional package for automatic background removal
- Photos of **toys, products, figurines, cars, simple objects** work well

### Multi-view support (future)

To use multiple angles, you would swap TripoSR for:
- [Zero123++](https://github.com/SUDO-AI-3D/zero123plus) — multi-view generation from a single image
- [InstantMesh](https://github.com/TencentARC/InstantMesh) — multi-view 3D reconstruction
- [OpenLRM](https://github.com/3DTopia/OpenLRM) — large reconstruction model

The `ModelService` in `backend/app/services/model_service.py` is designed to be **swappable** — replace `generate_mesh()` and `_load_model()` to use any other open-source model.

---

## Output Files

Generated files are stored in `backend/outputs/{job_id}/`:

| File                   | Description                      |
|------------------------|----------------------------------|
| `primary.png`          | Original uploaded image          |
| `preprocessed.png`     | Background-removed, resized image|
| `mesh.obj`             | Raw OBJ mesh from TripoSR        |
| `model.glb`            | Binary GLTF (for web viewer)     |
| `model.gltf`           | Text GLTF format                 |

---

## Project Structure

```
photo2model/
├── README.md
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   ├── ImageUploader.tsx   drag-and-drop upload zone
│       │   ├── ProgressPanel.tsx   real-time progress display
│       │   ├── ModelViewer.tsx     Three.js / R3F 3D viewer
│       │   ├── DownloadPanel.tsx   result meta + download buttons
│       │   └── SystemBanner.tsx    GPU/CPU status banner
│       ├── hooks/
│       │   └── useGeneration.ts    generation lifecycle hook
│       └── services/
│           └── api.ts              API client
└── backend/
    ├── main.py                     uvicorn entry point
    ├── requirements.txt
    ├── .env.example
    └── app/
        ├── main.py                 FastAPI app factory + CORS + static files
        ├── api/
        │   ├── routes.py           health + system-info
        │   └── generation.py       POST /generate, GET /job/:id, GET /download
        ├── models/
        │   └── schemas.py          Pydantic request/response schemas
        └── services/
            ├── image_service.py    preprocessing + background removal
            └── model_service.py    TripoSR inference + GLB export (swappable)
```

---

## Troubleshooting

**`tsr.system not found`**  
Install TripoSR: `pip install git+https://github.com/VAST-AI-Research/TripoSR.git`

**`CUDA out of memory`**  
Lower mesh resolution: set `MESH_RESOLUTION=128` in `.env`

**Generation very slow (no progress after "Generating 3D geometry...")**  
You are on CPU. This is expected — wait 5–20 min or get a CUDA GPU.

**`rembg` not installed / background removal skipped**  
Not required. Install with `pip install rembg` for better results.

**Frontend shows blank 3D viewer**  
Check browser console — WebGL must be enabled. Works in Chrome, Firefox, Edge, Safari 15+.

**Backend not reachable from frontend**  
Ensure backend is running on port 8000. The Vite dev server proxies `/api` and `/outputs` automatically.
