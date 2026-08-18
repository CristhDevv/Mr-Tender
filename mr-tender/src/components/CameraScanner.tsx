'use client'
import { useEffect, useRef, useState } from 'react'

interface CameraScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null
    let animationFrameId: number
    let barcodeDetector: any = null

    async function startCamera() {
      try {
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          barcodeDetector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
          })
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        scanFrame()
      } catch (err: any) {
        console.error('Camera access error:', err)
        setError('No se pudo acceder a la cámara. Revisa los permisos o ingresa el código manualmente.')
      }
    }

    async function scanFrame() {
      if (!scanning) return
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current)
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue
              if (code) {
                if ('vibrate' in navigator) navigator.vibrate([100, 50, 100])
                onScan(code)
                onClose()
                return
              }
            }
          } catch (e) {
            // Frame detection error, ignore and retry next frame
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame)
    }

    startCamera()

    return () => {
      setScanning(false)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
  }, [onScan, onClose, scanning])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    onScan(manualCode.trim())
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 460, background: '#1E293B', color: '#fff', padding: '24px 20px', borderRadius: 20, textAlign: 'center', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            📷 Escáner de Código
          </span>
          <button className="btn-neu" onClick={onClose} style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#334155', color: '#fff', border: 'none' }}>
            ✕ Cerrar
          </button>
        </div>

        {/* Video Frame */}
        {!error ? (
          <div style={{ position: 'relative', width: '100%', height: 260, background: '#0F172A', borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* Target Box Overlay */}
            <div style={{ position: 'absolute', width: '75%', height: 140, border: '2px dashed #38BDF8', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: 2, background: '#EF4444', opacity: 0.8, animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 14px', background: '#334155', borderRadius: 12, color: '#FCA5A5', fontSize: '0.85rem', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '14px 0 16px' }}>
          Apunta la cámara al código de barras EAN/UPC de tu producto
        </p>

        {/* Manual Input Fallback */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            className="input-neu"
            placeholder="O escribe el código (ej: 7702001001018)"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            style={{ flex: 1, background: '#0F172A', color: '#fff', fontSize: '0.85rem', border: '1px solid #334155' }}
          />
          <button type="submit" className="btn-neu btn-primary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
            Usar
          </button>
        </form>
      </div>
    </div>
  )
}
