'use client'
import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface DBCashSession {
  id: string
  status: string
  opening_amount: number
  closing_amount: number | null
  expected_amount: number | null
  difference_amount: number | null
  total_sales: number
  total_expenses: number
  total_income: number
  opened_at: string
  closed_at: string | null
}

interface DBCashMovement {
  id: string
  movement_type: string
  amount: number
  description: string
  created_at: string
}

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%',
  maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16,
  boxShadow: 'var(--neu-card)',
}

export default function CashPage() {
  const supabase = createClient()
  const [session, setSession] = useState<DBCashSession | null>(null)
  const [movements, setMovements] = useState<DBCashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Modals
  const [modal, setModal] = useState<'open' | 'movement' | 'close' | null>(null)
  const [openingAmount, setOpeningAmount] = useState('50000')

  // Movement modal state
  const [movType, setMovType] = useState<'income' | 'expense'>('income')
  const [movAmount, setMovAmount] = useState('')
  const [movDesc, setMovDesc] = useState('')

  // Close modal state
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNotes, setClosingNotes] = useState('')

  useEffect(() => {
    loadCashData()
  }, [])

  async function loadCashData() {
    try {
      setLoading(true)
      setError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tenant_id = user.user_metadata?.tenant_id

      // Load active open session
      const { data: sessions, error: sessErr } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)

      if (sessErr) throw sessErr

      if (sessions && sessions.length > 0) {
        const currentSession = sessions[0]
        setSession(currentSession as any)

        // Load movements
        const { data: movs, error: movsErr } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('session_id', currentSession.id)
          .order('created_at', { ascending: false })

        if (movsErr) throw movsErr
        if (movs) setMovements(movs as any)
      } else {
        setSession(null)
        setMovements([])
      }
    } catch (err: any) {
      console.error(err)
      setError('Error al cargar datos de caja: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenSession(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('open_cash_session', {
        p_opening_amount: parseFloat(openingAmount) || 0
      })
      if (error) throw error
      await loadCashData()
      setModal(null)
    } catch (err: any) {
      alert('Error al abrir caja: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!movAmount || parseFloat(movAmount) <= 0) return
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('add_cash_movement', {
        p_movement_type: movType,
        p_amount: parseFloat(movAmount),
        p_description: movDesc || (movType === 'income' ? 'Ingreso manual' : 'Egreso manual')
      })
      if (error) throw error
      await loadCashData()
      setModal(null)
      setMovAmount(''); setMovDesc('')
    } catch (err: any) {
      alert('Error al registrar movimiento: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCloseSession(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('close_cash_session', {
        p_closing_amount: parseFloat(closingAmount) || 0,
        p_notes: closingNotes
      })
      if (error) throw error
      await loadCashData()
      setModal(null)
      setClosingAmount(''); setClosingNotes('')
    } catch (err: any) {
      alert('Error al cerrar caja: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando caja...</div>
      </div>
    )
  }

  const totalSales = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + Number(m.amount), 0)
  const totalExpenses = movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'withdrawal').reduce((s, m) => s + Number(m.amount), 0)
  const totalIncome = movements.filter(m => m.movement_type === 'income' || m.movement_type === 'deposit').reduce((s, m) => s + Number(m.amount), 0)
  const opening = session ? Number(session.opening_amount) : 0
  const expected = opening + totalSales + totalIncome - totalExpenses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Caja y Turnos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {session ? `Turno abierto desde las ${new Date(session.opened_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Caja cerrada'}
          </p>
        </div>
        {session ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => { setMovType('income'); setModal('movement') }} className="btn-neu" style={{ padding: '9px 16px', fontSize: '0.82rem' }}>
              + Ingreso
            </button>
            <button onClick={() => { setMovType('expense'); setModal('movement') }} className="btn-neu" style={{ padding: '9px 16px', fontSize: '0.82rem', color: 'var(--accent-coral)' }}>
              − Egreso
            </button>
            <button onClick={() => { setClosingAmount(expected.toString()); setModal('close') }} className="btn-neu btn-danger" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              🔒 Cerrar turno
            </button>
          </div>
        ) : (
          <button onClick={() => setModal('open')} className="btn-neu btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
            🔓 Abrir turno de caja
          </button>
        )}
      </div>

      {error && (
        <div className="neu-card" style={{ padding: 16, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.85rem' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Active Session Content */}
      {session && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            {[
              { label: 'Fondo inicial', value: formatCurrency(opening), icon: '💰', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
              { label: 'Ventas en efectivo', value: formatCurrency(totalSales), icon: '🛒', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
              { label: 'Ingresos manuales', value: formatCurrency(totalIncome), icon: '📥', color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
              { label: 'Egresos / Gastos', value: formatCurrency(totalExpenses), icon: '📤', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
              { label: 'Efectivo esperado', value: formatCurrency(expected), icon: '🏦', color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
            ].map(s => (
              <div key={s.label} className="neu-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="kpi-icon-wrap" style={{ background: s.bg, width: 38, height: 38, flexShrink: 0 }}>
                  <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Movement Table */}
          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-deep)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Movimientos del Turno ({movements.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 600 }}>Hora</th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 600 }}>Descripción</th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 600 }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const isPositive = m.movement_type === 'sale' || m.movement_type === 'income' || m.movement_type === 'deposit' || m.movement_type === 'opening'
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(m.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.description}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className={`badge ${isPositive ? 'badge-green' : 'badge-coral'}`} style={{ textTransform: 'capitalize' }}>
                          {m.movement_type === 'opening' ? 'Apertura' : m.movement_type === 'sale' ? 'Venta' : m.movement_type === 'income' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 800, color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
                        {isPositive ? '+' : '-'}{formatCurrency(Math.abs(Number(m.amount)))}
                      </td>
                    </tr>
                  )
                })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No hay movimientos registrados en este turno
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Closed State Banner */}
      {!session && (
        <div className="neu-card" style={{ padding: '50px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '3.5rem' }}>💰</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.3rem', margin: 0 }}>El turno de caja está cerrado</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 400, margin: 0 }}>
            Abre un turno de caja especificando el fondo inicial en efectivo para comenzar a registrar ventas e ingresos en el POS.
          </p>
          <button onClick={() => setModal('open')} className="btn-neu btn-primary" style={{ padding: '12px 32px', fontSize: '0.9rem', marginTop: 8 }}>
            🔓 Abrir turno de caja ahora
          </button>
        </div>
      )}

      {/* Modal: Open Session */}
      {modal === 'open' && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <form onSubmit={handleOpenSession} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🔓 Abrir Turno de Caja</h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Fondo Inicial en Efectivo ($) *
              </label>
              <input type="number" className="input-neu" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} required min="0" step="1000" placeholder="50000" style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }} />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Ingresa el saldo base disponible en la caja física al inicio del turno.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setModal(null)} className="btn-neu btn-ghost" style={{ padding: '10px 18px' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ padding: '10px 24px' }}>
                {submitting ? 'Abriendo...' : 'Abrir Turno'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Movement */}
      {modal === 'movement' && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <form onSubmit={handleAddMovement} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {movType === 'income' ? '📥 Registrar Ingreso de Efectivo' : '📤 Registrar Egreso / Gasto'}
              </h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Monto ($) *</label>
                <input type="number" className="input-neu" value={movAmount} onChange={e => setMovAmount(e.target.value)} required min="1" step="500" placeholder="10000" style={{ width: '100%', fontSize: '1.05rem', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Concepto / Descripción</label>
                <input type="text" className="input-neu" value={movDesc} onChange={e => setMovDesc(e.target.value)} placeholder={movType === 'income' ? 'Base adicional, devuelto...' : 'Pago a proveedor, compra insumos...'} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setModal(null)} className="btn-neu btn-ghost" style={{ padding: '10px 18px' }}>Cancelar</button>
              <button type="submit" className={movType === 'income' ? 'btn-neu btn-primary' : 'btn-neu btn-danger'} disabled={submitting} style={{ padding: '10px 24px' }}>
                {submitting ? 'Guardando...' : movType === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Close Session */}
      {modal === 'close' && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <form onSubmit={handleCloseSession} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-coral)', margin: 0 }}>🔒 Arqueo y Cierre de Caja</h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fondo inicial:</span><strong>{formatCurrency(opening)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ventas + Ingresos:</span><strong style={{ color: 'var(--accent-emerald)' }}>+{formatCurrency(totalSales + totalIncome)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Egresos:</span><strong style={{ color: 'var(--accent-coral)' }}>-{formatCurrency(totalExpenses)}</strong></div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800 }}><span>Efectivo esperado:</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(expected)}</span></div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Efectivo Real Contado en Caja ($) *
              </label>
              <input type="number" className="input-neu" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} required min="0" placeholder={expected.toString()} style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Notas de cierre / Observaciones</label>
              <input type="text" className="input-neu" value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Sin novedades en el arqueo" style={{ width: '100%' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setModal(null)} className="btn-neu btn-ghost" style={{ padding: '10px 18px' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-danger" disabled={submitting} style={{ padding: '10px 24px' }}>
                {submitting ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
