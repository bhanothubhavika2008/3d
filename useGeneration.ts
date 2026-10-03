/**
 * Custom hook that manages the full 2D→3D generation lifecycle.
 */
import { useState, useRef, useCallback } from 'react'
import {
  generateModel,
  pollJob,
  JobStatus,
  GenerationResponse,
} from '../services/api'

export type GenerationState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'

export interface UseGenerationResult {
  state: GenerationState
  stage: string
  progress: number
  jobId: string | null
  result: JobStatus['result'] | null
  error: string | null
  multiImageNote: string | null
  startGeneration: (primary: File, secondary?: File[]) => Promise<void>
  reset: () => void
}

const POLL_INTERVAL = 1500  // ms

export function useGeneration(): UseGenerationResult {
  const [state, setState] = useState<GenerationState>('idle')
  const [stage, setStage] = useState('Ready')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<JobStatus['result'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [multiImageNote, setMultiImageNote] = useState<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }

  const poll = useCallback(async (id: string) => {
    try {
      const job = await pollJob(id)
      setStage(job.stage)
      setProgress(job.progress)

      if (job.status === 'complete') {
        setState('complete')
        setResult(job.result ?? null)
        stopPolling()
      } else if (job.status === 'error') {
        setState('error')
        setError(job.error ?? 'Generation failed. See backend logs.')
        stopPolling()
      } else {
        // Still running — schedule next poll
        pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL)
      }
    } catch (e) {
      setError(`Connection lost: ${e instanceof Error ? e.message : String(e)}`)
      setState('error')
      stopPolling()
    }
  }, [])

  const startGeneration = useCallback(async (
    primary: File,
    secondary?: File[]
  ) => {
    stopPolling()
    setState('uploading')
    setStage('Uploading image...')
    setProgress(5)
    setError(null)
    setResult(null)
    setJobId(null)
    setMultiImageNote(null)

    try {
      const resp: GenerationResponse = await generateModel(primary, secondary)
      setJobId(resp.job_id)
      if (resp.multi_image_note) setMultiImageNote(resp.multi_image_note)
      setState('processing')
      poll(resp.job_id)
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [poll])

  const reset = useCallback(() => {
    stopPolling()
    setState('idle')
    setStage('Ready')
    setProgress(0)
    setJobId(null)
    setResult(null)
    setError(null)
    setMultiImageNote(null)
  }, [])

  return {
    state, stage, progress, jobId,
    result, error, multiImageNote,
    startGeneration, reset,
  }
}
