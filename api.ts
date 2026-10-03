/**
 * API service — communicates with the FastAPI backend
 */

const BASE = '/api/v1'

export interface GenerationResponse {
  job_id: string
  status: string
  message: string
  multi_image_note?: string
}

export interface JobStatus {
  job_id: string
  status: 'queued' | 'processing' | 'complete' | 'error'
  stage: string
  progress: number
  result?: {
    glb_url?: string
    gltf_url?: string
    obj_url?: string
    glb_size_bytes?: number
    generation_time_seconds?: number
    format: string
  }
  error?: string
}

export interface SystemInfo {
  gpu_available: boolean
  gpu_name?: string
  gpu_memory?: string
  cpu_count: number
  ram_total_gb: number
  ram_available_gb: number
  platform: string
  python_version: string
  torch_version: string
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function getSystemInfo(): Promise<SystemInfo | null> {
  try {
    const res = await fetch(`${BASE}/system-info`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateModel(
  primaryImage: File,
  secondaryImages?: File[]
): Promise<GenerationResponse> {
  const formData = new FormData()
  formData.append('primary_image', primaryImage)
  if (secondaryImages) {
    for (const img of secondaryImages) {
      formData.append('secondary_images', img)
    }
  }

  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `Server error ${res.status}`)
  }

  return res.json()
}

export async function pollJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BASE}/job/${jobId}`)
  if (!res.ok) throw new Error(`Failed to poll job ${jobId}`)
  return res.json()
}

export function getDownloadUrl(jobId: string, filename: string): string {
  return `${BASE}/download/${jobId}/${filename}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
