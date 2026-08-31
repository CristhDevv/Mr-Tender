'use client'
import React, { useState, useEffect, useRef } from 'react'
import {
  Scale,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  Usb
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id?: string
  name: string
  price: number
  unit_type?: string
}

interface ScaleHardwareModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onConfirmWeight: (weight: number) => void
}

export default function ScaleHardwareModal({
  isOpen,
  onClose,
  product,
  onConfirmWeight
}: ScaleHardwareModalProps) {
  const [weightKg, setWeightKg] = useState<number>(0.5)
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false)
  const [serialSupported, setSerialSupported] = useState<boolean>(false)
  const [readingStatus, setReadingStatus] = useState<string>('Esperando peso en báscula...')
  const [tareValue, setTareValue] = useState<number>(0)
  const portRef = useRef<any>(null)
  const readerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSerialSupported('serial' in navigator)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setWeightKg(0.5)
      setTareValue(0)
    }
  }, [isOpen])

  if (!isOpen || !product) return null

  const handleConnectSerial = async () => {
    if (!('serial' in navigator)) {
      alert('Tu navegador actual no soporta Web Serial API (Recomendado: Google Chrome o Microsoft Edge).')
      return
    }

    try {
      const navSerial = (navigator as any).serial
      const port = await navSerial.requestPort()
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
      portRef.current = port
      setIsSerialConnected(true)
      setReadingStatus('Báscula conectada. Leyendo puerto COM...')

      const textDecoder = new TextDecoderStream()
      port.readable.pipeTo(textDecoder.writable)
      const reader = textDecoder.readable.getReader()
      readerRef.current = reader

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          // Parse scale string (e.g. "ST,GS,+  0.750kg" or "WN0.750kg")
          const match = value.match(/([0-9]+\.[0-9]+)/)
          if (match && match[1]) {
            const parsed = parseFloat(match[1])
            if (!isNaN(parsed) && parsed >= 0) {
              setWeightKg(parsed)
              setReadingStatus('Peso estable detectado en báscula')
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error connecting to scale:', err)
      setReadingStatus('Error de comunicación serial: ' + (err.message || 'Desconectado'))
      setIsSerialConnected(false)
    }
  }

  const handleTare = () => {
    setTareValue(weightKg)
  }

  const effectiveWeight = Math.max(0, parseFloat((weightKg - tareValue).toFixed(3)))
  const linePrice = effectiveWeight * (product.price || 0)

  const handleConfirm = () => {
    onConfirmWeight(effectiveWeight)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.1))'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Scale size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Balanza / Báscula Digital
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {product.name} ({formatCurrency(product.price)} / kg)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Big Scale Display */}
        <div
          style={{
            background: '#0f172a',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
            color: '#38bdf8',
            fontFamily: 'monospace',
            marginBottom: 16,
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
            border: '2px solid #1e293b'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            PESO NETO (KG)
          </div>
          <div style={{ fontSize: '3.4rem', fontWeight: 900, letterSpacing: '0.05em', color: '#22c55e', textShadow: '0 0 20px rgba(34,197,94,0.4)' }}>
            {effectiveWeight.toFixed(3)} <span style={{ fontSize: '1.4rem', color: '#86efac' }}>kg</span>
          </div>
          <div style={{ fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700, marginTop: 8 }}>
            Total a Cobrar: <strong style={{ color: '#38bdf8' }}>{formatCurrency(linePrice)}</strong>
          </div>
        </div>

        {/* Serial Hardware Link Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isSerialConnected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            <Usb size={16} />
            <span>{isSerialConnected ? 'Báscula USB/Serial conectada' : serialSupported ? 'Báscula no enlazada por cable' : 'Navegador sin Web Serial'}</span>
          </div>

          {serialSupported && !isSerialConnected && (
            <button
              onClick={handleConnectSerial}
              className="btn-neu"
              style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Zap size={13} />
              <span>Conectar Báscula COM</span>
            </button>
          )}

          {isSerialConnected && (
            <button
              onClick={handleTare}
              className="btn-neu"
              style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Tarar (Poner a 0)
            </button>
          )}
        </div>

        {/* Quick Manual / Adjust Dial */}
        <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: 14, borderRadius: 12, marginBottom: 18 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Ajuste Rápido de Peso Manual (Kg o Gramos)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 5.0].map(w => (
              <button
                key={w}
                type="button"
                onClick={() => { setWeightKg(w); setTareValue(0); }}
                className="btn-neu"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: weightKg === w ? 'var(--accent-blue, #2563eb)' : 'var(--bg-card, #ffffff)',
                  color: weightKg === w ? '#fff' : 'var(--text-primary)'
                }}
              >
                {w >= 1 ? `${w} kg` : `${w * 1000} g`}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O digita peso exacto:</label>
            <input
              type="number"
              step="0.005"
              min="0.001"
              value={weightKg}
              onChange={e => { setWeightKg(parseFloat(e.target.value) || 0); setTareValue(0); }}
              style={{
                width: 100,
                padding: '6px 10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary)'
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>kg</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-neu" style={{ flex: 1, padding: '12px', fontSize: '0.88rem' }}>
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="btn-neu btn-primary"
            style={{
              flex: 2,
              padding: '12px 18px',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 12
            }}
          >
            <CheckCircle2 size={18} />
            <span>Confirmar {effectiveWeight} kg ({formatCurrency(linePrice)})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
