'use client'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { roundCurrency } from '@/lib/finance-math'
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
  Clock,
  Send,
  History,
  Calculator,
  Search,
  FileText,
  TrendingUp,
  Receipt,
  X,
  Eye,
  Calendar,
  Check,
  RotateCcw
} from 'lucide-react'

interface DBCashSession {
  id: string
  status: string
  opening_amount: number
  closing_amount: number | null
  expected_amount: number | null
  difference_amount: number | null
  total_sales: number
  total_cash_sales: number
  total_card_sales: number
  total_transfer_sales: number
  total_expenses: number
  total_income: number
  notes?: string
  closing_notes?: string
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

const DENOMINATIONS = [
  { value: 100000, label: '$100.000', type: 'bill' },
  { value: 50000, label: '$50.000', type: 'bill' },
  { value: 20000, label: '$20.000', type: 'bill' },
  { value: 10000, label: '$10.000', type: 'bill' },
  { value: 5000, label: '$5.000', type: 'bill' },
  { value: 2000, label: '$2.000', type: 'bill' },
  { value: 1000, label: '$1.000', type: 'coin' },
  { value: 500, label: '$500', type: 'coin' },
  { value: 200, label: '$200', type: 'coin' },
  { value: 100, label: '$100', type: 'coin' },
  { value: 50, label: '$50', type: 'coin' },
]

export default function CashPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'calculator'>('current')
  const [session, setSession] = useState<DBCashSession | null>(null)
  const [movements, setMovements] = useState<DBCashMovement[]>([])
  const [historySessions, setHistorySessions] = useState<DBCashSession[]>([])
  const [selectedHistorySession, setSelectedHistorySession] = useState<DBCashSession | null>(null)
  const [historyMovements, setHistoryMovements] = useState<DBCashMovement[]>([])
  const [loadingHistoryMovs, setLoadingHistoryMovs] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [businessName, setBusinessName] = useState('MI NEGOCIO')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [modal, setModal] = useState<'open' | 'movement' | 'close' | 'detail' | null>(null)
  const [openingAmount, setOpeningAmount] = useState('50000')

  // Movement modal state
  const [movType, setMovType] = useState<'income' | 'expense'>('income')
  const [movAmount, setMovAmount] = useState('')
  const [movDesc, setMovDesc] = useState('')
  const [movCategory, setMovCategory] = useState('Varios')

  // Close modal state (Blind Closure)
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [closeReport, setCloseReport] = useState<{ expected: number; counted: number; diff: number; openedAt: string; sales: number; expenses: number } | null>(null)

