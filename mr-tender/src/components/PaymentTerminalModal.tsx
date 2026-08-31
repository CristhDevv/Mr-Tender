'use client'
import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Building2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentTerminalModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  onPaymentApproved: (result: {
    terminal: string
    authCode: string
    cardBrand: string
    lastFour: string
  }) => void
}

const TERMINALS = [
  { id: 'mercadopago', name: 'Mercado Pago Point Smart', provider: 'Mercado Pago Colombia', feePercent: 2.99 },
  { id: 'bold', name: 'Datáfono Bold Smart / Neo', provider: 'Bold.co Colombia', feePercent: 2.85 },
  { id: 'wompi', name: 'Wompi Datafono Bancolombia', provider: 'Wompi / Bancolombia', feePercent: 2.65 }
]

export default function PaymentTerminalModal({
  isOpen,
  onClose,
  amount,
  onPaymentApproved
}: PaymentTerminalModalProps) {
  const [selectedTerminal, setSelectedTerminal] = useState(TERMINALS[0])
  const [status, setStatus] = useState<'connecting' | 'waiting_card' | 'processing' | 'approved' | 'error'>('connecting')
  const [countdown, setCountdown] = useState<number>(45)

  useEffect(() => {
    if (isOpen) {
      setStatus('connecting')
      setCountdown(45)

      // Simulated connection and waiting flow
      const t1 = setTimeout(() => setStatus('waiting_card'), 1200)
      return () => {
        clearTimeout(t1)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || status !== 'waiting_card') return
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, status])

  if (!isOpen) return null

  const handleSimulateCardInsertion = () => {
    setStatus('processing')
    setTimeout(() => {
      setStatus('approved')
      setTimeout(() => {
        onPaymentApproved({
          terminal: selectedTerminal.name,
          authCode: 'APPR-' + Math.floor(100000 + Math.random() * 900000),
          cardBrand: ['Visa', 'Mastercard', 'American Express'][Math.floor(Math.random() * 3)],
          lastFour: String(Math.floor(1000 + Math.random() * 9000))
        })
        onClose()
      }, 1000)
    }, 1500)
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
          maxWidth: 480,
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
          textAlign: 'center'
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
                background: 'linear-gradient(135deg, var(--accent-blue, #2563eb), #60a5fa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <CreditCard size={22} strokeWidth={2.5} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Datáfono / Terminal de Cobro
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {selectedTerminal.name}
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

        {/* Amount to pay */}
        <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: 16, borderRadius: 14, marginBottom: 18 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Monto a Cobrar en Datáfono
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginTop: 2 }}>
            {formatCurrency(amount)}
          </div>
        </div>

        {/* Status Animation Box */}
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            background: status === 'approved' ? 'rgba(22,163,74,0.08)' : 'rgba(37,99,235,0.05)',
            border: `1px solid ${status === 'approved' ? 'rgba(22,163,74,0.3)' : 'rgba(37,99,235,0.2)'}`,
            marginBottom: 18,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}
        >
          {status === 'connecting' && (
            <>
              <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
              <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Conectando con datáfono por Bluetooth/WiFi...</p>
            </>
          )}

          {status === 'waiting_card' && (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--accent-blue)' }}>
                <Wifi size={24} className="animate-pulse" />
                <CreditCard size={36} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
                  Pasa o inserta la tarjeta en el datáfono
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  El valor ya se envió automáticamente a la pantalla del datáfono ({countdown}s)
                </p>
              </div>
              <button
                type="button"
                onClick={handleSimulateCardInsertion}
                className="btn-neu"
                style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: 6 }}
              >
                ⚡ Simular Aprobación Inmediata
              </button>
            </>
          )}

          {status === 'processing' && (
            <>
              <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
              <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Procesando con la red bancaria...</p>
            </>
          )}

          {status === 'approved' && (
            <>
              <CheckCircle2 size={40} style={{ color: 'var(--accent-green)' }} />
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--accent-green)' }}>
                  ¡Pago Aprobado por el Banco!
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Cerrando ticket de venta...
                </p>
              </div>
            </>
          )}
        </div>

        {/* Terminal Switcher */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
          {TERMINALS.map(term => (
            <button
              key={term.id}
              type="button"
              onClick={() => setSelectedTerminal(term)}
              className="btn-neu"
              style={{
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: selectedTerminal.id === term.id ? 'var(--bg-secondary)' : 'transparent',
                border: selectedTerminal.id === term.id ? '1px solid var(--accent-blue)' : '1px solid transparent'
              }}
            >
              {term.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="btn-neu"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
        >
          Cancelar Cobro con Datáfono (Esc)
        </button>
      </div>
    </div>
  )
}
