'use client'
import React, { useState } from 'react'
import {
  Coins,
  Sparkles,
  CheckCircle2,
  X,
  User,
  ArrowRight,
  TrendingUp,
  Gift
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  full_name: string
  phone?: string | null
  wallet_balance?: number
}

interface ElectronicWalletModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer | null
  saleTotal: number
  onApplyWalletPayment: (amountToRedeem: number) => void
}

export default function ElectronicWalletModal({
  isOpen,
  onClose,
  customer,
  saleTotal,
  onApplyWalletPayment
}: ElectronicWalletModalProps) {
  const availableBalance = customer?.wallet_balance || 0
  const maxRedeemable = Math.min(availableBalance, saleTotal)
  const [redeemAmount, setRedeemAmount] = useState<string>(String(maxRedeemable))

  if (!isOpen) return null

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(redeemAmount) || 0
    if (amt <= 0) {
      alert('Por favor ingresa un monto válido de puntos a redimir.')
      return
    }
    if (amt > availableBalance) {
      alert(`El cliente solo cuenta con ${formatCurrency(availableBalance)} en su monedero.`)
      return
    }
    if (amt > saleTotal) {
      alert(`El monto no puede exceder el total de la compra (${formatCurrency(saleTotal)}).`)
      return
    }

    onApplyWalletPayment(amt)
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
          maxWidth: 480,
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
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Coins size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Monedero & Puntos
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {customer ? customer.full_name : 'Selecciona un cliente'}
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

        {!customer ? (
          <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <User size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Debes asignar un cliente al ticket</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>El monedero electrónico y puntos de fidelidad se acumulan por cliente registrado.</p>
          </div>
        ) : (
          <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Balance Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  Saldo Disponible en Monedero
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', letterSpacing: '-0.02em', marginTop: 2 }}>
                  {formatCurrency(availableBalance)}
                </div>
              </div>
              <Gift size={36} style={{ color: '#f59e0b', opacity: 0.8 }} />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Monto de Puntos / Saldo a Redimir ($ COP)
              </label>
              <input
                type="number"
                value={redeemAmount}
                onChange={e => setRedeemAmount(e.target.value)}
                max={maxRedeemable}
                min="100"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  borderRadius: 10,
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-primary, #f8fafc)',
                  color: 'var(--accent-blue, #2563eb)'
                }}
              />
            </div>

            {/* Quick All button */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setRedeemAmount(String(maxRedeemable))}
                className="btn-neu"
                style={{ flex: 1, padding: '8px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Usar Máximo Posible ({formatCurrency(maxRedeemable)})
              </button>
              {maxRedeemable > 5000 && (
                <button
                  type="button"
                  onClick={() => setRedeemAmount('5000')}
                  className="btn-neu"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  $5.000
                </button>
              )}
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 10, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total de la venta:</span> <strong>{formatCurrency(saleTotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)' }}>
                <span>Descuento por monedero:</span> <strong>-{formatCurrency(parseFloat(redeemAmount) || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 4, fontWeight: 800 }}>
                <span>Restante a pagar:</span> <span>{formatCurrency(Math.max(0, saleTotal - (parseFloat(redeemAmount) || 0)))}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} className="btn-neu" style={{ flex: 1, padding: '12px', fontSize: '0.88rem' }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={availableBalance <= 0 || (parseFloat(redeemAmount) || 0) <= 0}
                className="btn-neu btn-primary"
                style={{
                  flex: 2,
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <CheckCircle2 size={16} />
                <span>Aplicar Puntos</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
