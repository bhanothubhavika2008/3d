/**
 * ProgressPanel — shows real-time generation progress stages
 */
import React from 'react'

const STAGES = [
  'Uploading image...',
  'Preparing image...',
  'Generating 3D geometry...',
  'Creating texture...',
  'Building 3D model...',
  'Loading model...',
]

interface Props {
  stage: string
  progress: number
}

export default function ProgressPanel({ stage, progress }: Props) {
  const currentIndex = STAGES.indexOf(stage)

  return (
    <div className="progress-panel">
      <div className="progress-panel__header">
        <span className="progress-panel__label">AI 3D Generation</span>
        <span className="progress-panel__pct">{progress}%</span>
      </div>

      {/* Bar */}
      <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage steps */}
      <ol className="progress-steps" aria-label="Generation steps">
        {STAGES.map((s, i) => {
          const done = currentIndex > i
          const active = currentIndex === i
          return (
            <li
              key={s}
              className={`progress-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
            >
              <span className="progress-step__dot" aria-hidden="true">
                {done ? '✓' : active ? <Spinner /> : '○'}
              </span>
              <span className="progress-step__label">{s}</span>
            </li>
          )
        })}
      </ol>

      <p className="progress-panel__current" aria-live="polite">{stage}</p>

      <style>{`
        .progress-panel {
          background: var(--bg-surface);
          border: 1px solid var(--bg-border);
          border-radius: var(--radius-xl);
          padding: 24px;
          animation: fadeIn 300ms ease;
        }
        .progress-panel__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 12px;
        }
        .progress-panel__label {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--accent-bright);
          letter-spacing: 0.02em;
        }
        .progress-panel__pct {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accent-bright);
        }

        /* Progress bar */
        .progress-bar {
          height: 4px;
          background: var(--bg-elevated);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .progress-bar__fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-main), var(--accent-bright));
          border-radius: 2px;
          transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 8px var(--accent-glow);
        }

        /* Steps */
        .progress-steps {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }
        .progress-step {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 0.85rem;
          transition: color var(--transition);
        }
        .progress-step.done { color: var(--success); }
        .progress-step.active { color: var(--text-primary); }
        .progress-step__dot {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          flex-shrink: 0;
          font-family: var(--font-mono);
        }

        .progress-panel__current {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          border-top: 1px solid var(--bg-border);
          padding-top: 12px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 26" strokeLinecap="round" />
    </svg>
  )
}
