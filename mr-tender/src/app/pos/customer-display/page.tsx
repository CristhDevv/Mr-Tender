'use client'
import React, { useState, useEffect } from 'react'
import {
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  Tag,
  DollarSign,
  Building2,
  Clock,
  Heart
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CartItem {
  id?: string
  name: string
  price: number
  quantity: number
  lineTotal: number
  discount?: number
}

interface DisplayState {
  businessName: string
  cart: CartItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod?: string
  receivedAmount?: number
  change?: number
  isDone?: boolean
}

export default function CustomerDisplayPage() {
  const [displayState, setDisplayState] = useState<DisplayState>({
    businessName: 'MR TENDER',
    cart: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    isDone: false
  })
  const [time, setTime] = useState<string>('')

  // Clock updater
  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // BroadcastChannel listener
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load initial from localStorage if available
    const saved = localStorage.getItem('mr_tender_customer_display_state')
    if (saved) {
      try {
        setDisplayState(JSON.parse(saved))
      } catch {}
    }

    const channel = new BroadcastChannel('mr_tender_customer_display')
    channel.onmessage = (event) => {
      if (event.data) {
        setDisplayState(event.data)
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  const hasItems = displayState.cart && displayState.cart.length > 0

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          height: 70,
          background: '#0f172a',
          borderBottom: '2px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.2rem',
              color: '#fff',
              boxShadow: '0 0 15px rgba(37,99,235,0.4)'
            }}
          >
            🏪
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              {displayState.businessName || 'MR TENDER'}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Pantalla de Atención al Cliente
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontSize: '1.1rem', fontWeight: 800 }}>
          <Clock size={20} />
          <span>{time}</span>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: hasItems ? '1.4fr 1fr' : '1fr', height: 'calc(100vh - 70px)' }}>
        
        {/* Left Column: Cart Items List or Welcome Screen */}
        {hasItems ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', borderRight: '2px solid #1e293b', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <ShoppingCart size={18} style={{ color: '#38bdf8' }} />
              <span>Artículos de su Compra ({displayState.cart.length})</span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayState.cart.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#1e293b',
                    borderRadius: 14,
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #334155'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        background: '#0f172a',
                        color: '#38bdf8',
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem'
                      }}
                    >
                      {item.quantity}x
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Unitario: {formatCurrency(item.price)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#22c55e' }}>
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>👋</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.03em' }}>
              ¡Bienvenidos a {displayState.businessName || 'nuestra tienda'}!
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#94a3b8', maxWidth: 500, marginTop: 10 }}>
              Pase sus productos por el mostrador. Con gusto le atenderemos en segundos.
            </p>

            {/* Promo Carousel Banner */}
            <div
              style={{
                marginTop: 40,
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: '2px solid #334155',
                borderRadius: 20,
                padding: '24px 36px',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                maxWidth: 600
              }}
            >
              <Sparkles size={36} style={{ color: '#fbbf24' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  Aproveche hoy en caja
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
                  Precios de Mayoreo y Promociones Especiales en referencias seleccionadas
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Totals, Payment & Change Display */}
        {hasItems && (
          <div style={{ background: '#0b1120', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 14 }}>
                Resumen de su Cuenta
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '1.05rem', borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Subtotal:</span>
                  <strong>{formatCurrency(displayState.subtotal)}</strong>
                </div>
                {displayState.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                    <span>Descuento aplicado:</span>
                    <strong>-{displayState.discount}%</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <span>Impuestos (IVA):</span>
                  <span>Incluido</span>
                </div>
              </div>

              {/* Big TOTAL Box */}
              <div
                style={{
                  marginTop: 24,
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '2px solid #2563eb',
                  borderRadius: 20,
                  padding: 24,
                  textAlign: 'center',
                  boxShadow: '0 0 30px rgba(37,99,235,0.2)'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  TOTAL A PAGAR
                </div>
                <div style={{ fontSize: '3.4rem', fontWeight: 900, color: '#22c55e', letterSpacing: '-0.04em', marginTop: 4 }}>
                  {formatCurrency(displayState.total)}
                </div>
              </div>

              {/* Change / Vueltas display if payment completed */}
              {displayState.receivedAmount && displayState.receivedAmount >= displayState.total && (
                <div
                  style={{
                    marginTop: 18,
                    background: 'rgba(34,197,94,0.1)',
                    border: '2px solid #22c55e',
                    borderRadius: 16,
                    padding: 18,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#86efac', textTransform: 'uppercase' }}>
                    SU CAMBIO / VUELTAS
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#4ade80' }}>
                    {formatCurrency((displayState.receivedAmount || 0) - displayState.total)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: 2 }}>
                    Recibido: {formatCurrency(displayState.receivedAmount)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Heart size={14} style={{ color: '#ef4444' }} />
              <span>Gracias por su preferencia</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