  // Cash Denomination Calculator state
  const [denominations, setDenominations] = useState<Record<number, number>>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
  })

  useEffect(() => {
    loadCashData()
  }, [])

  async function loadCashData() {
    try {
      setLoading(true)
      setError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let tenant_id = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
      if (!tenant_id) {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).limit(1)
        if (userData?.[0]?.tenant_id) tenant_id = userData[0].tenant_id
        else {
          const { data: ptData } = await supabase.from('platform_tenants').select('id').eq('owner_email', user.email).limit(1)
          if (ptData?.[0]?.id) tenant_id = ptData[0].id
        }
      }

      if (!tenant_id) return

      const [settingsRes, currentSessRes, historySessRes] = await Promise.all([
        supabase.from('tenant_settings').select('business_name, whatsapp, phone').eq('tenant_id', tenant_id).limit(1),
        supabase.from('cash_sessions').select('*').eq('tenant_id', tenant_id).eq('status', 'open').order('opened_at', { ascending: false }).limit(1),
        supabase.from('cash_sessions').select('*').eq('tenant_id', tenant_id).eq('status', 'closed').order('closed_at', { ascending: false }).limit(50)
      ])

      if (settingsRes.data?.[0]) {
        setBusinessName(settingsRes.data[0].business_name || 'MI NEGOCIO')
        setOwnerPhone(settingsRes.data[0].whatsapp || settingsRes.data[0].phone || '')
      }

      if (historySessRes.data) {
        setHistorySessions(historySessRes.data as any)
      }

      if (currentSessRes.data && currentSessRes.data.length > 0) {
        const currentSession = currentSessRes.data[0]
        setSession(currentSession as any)

        // Load movements
        const { data: movs } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('session_id', currentSession.id)
          .order('created_at', { ascending: false })

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
      const desc = movDesc ? `[${movCategory}] ${movDesc}` : `[${movCategory}] ${movType === 'income' ? 'Ingreso manual' : 'Egreso manual'}`
      const { error } = await supabase.rpc('add_cash_movement', {
        p_movement_type: movType,
        p_amount: parseFloat(movAmount),
        p_description: desc
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

  const totalSales = roundCurrency(movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + Number(m.amount), 0))
  const totalExpenses = roundCurrency(movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'withdrawal').reduce((s, m) => s + Number(m.amount), 0))
  const totalIncome = roundCurrency(movements.filter(m => m.movement_type === 'income' || m.movement_type === 'deposit').reduce((s, m) => s + Number(m.amount), 0))
  const opening = session ? roundCurrency(Number(session.opening_amount)) : 0
  const expected = roundCurrency(opening + totalSales + totalIncome - totalExpenses)

  async function handleCloseSession(e: React.FormEvent) {
    e.preventDefault()
    if (!closingAmount) return
    setSubmitting(true)

    const counted = roundCurrency(parseFloat(closingAmount) || 0)
    const diff = roundCurrency(counted - expected)

    try {
      const { error } = await supabase.rpc('close_cash_session', {
        p_closing_amount: counted,
        p_notes: closingNotes
      })
      if (error) throw error

      setCloseReport({
        expected,
        counted,
        diff,
        openedAt: session?.opened_at || new Date().toISOString(),
        sales: totalSales,
        expenses: totalExpenses
      })
      await loadCashData()
      setModal(null)
      setClosingAmount(''); setClosingNotes('')
    } catch (err: any) {
      alert('Error al cerrar caja: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function viewHistoryDetail(s: DBCashSession) {
    setSelectedHistorySession(s)
    setModal('detail')
    setLoadingHistoryMovs(true)
    try {
      const { data } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', s.id)
        .order('created_at', { ascending: false })
      setHistoryMovements((data as any) || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistoryMovs(false)
    }
  }

  function sendCloseReportWhatsApp(rep = closeReport, initialOp = opening) {
    if (!rep) return
    let cleanPhone = ownerPhone.replace(/D/g, '')
    if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = '57' + cleanPhone
    }

    const message = `📊 *REPORTE DE CIERRE DE CAJA*
🏪 *${businessName}*
📅 Fecha: ${new Date().toLocaleString('es-CO')}

💵 *Fondo Inicial:* ${formatCurrency(initialOp)}
🛒 *Ventas Turno:* ${formatCurrency(rep.sales)}
📤 *Gastos/Salidas:* -${formatCurrency(rep.expenses)}
──────────────
💰 *Efectivo Esperado:* ${formatCurrency(rep.expected)}
🪙 *Efectivo Contado:* ${formatCurrency(rep.counted)}
⚖️ *Diferencia:* ${rep.diff === 0 ? 'Exacto ($0)' : rep.diff > 0 ? `+${formatCurrency(rep.diff)} (Sobrante)` : `${formatCurrency(rep.diff)} (Faltante)`}

✅ Cierre registrado en Mr Tender POS.`

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }
  }

  // Calculator calculations
  const totalCalculated = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [val, count]) => {
      return sum + Number(val) * (Number(count) || 0)
    }, 0)
  }, [denominations])

  function handleDenominationChange(val: number, delta: number) {
    setDenominations(prev => ({
      ...prev,
      [val]: Math.max(0, (prev[val] || 0) + delta)
    }))
  }

  function resetDenominations() {
    setDenominations({
      100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0,
      1000: 0, 500: 0, 200: 0, 100: 0, 50: 0
    })
  }

  function applyCalculatedToOpening() {
    setOpeningAmount(String(totalCalculated))
    setModal('open')
  }

  function applyCalculatedToClosing() {
    setClosingAmount(String(totalCalculated))
    setModal('close')
  }

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historySessions
    const q = searchQuery.toLowerCase()
    return historySessions.filter(s => {
      return (
        s.opened_at.includes(q) ||
        (s.closed_at && s.closed_at.includes(q)) ||
        (s.closing_notes && s.closing_notes.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      )
    })
  }, [historySessions, searchQuery])

  // Historical Summary Metrics
  const historyMetrics = useMemo(() => {
    const totalClosed = historySessions.length
    const totalSalesSum = historySessions.reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0)
    const exactSessions = historySessions.filter(s => Math.abs(Number(s.difference_amount) || 0) < 1).length
    const accuracy = totalClosed > 0 ? Math.round((exactSessions / totalClosed) * 100) : 100
    const totalExpensesSum = historySessions.reduce((sum, s) => sum + (Number(s.total_expenses) || 0), 0)

    return { totalClosed, totalSalesSum, accuracy, totalExpensesSum }
  }, [historySessions])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Cargando módulo de caja...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', overflowX: 'hidden' }}>
      
      {/* ── HEADER & STATUS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Caja, Turnos & Arqueos
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 20,
              background: session ? '#ECFDF5' : '#F1F5F9',
              color: session ? '#059669' : '#64748B',
              border: session ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: session ? '#10B981' : '#94A3B8' }} />
              {session ? 'Turno Abierto' : 'Caja Cerrada'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0' }}>
            {session
              ? `Turno en curso desde las ${new Date(session.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
              : 'Control de apertura, cuadre ciego, gastos rápidos e historial de cierres'}
          </p>
        </div>
        
        {/* Top Header Actions */}
        {session ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setMovType('income'); setModal('movement') }}
              className="btn-neu"
              style={{ padding: '8px 13px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, color: '#008F7E', fontWeight: 700 }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Ingreso Sencillo</span>
            </button>
            <button
              onClick={() => { setMovType('expense'); setModal('movement') }}
              className="btn-neu"
              style={{ padding: '8px 13px', fontSize: '0.78rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}
            >
              <Minus size={14} strokeWidth={2.5} />
              <span>Registrar Gasto</span>
            </button>
            <button
              onClick={() => { setClosingAmount(''); setModal('close') }}
              className="btn-neu"
              style={{ padding: '8px 15px', fontSize: '0.78rem', background: '#DC2626', color: '#FFFFFF', border: '1px solid #B91C1C', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
            >
              <Lock size={14} strokeWidth={2} />
              <span>Arqueo Ciego & Cierre</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setModal('open')}
            className="btn-neu btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
          >
            <Unlock size={15} strokeWidth={2} />
            <span>Abrir Turno de Caja</span>
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* ── METRICS SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#E6F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008F7E', flexShrink: 0 }}>
            <DollarSign size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ventas en Caja (Histórico)
            </div>
            <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A' }}>
              {formatCurrency(historyMetrics.totalSalesSum + totalSales)}
            </div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
            <History size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Turnos Cerrados
            </div>
            <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A' }}>
              {historyMetrics.totalClosed} turnos
            </div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
            <CheckCircle2 size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Precisión de Arqueos
            </div>
            <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#059669' }}>
              {historyMetrics.accuracy}% exactos
            </div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }}>
            <ArrowUpRight size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Gastos / Salidas
            </div>
            <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#DC2626' }}>
              {formatCurrency(historyMetrics.totalExpensesSum + totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('current')}
          className="btn-neu"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'current' ? 800 : 600,
            background: activeTab === 'current' ? '#00B19D' : '#FFFFFF',
            color: activeTab === 'current' ? '#FFFFFF' : '#64748B',
            border: activeTab === 'current' ? '1px solid #009E8C' : '1px solid #E2E8F0',
            cursor: 'pointer'
          }}
        >
          <Building size={14} style={{ color: activeTab === 'current' ? '#FFFFFF' : '#64748B' }} />
          <span>{session ? 'Turno Actual en Vivo' : 'Apertura de Caja'}</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className="btn-neu"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'history' ? 800 : 600,
            background: activeTab === 'history' ? '#00B19D' : '#FFFFFF',
            color: activeTab === 'history' ? '#FFFFFF' : '#64748B',
            border: activeTab === 'history' ? '1px solid #009E8C' : '1px solid #E2E8F0',
            cursor: 'pointer'
          }}
        >
          <History size={14} style={{ color: activeTab === 'history' ? '#FFFFFF' : '#64748B' }} />
          <span>Historial de Cierres ({historySessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className="btn-neu"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'calculator' ? 800 : 600,
            background: activeTab === 'calculator' ? '#00B19D' : '#FFFFFF',
            color: activeTab === 'calculator' ? '#FFFFFF' : '#64748B',
            border: activeTab === 'calculator' ? '1px solid #009E8C' : '1px solid #E2E8F0',
            cursor: 'pointer'
          }}
        >
          <Calculator size={14} style={{ color: activeTab === 'calculator' ? '#FFFFFF' : '#64748B' }} />
          <span>Contador de Billetes & Monedas</span>
        </button>
      </div>

      {/* ── REPORT BANNER AFTER BLIND CLOSURE ── */}
      {closeReport && !session && (
        <div className="neu-card animate-scale-in" style={{ padding: 18, background: closeReport.diff === 0 ? '#ECFDF5' : closeReport.diff > 0 ? '#EFF6FF' : '#FEF2F2', border: '1px solid #E2E8F0', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={24} strokeWidth={2} style={{ color: closeReport.diff === 0 ? '#059669' : closeReport.diff > 0 ? '#2563EB' : '#DC2626', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', margin: 0 }}>
                  {closeReport.diff === 0 ? '¡Arqueo Perfecto! Cuadre de Caja Exacto' : closeReport.diff > 0 ? 'Sobrante Registrado en el Arqueo' : 'Faltante Registrado en el Arqueo'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                  Resultados del cierre ciego de turno
                </p>
              </div>
            </div>

            <button className="btn-neu" onClick={() => sendCloseReportWhatsApp()} style={{ background: '#25D366', color: '#fff', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, border: 'none' }}>
              <Send size={14} />
              <span>Enviar Reporte por WhatsApp</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginTop: 10 }}>
            <div style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Contado Físico</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>{formatCurrency(closeReport.counted)}</div>
            </div>
            <div style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Esperado Sistema</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>{formatCurrency(closeReport.expected)}</div>
            </div>
            <div style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Diferencia</span>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: closeReport.diff === 0 ? '#059669' : closeReport.diff > 0 ? '#2563EB' : '#DC2626' }}>
                {closeReport.diff > 0 ? `+${formatCurrency(closeReport.diff)}` : formatCurrency(closeReport.diff)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: CURRENT SESSION (OR HERO WHEN CLOSED) ── */}
      {activeTab === 'current' && (
        <>
          {session ? (
            /* Open Session Live Dashboard */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Live Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Fondo Inicial', value: formatCurrency(opening), Icon: DollarSign, color: '#008F7E', bg: '#E6F7F5' },
                  { label: 'Ventas Efectivo', value: formatCurrency(totalSales), Icon: ShoppingCart, color: '#059669', bg: '#ECFDF5' },
                  { label: 'Ingresos Manuales', value: formatCurrency(totalIncome), Icon: ArrowDownLeft, color: '#6366F1', bg: '#EEF2FF' },
                  { label: 'Gastos / Salidas', value: formatCurrency(totalExpenses), Icon: ArrowUpRight, color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Efectivo en Gaveta', value: formatCurrency(expected), Icon: Building, color: '#714AD9', bg: '#F0EDFC' },
                ].map(s => {
                  const StatIcon = s.Icon
                  return (
                    <div key={s.label} className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: s.bg, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                        <StatIcon size={16} strokeWidth={2} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.value}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Movements Timeline */}
              <div className="neu-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                    Movimientos del Turno en Vivo ({movements.length})
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Registrados cronológicamente
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {movements.map(m => {
                    const isPos = m.movement_type === 'sale' || m.movement_type === 'income' || m.movement_type === 'deposit'
                    return (
                      <div key={m.id} style={{ padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 6, background: isPos ? '#ECFDF5' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPos ? '#059669' : '#DC2626', flexShrink: 0 }}>
                            {isPos ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.description}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                              {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isPos ? '#059669' : '#DC2626', flexShrink: 0 }}>
                          {isPos ? '+' : '-'}{formatCurrency(m.amount)}
                        </div>
                      </div>
                    )
                  })}

                  {movements.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '0.82rem' }}>
                      No hay ventas ni movimientos registrados aún en este turno.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Closed State Hero Card */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* Ready to Open Card */}
              <div className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E6F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008F7E' }}>
                    <Building size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>
                      Caja Lista para Operar
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                      Inicia un nuevo turno ingresando el fondo de sencillo en gaveta
                    </p>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Selección Rápida de Fondo Inicial:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[20000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="btn-neu"
                        onClick={() => { setOpeningAmount(String(amt)); setModal('open') }}
                        style={{ padding: '8px', fontSize: '0.8rem', fontWeight: 700, background: '#FFFFFF' }}
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setModal('open')}
                    className="btn-neu btn-primary"
                    style={{ flex: 1, padding: '10px 16px', fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Unlock size={15} strokeWidth={2} />
                    <span>Abrir Turno Manual</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('calculator')}
                    className="btn-neu"
                    style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Calculator size={15} />
                    <span>Contar Billetes</span>
                  </button>
                </div>
              </div>

              {/* Last Closed Shift Overview */}
              <div className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                    Último Cierre de Caja
                  </div>
                  {historySessions[0] && (
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {formatDateTime(historySessions[0].closed_at || historySessions[0].opened_at)}
                    </span>
                  )}
                </div>

                {historySessions[0] ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Total Ventas</div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#059669' }}>
                          {formatCurrency(Number(historySessions[0].total_sales) || 0)}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Efectivo Contado</div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                          {formatCurrency(Number(historySessions[0].closing_amount) || 0)}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Resultado de Cuadre</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: Number(historySessions[0].difference_amount) === 0 ? '#059669' : '#DC2626' }}>
                          {Number(historySessions[0].difference_amount) === 0 ? '✓ Cuadre Exacto' : `Diferencia: ${formatCurrency(Number(historySessions[0].difference_amount))}`}
                        </div>
                      </div>

                      <button
                        onClick={() => viewHistoryDetail(historySessions[0])}
                        className="btn-neu"
                        style={{ padding: '6px 12px', fontSize: '0.74rem', fontWeight: 700 }}
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B', fontSize: '0.8rem' }}>
                    Aún no hay turnos anteriores registrados. Abre tu primer turno para comenzar.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: HISTORY OF SESSIONS ── */}
      {activeTab === 'history' && (
        <div className="neu-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search bar & Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Historial de Cierres de Turno ({filteredHistory.length})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                Auditoría completa de turnos, fondos iniciales, ventas y diferencias
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative', width: 220 }}>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Buscar por fecha u observaciones..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 30, fontSize: '0.78rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: '#94A3B8' }} />
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B', fontSize: '0.84rem' }}>
              No se encontraron registros de turnos anteriores.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 8px' }}>Fecha & Horario</th>
                    <th style={{ padding: '10px 8px' }}>Fondo Inicial</th>
                    <th style={{ padding: '10px 8px' }}>Ventas Efectivo</th>
                    <th style={{ padding: '10px 8px' }}>Gastos</th>
                    <th style={{ padding: '10px 8px' }}>Contado en Cierre</th>
                    <th style={{ padding: '10px 8px' }}>Diferencia / Cuadre</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(s => {
                    const diff = Number(s.difference_amount) || 0
                    const isExact = Math.abs(diff) < 1
                    const isPositive = diff > 0

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>
                            {formatDateTime(s.closed_at || s.opened_at)}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                            Abierto: {new Date(s.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ padding: '10px 8px', color: '#64748B' }}>
                          {formatCurrency(Number(s.opening_amount) || 0)}
                        </td>

                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#059669' }}>
                          {formatCurrency(Number(s.total_sales) || 0)}
                        </td>

                        <td style={{ padding: '10px 8px', color: '#DC2626' }}>
                          -{formatCurrency(Number(s.total_expenses) || 0)}
                        </td>

                        <td style={{ padding: '10px 8px', fontWeight: 800, color: '#0F172A' }}>
                          {formatCurrency(Number(s.closing_amount) || 0)}
                        </td>

                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background: isExact ? '#ECFDF5' : isPositive ? '#EFF6FF' : '#FEF2F2',
                            color: isExact ? '#059669' : isPositive ? '#2563EB' : '#DC2626',
                            border: isExact ? '1px solid #A7F3D0' : isPositive ? '1px solid #BFDBFE' : '1px solid #FECACA'
                          }}>
                            {isExact ? '✓ Exacto' : isPositive ? `+${formatCurrency(diff)} Sobrante` : `${formatCurrency(diff)} Faltante`}
                          </span>
                        </td>

                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <button
                            onClick={() => viewHistoryDetail(s)}
                            className="btn-neu"
                            style={{ padding: '5px 10px', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} />
                            <span>Ver Detalle</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CASH DENOMINATION CALCULATOR ── */}
      {activeTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* Denominations Input Grid */}
          <div className="neu-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Conteo de Billetes y Monedas
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                  Digita la cantidad física de cada denominación para cuadre rápido
                </p>
              </div>

              <button
                onClick={resetDenominations}
                className="btn-neu"
                style={{ padding: '6px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={13} />
                <span>Reiniciar</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DENOMINATIONS.map(d => {
                const count = denominations[d.value] || 0
                const subtotal = d.value * count

                return (
                  <div
                    key={d.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 100 }}>
                      <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: 4, background: d.type === 'bill' ? '#E6F7F5' : '#F1F5F9', color: d.type === 'bill' ? '#008F7E' : '#64748B', fontWeight: 800 }}>
                        {d.type === 'bill' ? 'Billete' : 'Moneda'}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                        {d.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleDenominationChange(d.value, -1)}
                        className="btn-neu"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0
                          setDenominations(prev => ({ ...prev, [d.value]: Math.max(0, val) }))
                        }}
                        placeholder="0"
                        style={{
                          width: 55,
                          textAlign: 'center',
                          padding: '4px 6px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '1px solid #CBD5E1'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleDenominationChange(d.value, 1)}
                        className="btn-neu"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ width: 90, textAlign: 'right', fontWeight: 800, fontSize: '0.84rem', color: subtotal > 0 ? '#008F7E' : '#94A3B8' }}>
                      {formatCurrency(subtotal)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Calculator Total Summary Card */}
          <div className="neu-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: 'fit-content' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
              Resumen del Conteo Físico
            </div>

            <div style={{ padding: '16px', background: '#E6F7F5', border: '1px solid #99F6E4', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: '#008F7E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Efectivo Contado
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#008F7E', marginTop: 4 }}>
                {formatCurrency(totalCalculated)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                disabled={totalCalculated <= 0}
                onClick={applyCalculatedToOpening}
                className="btn-neu btn-primary"
                style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Unlock size={15} />
                <span>Usar como Fondo de Apertura ({formatCurrency(totalCalculated)})</span>
              </button>

              {session && (
                <button
                  type="button"
                  disabled={totalCalculated <= 0}
                  onClick={applyCalculatedToClosing}
                  className="btn-neu"
                  style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 800, background: '#DC2626', color: '#FFFFFF', border: '1px solid #B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Lock size={15} />
                  <span>Usar para Arqueo de Cierre ({formatCurrency(totalCalculated)})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APERTURA DE CAJA ── */}
      {modal === 'open' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleOpenSession} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 22 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
              Apertura de Turno de Caja
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 14 }}>
              Ingresa el fondo inicial de sencillo disponible en la gaveta
            </p>
            
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Fondo Inicial ($) *
              </label>
              <input
                className="input-neu"
                type="number"
                step="1000"
                placeholder="50000"
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                required
                autoFocus
                style={{ fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
              {[20000, 50000, 100000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  className="btn-neu"
                  onClick={() => setOpeningAmount(String(amt))}
                  style={{ padding: '6px', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setModal(null)} style={{ flex: 1, padding: 10 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ flex: 1, padding: 10, fontWeight: 800 }}>
                {submitting ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: REGISTRAR MOVIMIENTO (INGRESO / GASTO) ── */}
      {modal === 'movement' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleAddMovement} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 22 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
              {movType === 'income' ? 'Registrar Ingreso Manual' : 'Registrar Salida / Gasto'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Categoría Rápida
                </label>
                <select
                  className="input-neu"
                  value={movCategory}
                  onChange={e => setMovCategory(e.target.value)}
                  style={{ fontSize: '0.84rem' }}
                >
                  {movType === 'expense' ? (
                    <>
                      <option value="Gastos de Aseo / Local">Gastos de Aseo / Local</option>
                      <option value="Pago Proveedor Express">Pago Proveedor Express</option>
                      <option value="Almuerzos / Refrigerios">Almuerzos / Refrigerios</option>
                      <option value="Retiro a Banco / Propietario">Retiro a Banco / Propietario</option>
                      <option value="Bolsas / Empaques">Bolsas / Empaques</option>
                      <option value="Varios">Varios</option>
                    </>
                  ) : (
                    <>
                      <option value="Sencillo Adicional">Sencillo Adicional</option>
                      <option value="Aporte de Propietario">Aporte de Propietario</option>
                      <option value="Cobro de Cartera / Fiado">Cobro de Cartera / Fiado</option>
                      <option value="Varios">Varios</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Monto ($) *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="500"
                  placeholder="Ej: 15000"
                  value={movAmount}
                  onChange={e => setMovAmount(e.target.value)}
                  required
                  autoFocus
                  style={{ fontSize: '1.15rem', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Detalle / Motivo (Opcional)
                </label>
                <input
                  className="input-neu"
                  placeholder="Ej: Compra de bolsas plásticas"
                  value={movDesc}
                  onChange={e => setMovDesc(e.target.value)}
                  style={{ fontSize: '0.84rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setModal(null)} style={{ flex: 1, padding: 10 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting || !movAmount} style={{ flex: 1, padding: 10, fontWeight: 800 }}>
                {submitting ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: ARQUEO CIEGO & CIERRE ── */}
      {modal === 'close' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCloseSession} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: 22 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
              Arqueo Ciego de Cierre de Turno
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 14 }}>
              Cuenta el dinero físico total en la gaveta e ingrésalo aquí. El sistema calculará automáticamente la diferencia.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Efectivo Total Contado ($) *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="100"
                  placeholder="Ej: 345000"
                  value={closingAmount}
                  onChange={e => setClosingAmount(e.target.value)}
                  required
                  autoFocus
                  style={{ fontSize: '1.25rem', fontWeight: 900, textAlign: 'center' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Observaciones de Entrega de Turno
                </label>
                <input
                  className="input-neu"
                  placeholder="Ej: Turno entregado a satisfacción"
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  style={{ fontSize: '0.84rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setModal(null)} style={{ flex: 1, padding: 10 }}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-neu"
                disabled={submitting || !closingAmount}
                style={{ flex: 1, padding: 10, background: '#DC2626', color: '#FFFFFF', border: '1px solid #B91C1C', fontWeight: 800 }}
              >
                {submitting ? 'Cerrando...' : 'Finalizar Turno'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: DETALLE DE TURNO HISTÓRICO ── */}
      {modal === 'detail' && selectedHistorySession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Detalle del Cierre de Turno
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  {formatDateTime(selectedHistorySession.closed_at || selectedHistorySession.opened_at)}
                </div>
              </div>

              <button onClick={() => setModal(null)} className="btn-neu" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Fondo Inicial</span>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                  {formatCurrency(Number(selectedHistorySession.opening_amount) || 0)}
                </div>
              </div>

              <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Ventas Totales</span>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#059669' }}>
                  {formatCurrency(Number(selectedHistorySession.total_sales) || 0)}
                </div>
              </div>

              <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Gastos Registrados</span>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#DC2626' }}>
                  -{formatCurrency(Number(selectedHistorySession.total_expenses) || 0)}
                </div>
              </div>

              <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Efectivo Contado</span>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                  {formatCurrency(Number(selectedHistorySession.closing_amount) || 0)}
                </div>
              </div>
            </div>

            {/* Difference Badge */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: Number(selectedHistorySession.difference_amount) === 0 ? '#ECFDF5' : Number(selectedHistorySession.difference_amount) > 0 ? '#EFF6FF' : '#FEF2F2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Resultado de Cuadre:
              </span>
              <span style={{
                fontWeight: 900,
                fontSize: '0.88rem',
                color: Number(selectedHistorySession.difference_amount) === 0 ? '#059669' : Number(selectedHistorySession.difference_amount) > 0 ? '#2563EB' : '#DC2626'
              }}>
                {Number(selectedHistorySession.difference_amount) === 0 ? '✓ Exacto ($0)' : formatCurrency(Number(selectedHistorySession.difference_amount))}
              </span>
            </div>

            {/* Session Notes */}
            {selectedHistorySession.closing_notes && (
              <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#475569' }}>
                <strong>Observaciones:</strong> {selectedHistorySession.closing_notes}
              </div>
            )}

            {/* WhatsApp Share Button */}
            <button
              onClick={() => {
                sendCloseReportWhatsApp({
                  expected: Number(selectedHistorySession.expected_amount) || 0,
                  counted: Number(selectedHistorySession.closing_amount) || 0,
                  diff: Number(selectedHistorySession.difference_amount) || 0,
                  openedAt: selectedHistorySession.opened_at,
                  sales: Number(selectedHistorySession.total_sales) || 0,
                  expenses: Number(selectedHistorySession.total_expenses) || 0
                }, Number(selectedHistorySession.opening_amount) || 0)
              }}
              className="btn-neu"
              style={{ background: '#25D366', color: '#FFFFFF', padding: '9px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none' }}
            >
              <Send size={14} />
              <span>Compartir por WhatsApp</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
