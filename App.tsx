/**
 * App.tsx — main page for Photo2Model
 * Orchestrates upload → generation → viewer flow
 */
import React, { useState, lazy, Suspense } from 'react'
import ImageUploader from './components/ImageUploader'
import ProgressPanel from './components/ProgressPanel'
import DownloadPanel from './components/DownloadPanel'
import SystemBanner from './components/SystemBanner'
import { useGeneration } from './hooks/useGeneration'

// Lazy-load heavy 3D viewer only after generation completes
const ModelViewer = lazy(() => import('./components/ModelViewer'))

interface SelectedImages {
  primary: { file: File; preview: string; width: number; height: number }
  secondary: Array<{ file: File; preview: string; width: number; height: number }>
}

export default function App() {
  const [selected, setSelected] = useState<SelectedImages | null>(null)
  const gen = useGeneration()

  const handleImagesSelected = (
    primary: SelectedImages['primary'],
    secondary: SelectedImages['secondary']
  ) => {
    setSelected({ primary, secondary })
    // If previously completed, reset on new image selection
    if (gen.state === 'complete' || gen.state === 'error') {
      gen.reset()
    }
  }

  const handleGenerate = () => {
    if (!selected) return
    gen.startGeneration(
      selected.primary.file,
      selected.secondary.map(s => s.file)
    )
  }

  const handleReset = () => {
    gen.reset()
    setSelected(null)
  }

  const isProcessing = gen.state === 'uploading' || gen.state === 'processing'
  const canGenerate = !!selected && gen.state === 'idle'
  const showViewer = gen.state === 'complete' && gen.result?.glb_url

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__logo">
            <LogoMark />
            <span className="app-header__wordmark">Photo2Model</span>
          </div>
          <p className="app-header__tagline">
            2D photo → open-source AI → real 3D mesh
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        <div className="app-container">

          {/* System banner */}
          <SystemBanner />

          {/* Upload section — hidden during/after generation */}
          {gen.state !== 'complete' && (
            <section className="section">
              <h2 className="section__title">Upload Photo</h2>
              <ImageUploader
                onImagesSelected={handleImagesSelected}
                disabled={isProcessing}
              />

              {selected && (
                <div className="generate-row">
                  <button
                    className="btn-generate"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                  >
                    {isProcessing ? (
                      <>
                        <SpinnerIcon />
                        Generating…
                      </>
                    ) : (
                      <>
                        <CubeIcon />
                        Generate 3D Model
                      </>
                    )}
                  </button>
                  {!isProcessing && gen.state !== 'complete' && (
                    <button className="btn-clear" onClick={handleReset}>
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Multi-image note from backend */}
              {gen.multiImageNote && (
                <div className="info-note">
                  <InfoIcon />
                  <span>{gen.multiImageNote}</span>
                </div>
              )}
            </section>
          )}

          {/* Progress */}
          {isProcessing && (
            <section className="section">
              <ProgressPanel stage={gen.stage} progress={gen.progress} />
            </section>
          )}

          {/* Error */}
          {gen.state === 'error' && gen.error && (
            <section className="section">
              <div className="error-panel">
                <ErrorIcon />
                <div className="error-panel__body">
                  <p className="error-panel__title">Generation failed</p>
                  <p className="error-panel__msg">{gen.error}</p>
                </div>
                <button className="btn-retry" onClick={handleReset}>
                  Try again
                </button>
              </div>
            </section>
          )}

          {/* 3D Viewer + Download */}
          {gen.state === 'complete' && gen.result && gen.jobId && (
            <>
              <section className="section section--viewer">
                <h2 className="section__title">Interactive 3D Model</h2>
                <Suspense fallback={<ViewerSkeleton />}>
                  <ModelViewer modelUrl={gen.result.glb_url || ''} />
                </Suspense>
              </section>

              <section className="section">
                <DownloadPanel
                  jobId={gen.jobId}
                  result={gen.result}
                  onReset={handleReset}
                />
              </section>
            </>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>Powered by TripoSR (Stability AI) — MIT licensed, self-hosted, no external API calls</span>
      </footer>

      <style>{`
        /* ── Layout ── */
        .app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .app-header {
          border-bottom: 1px solid var(--bg-border);
          background: var(--bg-surface);
        }
        .app-header__inner {
          max-width: 860px;
          margin: 0 auto;
          padding: 20px 24px;
          display: flex;
          align-items: baseline;
          gap: 20px;
          flex-wrap: wrap;
        }
        .app-header__logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .app-header__wordmark {
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .app-header__tagline {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .app-main {
          flex: 1;
          padding: 32px 16px 48px;
        }
        .app-container {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* ── Sections ── */
        .section {}
        .section--viewer {}
        .section__title {
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 12px;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }

        /* ── Generate button ── */
        .generate-row {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn-generate {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent-main);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          padding: 13px 28px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--transition), transform var(--transition);
          animation: pulseGlow 2.5s ease-in-out infinite;
          font-family: var(--font-sans);
        }
        .btn-generate:hover:not(:disabled) {
          background: var(--accent-bright);
          transform: translateY(-1px);
        }
        .btn-generate:disabled {
          animation: none;
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .btn-clear {
          background: transparent;
          border: 1px solid var(--bg-border);
          color: var(--text-secondary);
          border-radius: var(--radius-lg);
          padding: 13px 20px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all var(--transition);
          font-family: var(--font-sans);
        }
        .btn-clear:hover {
          border-color: var(--error);
          color: var(--error);
        }

        /* ── Info note ── */
        .info-note {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          background: rgba(59,130,246,0.07);
          border: 1px solid rgba(59,130,246,0.18);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-top: 12px;
        }
        .info-note svg { flex-shrink: 0; margin-top: 1px; }

        /* ── Error panel ── */
        .error-panel {
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.22);
          border-radius: var(--radius-xl);
          padding: 20px 24px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          animation: fadeIn 300ms ease;
        }
        .error-panel__body { flex: 1; }
        .error-panel__title {
          font-weight: 600;
          color: var(--error);
          margin-bottom: 6px;
          font-size: 0.95rem;
        }
        .error-panel__msg {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .btn-retry {
          background: transparent;
          border: 1px solid rgba(239,68,68,0.35);
          color: var(--error);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-size: 0.85rem;
          cursor: pointer;
          flex-shrink: 0;
          font-family: var(--font-sans);
          transition: all var(--transition);
        }
        .btn-retry:hover { background: rgba(239,68,68,0.1); }

        /* ── Footer ── */
        .app-footer {
          border-top: 1px solid var(--bg-border);
          text-align: center;
          padding: 16px;
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        /* ── Viewer skeleton ── */
        .viewer-skeleton {
          width: 100%;
          height: 520px;
          border-radius: var(--radius-xl);
          background: var(--bg-surface);
          border: 1px solid var(--bg-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          gap: 10px;
        }

        @media (max-width: 600px) {
          .app-header__inner { flex-direction: column; gap: 6px; }
          .generate-row { flex-direction: column; align-items: stretch; }
          .btn-generate, .btn-clear { text-align: center; justify-content: center; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ──
function ViewerSkeleton() {
  return (
    <div className="viewer-skeleton">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="12 40" strokeLinecap="round" />
      </svg>
      Loading 3D model…
    </div>
  )
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#3b82f6" fillOpacity="0.15"/>
      <path d="M14 6L22 10.5V17.5L14 22L6 17.5V10.5L14 6Z" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
      <path d="M14 6v16M6 10.5l8 4 8-4" stroke="#3b82f6" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}

function CubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M8 2v12M2 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="10 28" strokeLinecap="round"/>
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: 'var(--accent-main)' }}>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 5v.5M7.5 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--error)', flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
