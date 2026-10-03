/**
 * ImageUploader — drag-and-drop zone for primary + optional multi-angle images
 */
import React, { useState, useRef, useCallback, useId } from 'react'

interface ImageInfo {
  file: File
  preview: string
  width: number
  height: number
}

interface Props {
  onImagesSelected: (primary: ImageInfo, secondary: ImageInfo[]) => void
  disabled?: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 20

const ANGLE_LABELS = ['Front', 'Back', 'Left', 'Right', 'Top']

async function loadImageInfo(file: File): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      const img = new Image()
      img.onload = () => resolve({
        file,
        preview: src,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
      img.onerror = reject
      img.src = src
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ImageUploader({ onImagesSelected, disabled }: Props) {
  const [primary, setPrimary] = useState<ImageInfo | null>(null)
  const [secondary, setSecondary] = useState<ImageInfo[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported format: ${file.type}. Use JPG, PNG, or WEBP.`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  const handlePrimaryFile = useCallback(async (file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) { setError(validationError); return }
    const info = await loadImageInfo(file)
    setPrimary(info)
    onImagesSelected(info, secondary)
  }, [secondary, onImagesSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handlePrimaryFile(file)
  }, [handlePrimaryFile])

  const handleSecondaryFile = useCallback(async (file: File, index: number) => {
    const validationError = validateFile(file)
    if (validationError) { setError(validationError); return }
    const info = await loadImageInfo(file)
    setSecondary(prev => {
      const next = [...prev]
      next[index] = info
      if (primary) onImagesSelected(primary, next.filter(Boolean))
      return next
    })
  }, [primary, onImagesSelected])

  const removePrimary = () => {
    setPrimary(null)
    setSecondary([])
    if (primaryInputRef.current) primaryInputRef.current.value = ''
  }

  return (
    <div className="uploader">
      {!primary ? (
        <div
          className={`drop-zone ${dragging ? 'drop-zone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => primaryInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && primaryInputRef.current?.click()}
          aria-label="Upload photo"
        >
          <input
            ref={primaryInputRef}
            id={`${id}-primary`}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={e => e.target.files?.[0] && handlePrimaryFile(e.target.files[0])}
            disabled={disabled}
          />
          <div className="drop-zone__icon" aria-hidden="true">
            <UploadIcon />
          </div>
          <p className="drop-zone__headline">Drop a photo here</p>
          <p className="drop-zone__sub">or click to browse</p>
          <p className="drop-zone__formats">JPG · PNG · WEBP — up to 20 MB</p>
          <div className="drop-zone__scan" aria-hidden="true" />
        </div>
      ) : (
        <div className="upload-preview" style={{ animation: 'fadeIn 300ms ease' }}>
          <div className="upload-preview__primary">
            <img
              src={primary.preview}
              alt="Uploaded preview"
              className="upload-preview__img"
            />
            <div className="upload-preview__meta">
              <span className="upload-preview__filename">{primary.file.name}</span>
              <span className="upload-preview__dims">
                {primary.width} × {primary.height} px
              </span>
              <span className="upload-preview__size">
                {(primary.file.size / 1024).toFixed(0)} KB
              </span>
              <button
                className="btn-ghost btn-sm"
                onClick={removePrimary}
                disabled={disabled}
              >
                Replace photo
              </button>
            </div>
          </div>

          {/* Optional multi-angle images */}
          <details className="multi-angle">
            <summary className="multi-angle__toggle">
              Add more angles
              <span className="multi-angle__badge">optional</span>
            </summary>
            <p className="multi-angle__note">
              TripoSR uses only the primary image. Additional angles may be
              supported by future models (InstantMesh, Zero123++).
            </p>
            <div className="multi-angle__grid">
              {ANGLE_LABELS.map((label, i) => (
                <SecondarySlot
                  key={label}
                  label={label}
                  image={secondary[i] ?? null}
                  disabled={!!disabled}
                  onFile={f => handleSecondaryFile(f, i)}
                  onRemove={() => {
                    setSecondary(prev => {
                      const next = [...prev]
                      next[i] = undefined as unknown as ImageInfo
                      return next
                    })
                  }}
                />
              ))}
            </div>
          </details>
        </div>
      )}

      {error && (
        <p className="upload-error" role="alert">{error}</p>
      )}

      <style>{`
        .uploader { width: 100%; }

        .drop-zone {
          position: relative;
          overflow: hidden;
          border: 1.5px dashed var(--bg-border);
          border-radius: var(--radius-xl);
          padding: 64px 32px;
          text-align: center;
          cursor: pointer;
          transition: border-color var(--transition), background var(--transition);
          background: var(--bg-surface);
        }
        .drop-zone:hover, .drop-zone--active {
          border-color: var(--accent-main);
          background: var(--accent-pulse);
        }
        .drop-zone__scan {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent-main), transparent);
          opacity: 0;
          animation: scanline 2.5s linear infinite;
        }
        .drop-zone:hover .drop-zone__scan,
        .drop-zone--active .drop-zone__scan { opacity: 0.6; }

        .drop-zone__icon { color: var(--accent-main); margin-bottom: 16px; }
        .drop-zone__headline {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .drop-zone__sub { color: var(--text-secondary); font-size: 0.9rem; }
        .drop-zone__formats {
          margin-top: 12px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        /* ── Preview ── */
        .upload-preview {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .upload-preview__primary {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          background: var(--bg-surface);
          border: 1px solid var(--bg-border);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .upload-preview__img {
          width: 120px;
          height: 120px;
          object-fit: contain;
          border-radius: var(--radius-md);
          background: var(--bg-elevated);
          flex-shrink: 0;
        }
        .upload-preview__meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .upload-preview__filename {
          font-weight: 600;
          font-size: 0.95rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 280px;
        }
        .upload-preview__dims,
        .upload-preview__size {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        /* ── Multi-angle ── */
        .multi-angle {
          background: var(--bg-surface);
          border: 1px solid var(--bg-border);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
        }
        .multi-angle__toggle {
          cursor: pointer;
          font-weight: 500;
          color: var(--text-secondary);
          font-size: 0.9rem;
          list-style: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .multi-angle__toggle::-webkit-details-marker { display: none; }
        .multi-angle__badge {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          background: var(--bg-elevated);
          border: 1px solid var(--bg-border);
          border-radius: 100px;
          padding: 1px 7px;
          color: var(--text-muted);
        }
        .multi-angle__note {
          margin-top: 10px;
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
          border-left: 2px solid var(--warning);
          padding-left: 10px;
          margin-bottom: 12px;
        }
        .multi-angle__grid {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .upload-error {
          margin-top: 10px;
          color: var(--error);
          font-size: 0.87rem;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: var(--radius-md);
          padding: 8px 12px;
        }

        /* ── Shared button styles ── */
        .btn-ghost {
          background: transparent;
          border: 1px solid var(--bg-border);
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          padding: 6px 14px;
          font-size: 0.85rem;
          transition: background var(--transition), color var(--transition);
          margin-top: 6px;
          align-self: flex-start;
        }
        .btn-ghost:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-sm { padding: 4px 10px; font-size: 0.78rem; }
      `}</style>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="30" width="36" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M24 6v22M16 14l8-8 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="38" cy="36" r="2" fill="currentColor" />
    </svg>
  )
}

interface SlotProps {
  label: string
  image: ImageInfo | null
  disabled: boolean
  onFile: (f: File) => void
  onRemove: () => void
}

function SecondarySlot({ label, image, disabled, onFile, onRemove }: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="sec-slot" onClick={() => !image && inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="sr-only"
        disabled={disabled}
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {image ? (
        <>
          <img src={image.preview} alt={label} className="sec-slot__img" />
          <button
            className="sec-slot__remove"
            onClick={e => { e.stopPropagation(); onRemove() }}
            title="Remove"
          >×</button>
        </>
      ) : (
        <span className="sec-slot__plus">+</span>
      )}
      <span className="sec-slot__label">{label}</span>
      <style>{`
        .sec-slot {
          position: relative;
          width: 72px;
          height: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 1.5px dashed var(--bg-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: border-color var(--transition), background var(--transition);
          background: var(--bg-elevated);
          overflow: hidden;
        }
        .sec-slot:hover { border-color: var(--accent-main); background: var(--accent-pulse); }
        .sec-slot__img { width: 100%; height: 58px; object-fit: cover; }
        .sec-slot__plus { font-size: 1.5rem; color: var(--text-muted); }
        .sec-slot__label {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          position: absolute;
          bottom: 3px;
        }
        .sec-slot__remove {
          position: absolute;
          top: 2px; right: 4px;
          background: rgba(0,0,0,0.6);
          color: white;
          border-radius: 50%;
          width: 18px; height: 18px;
          font-size: 13px;
          line-height: 18px;
          text-align: center;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
