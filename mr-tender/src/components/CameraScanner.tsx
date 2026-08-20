'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export interface ScannedProductFeedback {
  name: string
  price?: number
  sku?: string
  isExpress?: boolean
}

interface CameraScannerProps {
  onScan: (code: string) => ScannedProductFeedback | void | Promise<ScannedProductFeedback | void>
  onClose: () => void
  continuous?: boolean
}

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1100, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {}
}

export default function CameraScanner({ onScan, onClose, continuous = true }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [flashSuccess, setFlashSuccess] = useState(false)
  const [noCodeDetected, setNoCodeDetected] = useState(false)
  const [lastProduct, setLastProduct] = useState<ScannedProductFeedback | null>(null)
  const [scanCount, setScanCount] = useState(0)

  const detectorRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function startCamera() {
      try {
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          detectorRef.current = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code', 'code_39']
          })
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err: any) {
        console.error('Camera access error:', err)
        setError('No se pudo acceder a la cámara. Revisa los permisos o ingresa el código manualmente.')
      }
    }

    startCamera()

    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Process code detection and feedback
  const processCode = useCallback(async (code: string) => {
    const clean = code.trim()
    if (!clean) return

    // 1. Play audio beep & vibration
    playScanBeep()
    if ('vibrate' in navigator) {
      try { navigator.vibrate([90, 40, 90]) } catch {}
    }

    // 2. Trigger green flash animation
    setFlashSuccess(true)
    setNoCodeDetected(false)
    setTimeout(() => setFlashSuccess(false), 900)

    // 3. Handle scan callback
    const result = await onScan(clean)
    setScanCount(prev => prev + 1)

    // 4. Show product confirmation banner
    const feedback: ScannedProductFeedback = result || {
      name: `Código: ${clean}`,
      sku: clean
    }
    setLastProduct(feedback)

    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = setTimeout(() => {
      setLastProduct(null)
    }, 3500)

    // 5. If not continuous, close modal
    if (!continuous) {
      setTimeout(() => {
        onClose()
      }, 500)
    }
  }, [onScan, onClose, continuous])

  // Trigger scan when user presses the scan button or taps target
  async function handleTriggerScan() {
    if (isProcessing) return
    setIsProcessing(true)
    setNoCodeDetected(false)

    try {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        let detected = false

        // Try BarcodeDetector first
        if (detectorRef.current) {
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue
              if (code) {
                detected = true
                await processCode(code)
              }
            }
          } catch (e) {
            console.warn('BarcodeDetector error:', e)
          }
        }

        if (!detected) {
          // If no code detected in frame
          setNoCodeDetected(true)
          setTimeout(() => setNoCodeDetected(false), 3000)
        }
      }
    } catch (e) {
      console.error('Trigger scan error:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    processCode(manualCode.trim())
    setManualCode('')
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.88)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
      backdropFilter: 'blur(4px)'
    }}>
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#1E293B',
          color: '#fff',
          padding: '20px 18px',
          borderRadius: 24,
          textAlign: 'center',
          position: 'relative',
          border: flashSuccess ? '2px solid #22C55E' : '1px solid #334155',
          boxShadow: flashSuccess ? '0 0 30px rgba(34, 197, 94, 0.4)' : '0 10px 40px rgba(0,0,0,0.6)',
          transition: 'border 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F8FAFC' }}>
              📷 Escáner de Código
            </span>
            {scanCount > 0 && (
              <span style={{
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ADE80',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                border: '1px solid rgba(34, 197, 94, 0.4)'
              }}>
                {scanCount} {scanCount === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-neu"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              background: '#334155',
              color: '#F1F5F9',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer'
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Video Frame */}
        {!error ? (
          <div
            onClick={handleTriggerScan}
            style={{
              position: 'relative',
              width: '100%',
              height: 270,
              background: '#0F172A',
              borderRadius: 16,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Target Box Overlay */}
            <div
              style={{
                position: 'absolute',
                width: '80%',
                height: 150,
                border: flashSuccess
                  ? '3px solid #22C55E'
                  : '2px dashed #38BDF8',
                borderRadius: 14,
                boxShadow: flashSuccess
                  ? '0 0 25px rgba(34, 197, 94, 0.8), 0 0 0 9999px rgba(0,0,0,0.5)'
                  : '0 0 0 9999px rgba(0,0,0,0.45)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Laser Line */}
              <div
                style={{
                  width: '92%',
                  height: 2,
                  background: flashSuccess ? '#22C55E' : '#EF4444',
                  boxShadow: flashSuccess
                    ? '0 0 12px #22C55E'
                    : '0 0 8px rgba(239, 68, 68, 0.7)',
                  opacity: 0.85
                }}
              />
            </div>

            {/* Success Notification Banner (Overlay inside video) */}
            {lastProduct && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  right: 12,
                  background: 'rgba(16, 185, 129, 0.95)',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 12,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animation: 'fadeIn 0.25s ease',
                  zIndex: 20
                }}
              >
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    ✅ {lastProduct.name}
                  </div>
                  {lastProduct.price !== undefined && lastProduct.price > 0 && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: 1 }}>
                      ${Number(lastProduct.price).toLocaleString('es-CO')}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.25)', padding: '3px 8px', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Agregado
                </span>
              </div>
            )}

            {/* No Code Detected Notice */}
            {noCodeDetected && !lastProduct && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 16,
                  right: 16,
                  background: 'rgba(239, 68, 68, 0.92)',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 20
                }}
              >
                ⚠️ No se detectó código. Centra bien el código de barras y presiona Escanear.
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '20px 14px', background: '#334155', borderRadius: 12, color: '#FCA5A5', fontSize: '0.85rem', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '10px 0 12px' }}>
          Centra el código de barras en el recuadro y presiona el botón:
        </p>

        {/* Action Button: Trigger Scan */}
        <button
          type="button"
          onClick={handleTriggerScan}
          disabled={isProcessing || !!error}
          style={{
            width: '100%',
            padding: '13px 20px',
            fontSize: '0.95rem',
            fontWeight: 800,
            color: '#FFFFFF',
            background: flashSuccess ? '#22C55E' : 'linear-gradient(135deg, #2563EB, #3B82F6)',
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            transform: isProcessing ? 'scale(0.98)' : 'none'
          }}
        >
          {isProcessing ? '⏳ Leyendo código...' : '📸 Escanear / Capturar Código'}
        </button>

        {/* Manual Input Fallback */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            className="input-neu"
            placeholder="O escribe el código (ej: 7702001001018)"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            style={{
              flex: 1,
              background: '#0F172A',
              color: '#fff',
              fontSize: '0.82rem',
              border: '1px solid #334155',
              padding: '8px 12px',
              borderRadius: 10
            }}
          />
          <button
            type="submit"
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            Usar
          </button>
        </form>

        {/* Footer Done / Continuous Scan indicator */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Escaneo continuo activo
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              color: '#94A3B8',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            Listo / Terminar
          </button>
        </div>
      </div>
    </div>
  )
}
