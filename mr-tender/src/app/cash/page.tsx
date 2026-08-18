'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Building,
  Clock
} from 'lucide-react'

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

  // Close modal state (Blind Closure)
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [closeReport, setCloseReport] = useState<{ expected: number; counted: number; diff: number } | null>(null)

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
      const { error } = await supabase.rpc('open_cash_session', {
        p_opening_amount: parseFloat(openingAmount) || 0
      })
      if (error) throw error
      setCloseReport(null)
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
    if (!closingAmount) return
    setSubmitting(true)

    const counted = parseFloat(closingAmount) || 0
    const diff = counted - expected

    try {
      const { error } = await supabase.rpc('close_cash_session', {
        p_closing_amount: counted,
        p_notes: closingNotes
      })
      if (error) throw error

      setCloseReport({ expected, counted, diff })
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
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando caja...</div>
      </div>
    )
  }

  const totalSales = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + Number(m.amount), 0)
  const totalExpenses = movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'withdrawal').reduce((s, m) => s + Number(m.amount), 0)
  const totalIncome = movements.filter(m => m.movement_type === 'income' || m.movement_type === 'deposit').reduce((s, m) => s + Number(m.amount), 0)
  const opening = session ? Number(session.opening_amount) : 0
  const expected = opening + totalSales + totalIncome - totalExpenses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Caja y Turnos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
            {session ? `Turno abierto desde las ${new Date(session.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Caja cerrada'}
          </p>
        </div>
        
        {session ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { setMovType('income'); setModal('movement') }} className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={14} strokeWidth={2.5} style={{ color: 'var(--accent-blue)' }} />
              <span>Ingreso</span>
            </button>
            <button onClick={() => { setMovType('expense'); setModal('movement') }} className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Minus size={14} strokeWidth={2.5} />
              <span>Egreso</span>
            </button>
            <button onClick={() => { setClosingAmount(''); setModal('close') }} className="btn-neu btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} strokeWidth={2} />
              <span>Arqueo Ciego</span>
            </button>
          </div>
        ) : (
          <button onClick={() => setModal('open')} className="btn-neu btn-primary" style={{ padding: '9px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Unlock size={15} strokeWidth={2} />
            <span>Abrir turno de caja</span>
          </button>
        )}
      </div>

      {error && (
        <div className="neu-card" style={{ padding: 12, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.82rem' }}>{error}</p>
        </div>
      )}

      {/* Report Banner after Blind Closure */}
      {closeReport && !session && (
        <div className="neu-card animate-scale-in" style={{ padding: 18, background: closeReport.diff === 0 ? 'var(--accent-green-lt)' : closeReport.diff > 0 ? 'var(--accent-blue-lt)' : 'var(--accent-coral-lt)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <CheckCircle2 size={24} strokeWidth={2} style={{ color: closeReport.diff === 0 ? 'var(--accent-green)' : closeReport.diff > 0 ? 'var(--accent-blue)' : 'var(--accent-coral)', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                {closeReport.diff === 0 ? '¡Arqueo Perfecto! Cuadre de Caja Exacto' : closeReport.diff > 0 ? 'Sobrante Registrado en el Arqueo' : 'Faltante Registrado en el Arqueo'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Resultados del cierre ciego de turno
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginTop: 10 }}>
            <div className="neu-flat" style={{ padding: '8px 10px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Contado Físico</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatCurrency(closeReport.counted)}</div>
            </div>
            <div className="neu-flat" style={{ padding: '8px 10px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Esperado Sistema</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatCurrency(closeReport.expected)}</div>
            </div>
            <div className="neu-flat" style={{ padding: '8px 10px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Diferencia</span>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: closeReport.diff === 0 ? 'var(--accent-green)' : closeReport.diff > 0 ? 'var(--accent-blue)' : 'var(--accent-coral)' }}>
                {closeReport.diff > 0 ? `+${formatCurrency(closeReport.diff)}` : formatCurrency(closeReport.diff)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Session Content */}
      {session && (
        <>
          {/* Monochromatic Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: 'Fondo inicial', value: formatCurrency(opening), Icon: DollarSign, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
              { label: 'Ventas efectivo', value: formatCurrency(totalSales), Icon: ShoppingCart, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
              { label: 'Ingresos manuales', value: formatCurrency(totalIncome), Icon: ArrowDownLeft, color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
              { label: 'Egresos / Gastos', value: formatCurrency(totalExpenses), Icon: ArrowUpRight, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
              { label: 'Efectivo esperado', value: formatCurrency(expected), Icon: Building, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
            ].map(s => {
              const StatIcon = s.Icon
              return (
                <div key={s.label} className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="kpi-icon-wrap" style={{ background: s.bg, width: 32, height: 32, flexShrink: 0 }}>
                    <StatIcon size={16} strokeWidth={2} style={{ color: s.color }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Movements List (Responsive card list, no horizontal scroll) */}
          <div className="neu-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--bg-deep)', paddingBottom: 6 }}>
              Movimientos del Turno ({movements.length})
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {movements.map(m => {
                const isPositive = m.movement_type === 'sale' || m.movement_type === 'income' || m.movement_type === 'deposit' || m.movement_type === 'opening'
                return (
                  <div key={m.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.description || (m.movement_type === 'sale' ? 'Venta POS' : m.movement_type === 'opening' ? 'Apertura' : 'Movimiento')}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <Clock size={11} />
                        <span>{new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isPositive ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                        {isPositive ? `+${formatCurrency(m.amount)}` : `-${formatCurrency(m.amount)}`}
                      </div>
                    </div>
                  </div>
                )
              })}

              {movements.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Sin movimientos registrados en este turno
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal: Open Session */}
      {modal === 'open' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleOpenSession} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 360, padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Apertura de Turno</h2>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fondo Inicial de Caja $</label>
              <input className="input-neu" type="number" step="1000" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} required autoFocus style={{ fontSize: '1.1rem', fontWeight: 800 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setModal(null)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ flex: 1, padding: 10 }}>
                {submitting ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Movement */}
      {modal === 'movement' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleAddMovement} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 360, padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
              {movType === 'income' ? 'Registrar Ingreso de Caja' : 'Registrar Egreso / Gasto'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Monto $</label>
                <input className="input-neu" type="number" step="100" placeholder="0" value={movAmount} onChange={e => setMovAmount(e.target.value)} required autoFocus style={{ fontSize: '1.1rem', fontWeight: 800 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Concepto / Motivo</label>
                <input className="input-neu" placeholder="Ej: Pago de transporte / Cambio" value={movDesc} onChange={e => setMovDesc(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setModal(null)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ flex: 1, padding: 10 }}>
                {submitting ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Close Session (Blind Arqueo) */}
      {modal === 'close' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCloseSession} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 360, padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Arqueo de Caja Ciego</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Cuenta físicamente el efectivo en el cajón e ingresa el total:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Total Contado Físico $ *</label>
                <input className="input-neu" type="number" step="100" placeholder="0" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} required autoFocus style={{ fontSize: '1.2rem', fontWeight: 900 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas u observaciones</label>
                <input className="input-neu" placeholder="Opcional..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setModal(null)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-danger" disabled={submitting || !closingAmount} style={{ flex: 1, padding: 10 }}>
                {submitting ? 'Cerrando...' : 'Cerrar Turno'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
