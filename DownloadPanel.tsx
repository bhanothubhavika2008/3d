/**
 * DownloadPanel — shows generation results and download buttons
 */
import React from 'react'
import { JobStatus, getDownloadUrl, formatBytes } from '../services/api'

interface Props {
  jobId: string
  result: NonNullable<JobStatus['result']>
  onReset: () => void
}

export default function DownloadPanel({ jobId, result, onReset }: Props) {
  const glbFilename = result.glb_url?.split('/').pop() || 'model.glb'
  const gltfFilename = result.gltf_url?.split('/').pop() || 'model.gltf'
  const objFilename = result.obj_url?.split('/').pop() || 'model.obj'

  return (
    <div className="dl-panel">
      {/* Status row */}
      <div className="dl-status">
        <span className="dl-status__dot" aria-hidden="true" />
        <span className="dl-status__text">3D model generated successfully</span>
      </div>

      {/* Meta row */}
      <div className="dl-meta">
        {result.glb_size_bytes != null && (
          <span className="dl-chip">
            <span className="dl-chip__key">Size</span>
            {formatBytes(result.glb_size_bytes)}
          </span>
        )}
        {result.generation_time_seconds != null && (
          <span className="dl-chip">
            <span className="dl-chip__key">Time</span>
            {result.generation_time_seconds}s
          </span>
        )}
        <span className="dl-chip">
          <span className="dl-chip__key">Format</span>
          {result.format}
        </span>
      </div>

      {/* Download buttons */}
      <div className="dl-buttons">
        {result.glb_url && (
          <a
            className="dl-btn dl-btn--primary"
            href={getDownloadUrl(jobId, glbFilename)}
            download={glbFilename}
          >
            <DownloadIcon />
            Download GLB
          </a>
        )}
        {result.gltf_url && (
          <a
            className="dl-btn"
            href={getDownloadUrl(jobId, gltfFilename)}
            download={gltfFilename}
          >
            <DownloadIcon />
            Download GLTF
          </a>
        )}
        {result.obj_url && (
          <a
            className="dl-btn"
            href={getDownloadUrl(jobId, objFilename)}
            download={objFilename}
          >
            <DownloadIcon />
            Download OBJ
          </a>
        )}
      </div>

      <button className="btn-new" onClick={onReset}>
        Generate another model
      </button>

      <style>{`
        .dl-panel {
          background: var(--bg-surface);
          border: 1px solid var(--bg-border);
          border-radius: var(--radius-xl);
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeIn 300ms ease;
        }

        .dl-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dl-status__dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
        }
        .dl-status__text {
          font-weight: 600;
          color: var(--success);
          font-size: 0.9rem;
        }

        .dl-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .dl-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--bg-border);
          border-radius: 100px;
          padding: 4px 12px;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .dl-chip__key {
          color: var(--text-muted);
          margin-right: 2px;
        }

        .dl-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dl-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          font-weight: 500;
          text-decoration: none;
          border: 1px solid var(--bg-border);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          transition: all var(--transition);
        }
        .dl-btn:hover {
          border-color: var(--accent-main);
          color: var(--accent-bright);
          background: var(--accent-pulse);
          text-decoration: none;
        }
        .dl-btn--primary {
          background: var(--accent-main);
          color: white;
          border-color: var(--accent-main);
        }
        .dl-btn--primary:hover {
          background: var(--accent-bright);
          border-color: var(--accent-bright);
          color: white;
        }

        .btn-new {
          align-self: flex-start;
          background: transparent;
          border: 1px solid var(--bg-border);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          transition: all var(--transition);
          cursor: pointer;
          font-family: var(--font-sans);
          margin-top: 4px;
        }
        .btn-new:hover {
          border-color: var(--accent-main);
          color: var(--accent-bright);
        }
      `}</style>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 7l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
