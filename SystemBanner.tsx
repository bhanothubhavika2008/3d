/**
 * SystemBanner — shows GPU/CPU availability from backend
 */
import React, { useEffect, useState } from 'react'
import { getSystemInfo, SystemInfo } from '../services/api'

export default function SystemBanner() {
  const [info, setInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    getSystemInfo().then(setInfo).catch(() => null)
  }, [])

  if (!info) return null

  return (
    <div className={`sys-banner ${info.gpu_available ? 'sys-banner--gpu' : 'sys-banner--cpu'}`}>
      <span className="sys-banner__dot" />
      {info.gpu_available ? (
        <span>GPU ready — {info.gpu_name} ({info.gpu_memory})</span>
      ) : (
        <span>
          No GPU detected — running on CPU ({info.cpu_count} cores, {info.ram_available_gb} GB RAM free).
          Generation may take 5–20 minutes.
        </span>
      )}
      <style>{`
        .sys-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-family: var(--font-mono);
          padding: 7px 14px;
          border-radius: var(--radius-md);
          border: 1px solid;
        }
        .sys-banner--gpu {
          background: rgba(34,197,94,0.07);
          border-color: rgba(34,197,94,0.2);
          color: var(--success);
        }
        .sys-banner--cpu {
          background: rgba(245,158,11,0.07);
          border-color: rgba(245,158,11,0.2);
          color: var(--warning);
        }
        .sys-banner__dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
