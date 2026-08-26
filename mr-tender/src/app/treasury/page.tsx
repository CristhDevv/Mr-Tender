'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Landmark,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  MessageSquare,
  DollarSign,
  CreditCard,
  Building2,
  FileText,
  Clock,
  Layers,
  X,
  ShieldCheck,
  TrendingUp,
  Wallet
} from 'lucide-react'

interface BankAccount {
  id: string
  tenant_id: string
  bank_name: string
  account_type: string
  account_number: string
  current_balance: number
  currency: string
  is_active: boolean
  created_at: string
}

interface BankTransaction {
  id: string
  tenant_id: string
  bank_account_id: string
  transaction_date: string
  description: string
  amount: number
  transaction_type: 'income' | 'expense'
  reference?: string | null
  is_reconciled: boolean
  created_at: string
  bank_accounts?: BankAccount
}

interface PaymentSchedule {
  id: string
  tenant_id: string
  schedule_type: 'cxc' | 'cxp'
  entity_name: string
  document_reference: string
  due_date: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  notes?: string | null
  created_at: string
}

export default function TreasuryPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'calendar'>('accounts')
  const [submitting, setSubmitting] = useState(false)

  // Data
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'cxc' | 'cxp'>('all')

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  // Forms
  const [accountForm, setAccountForm] = useState({
    bank_name: 'Bancolombia',
    account_type: 'ahorros',
    account_number: '',
    current_balance: 5000000
  })

  const [transactionForm, setTransactionForm] = useState({
    bank_account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 150000,
    transaction_type: 'income' as 'income' | 'expense',
    reference: ''
  })

  const [scheduleForm, setScheduleForm] = useState({
    schedule_type: 'cxc' as 'cxc' | 'cxp',
    entity_name: '',
    document_reference: 'FAC-001',
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 1200000,
    notes: ''
  })

  useEffect(() => {
    loadTreasuryData()
  }, [])

  async function loadTreasuryData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [accRes, txRes, schRes] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('bank_transactions').select('*, bank_accounts(*)').eq('tenant_id', tid).order('transaction_date', { ascending: false }),
        supabase.from('payment_schedules').select('*').eq('tenant_id', tid).order('due_date', { ascending: true })
      ])

      setAccounts(accRes.data || [])
      setTransactions((txRes.data as any) || [])
      setSchedules(schRes.data || [])
    } catch (err) {
      console.error('Error loading treasury:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Account
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!accountForm.bank_name.trim() || !accountForm.account_number.trim()) {
      return alert('Banco y número de cuenta son obligatorios')
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('bank_accounts').insert({
        tenant_id: tenantId,
        bank_name: accountForm.bank_name.trim(),
        account_type: accountForm.account_type,
        account_number: accountForm.account_number.trim(),
        current_balance: Number(accountForm.current_balance),
        currency: 'COP',
        is_active: true
      })

      if (error) throw error

      setShowAccountModal(false)
      setAccountForm({
        bank_name: 'Bancolombia',
        account_type: 'ahorros',
        account_number: '',
        current_balance: 5000000
      })
      await loadTreasuryData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Transaction
  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!transactionForm.bank_account_id || !transactionForm.description.trim() || !transactionForm.amount) {
      return alert('Completa todos los campos obligatorios')
    }

    setSubmitting(true)
    try {
      const { error: txErr } = await supabase.from('bank_transactions').insert({
        tenant_id: tenantId,
        bank_account_id: transactionForm.bank_account_id,
        transaction_date: transactionForm.transaction_date,
        description: transactionForm.description.trim(),
        amount: Number(transactionForm.amount),
        transaction_type: transactionForm.transaction_type,
        reference: transactionForm.reference.trim() || null,
        is_reconciled: true,
        reconciled_at: new Date().toISOString()
      })

      if (txErr) throw txErr

      // Update account balance
      const account = accounts.find(a => a.id === transactionForm.bank_account_id)
      if (account) {
        const delta = transactionForm.transaction_type === 'income' ? Number(transactionForm.amount) : -Number(transactionForm.amount)
        await supabase
          .from('bank_accounts')
          .update({ current_balance: Number(account.current_balance) + delta, updated_at: new Date().toISOString() })
          .eq('id', account.id)
      }

      setShowTransactionModal(false)
      setTransactionForm({
        bank_account_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 150000,
        transaction_type: 'income',
        reference: ''
      })
      await loadTreasuryData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar movimiento')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Schedule (CxC / CxP)
  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!scheduleForm.entity_name.trim() || !scheduleForm.amount) {
      return alert('Tercero y monto son obligatorios')
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('payment_schedules').insert({
        tenant_id: tenantId,
        schedule_type: scheduleForm.schedule_type,
        entity_name: scheduleForm.entity_name.trim(),
        document_reference: scheduleForm.document_reference.trim(),
        due_date: scheduleForm.due_date,
        amount: Number(scheduleForm.amount),
        status: 'pending',
        notes: scheduleForm.notes.trim() || null
      })

      if (error) throw error

      setShowScheduleModal(false)
      setScheduleForm({
        schedule_type: 'cxc',
        entity_name: '',
        document_reference: 'FAC-001',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 1200000,
        notes: ''
      })
      await loadTreasuryData()
    } catch (err: any) {
      alert(err.message || 'Error al agendar compromiso')
    } finally {
      setSubmitting(false)
    }
  }

  // Mark Schedule Paid
  async function handleMarkPaid(scheduleId: string) {
    try {
      const { error } = await supabase
        .from('payment_schedules')
        .update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
        .eq('id', scheduleId)

      if (error) throw error
      await loadTreasuryData()
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado')
    }
  }

  // Seed Demo Data
  async function handleSeedDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Bank Accounts
      const { data: createdAccs } = await supabase.from('bank_accounts').insert([
        {
          tenant_id: tenantId,
          bank_name: 'Bancolombia Principal',
          account_type: 'corriente',
          account_number: '241-890214-55',
          current_balance: 18450000,
          currency: 'COP',
          is_active: true
        },
        {
          tenant_id: tenantId,
          bank_name: 'Davivienda Nómina & Recaudos',
          account_type: 'ahorros',
          account_number: '004-981245-88',
          current_balance: 9200000,
          currency: 'COP',
          is_active: true
        },
        {
          tenant_id: tenantId,
          bank_name: 'Nequi Empresarial / QR',
          account_type: 'nequi',
          account_number: '3109876543',
          current_balance: 2150000,
          currency: 'COP',
          is_active: true
        }
      ]).select()

      const acc1 = createdAccs?.[0]
      const acc2 = createdAccs?.[1]

      // 2. Transactions
      if (acc1 && acc2) {
        await supabase.from('bank_transactions').insert([
          {
            tenant_id: tenantId,
            bank_account_id: acc1.id,
            transaction_date: new Date().toISOString().split('T')[0],
            description: 'Recaudo Factura Electrónica FE-1092 - Inversiones Andina',
            amount: 4500000,
            transaction_type: 'income',
            reference: 'PSE-90124',
            is_reconciled: true,
            reconciled_at: new Date().toISOString()
          },
          {
            tenant_id: tenantId,
            bank_account_id: acc1.id,
            transaction_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Pago Proveedor Harinas del Campo S.A. - Doc Soporte',
            amount: 1800000,
            transaction_type: 'expense',
            reference: 'TRANSF-4412',
            is_reconciled: true,
            reconciled_at: new Date().toISOString()
          },
          {
            tenant_id: tenantId,
            bank_account_id: acc2.id,
            transaction_date: new Date().toISOString().split('T')[0],
            description: 'Pago Nómina 1ra Quincena Colaboradores',
            amount: 3250000,
            transaction_type: 'expense',
            reference: 'NOM-DISP-01',
            is_reconciled: true,
            reconciled_at: new Date().toISOString()
          }
        ])
      }

      // 3. Payment Schedules
      await supabase.from('payment_schedules').insert([
        {
          tenant_id: tenantId,
          schedule_type: 'cxc',
          entity_name: 'Distribuciones del Norte S.A.S',
          document_reference: 'FE-1095',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: 3800000,
          status: 'pending',
          notes: 'Factura a 30 días. Recordatorio programado.'
        },
        {
          tenant_id: tenantId,
          schedule_type: 'cxp',
          entity_name: 'Empaques & Cajas Industriales',
          document_reference: 'PROV-8821',
          due_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: 1450000,
          status: 'pending',
          notes: 'Vencimiento de crédito de empaques.'
        },
        {
          tenant_id: tenantId,
          schedule_type: 'cxp',
          entity_name: 'Arrendamiento Local Principal',
          document_reference: 'CANON-SEP',
          due_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: 2800000,
          status: 'pending',
          notes: 'Pago mensual de canon de arrendamiento comercial.'
        }
      ])

      await loadTreasuryData()
    } catch (err: any) {
      alert('Error cargando demo de tesorería: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Reminder for CxC
  function getWhatsAppReminderUrl(schedule: PaymentSchedule) {
    const text = encodeURIComponent(
      `¡Hola ${schedule.entity_name}! 🔔 Te recordamos el vencimiento de tu factura *${schedule.document_reference}* por valor de ${formatCurrency(Number(schedule.amount))}.\n\n` +
      `• *Fecha límite de pago:* ${formatDate(schedule.due_date)}\n\n` +
      `Puedes realizar tu transferencia a nuestras cuentas bancarias o solicitar tu link de pago PSE / Nequi.\n` +
      `¡Gracias por tu preferencia!`
    )
    return `https://wa.me/?text=${text}`
  }

  // KPIs
  const totalCashInBanks = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0)
  const totalPendingCxC = schedules.filter(s => s.schedule_type === 'cxc' && s.status === 'pending').reduce((sum, s) => sum + Number(s.amount), 0)
  const totalPendingCxP = schedules.filter(s => s.schedule_type === 'cxp' && s.status === 'pending').reduce((sum, s) => sum + Number(s.amount), 0)
  const projectedLiquidity = totalCashInBanks + totalPendingCxC - totalPendingCxP

  // Filtered schedules
  const filteredSchedules = schedules.filter(s => {
    const matchType = scheduleFilter === 'all' || s.schedule_type === scheduleFilter
    const matchQ = s.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.document_reference.toLowerCase().includes(searchQuery.toLowerCase())
    return matchType && matchQ
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Tesorería, Bancos & Flujo de Caja
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Control de cuentas bancarias en tiempo real, conciliación de extractos y calendario inteligente de cobros (CxC) y pagos (CxP)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadTreasuryData} className="btn-neu btn-ghost" title="Actualizar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {accounts.length === 0 && (
            <button onClick={handleSeedDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Cuentas Demo
            </button>
          )}
          {activeTab === 'accounts' && (
            <button onClick={() => setShowAccountModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Nueva Cuenta Bancaria</span>
            </button>
          )}
          {activeTab === 'transactions' && (
            <button onClick={() => setShowTransactionModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Registrar Movimiento</span>
            </button>
          )}
          {activeTab === 'calendar' && (
            <button onClick={() => setShowScheduleModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Agendar Cobro / Pago</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Saldo Disponible en Bancos
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(totalCashInBanks)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {accounts.length} cuentas activas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Por Cobrar Pendiente (CxC)
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(totalPendingCxC)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Facturas a favor
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Por Pagar Pendiente (CxP)
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(totalPendingCxP)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Obligaciones y proveedores
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Liquidez Neta Proyectada
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(projectedLiquidity)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Flujo de caja estimado
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('accounts')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'accounts' ? 700 : 500,
            background: activeTab === 'accounts' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'accounts' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Landmark size={15} strokeWidth={2} />
          <span>Cuentas Bancarias ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'transactions' ? 700 : 500,
            background: activeTab === 'transactions' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'transactions' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <CreditCard size={15} strokeWidth={2} />
          <span>Movimientos & Conciliación ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'calendar' ? 700 : 500,
            background: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'calendar' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Calendar size={15} strokeWidth={2} />
          <span>Calendario CxC / CxP ({schedules.length})</span>
        </button>
      </div>

      {/* ── TAB 1: CUENTAS BANCARIAS ── */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {accounts.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Landmark size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay cuentas bancarias registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra cuentas de ahorro, corriente, Nequi o Daviplata para conciliar tus ingresos y egresos.
              </p>
              <button onClick={() => setShowAccountModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Crear Primera Cuenta
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {accounts.map(acc => (
                <div key={acc.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{acc.bank_name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Cuenta {acc.account_type} • {acc.account_number}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                      Activa ✅
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8, marginTop: 4 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Saldo Disponible</span>
                    <strong style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(acc.current_balance))}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MOVIMIENTOS & EXTRACTOS ── */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Extracto & Movimientos Bancarios
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
              Historial de ingresos y egresos bancarios con validación y conciliación contable automática.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Fecha</th>
                    <th style={{ padding: '8px 10px' }}>Cuenta</th>
                    <th style={{ padding: '8px 10px' }}>Descripción</th>
                    <th style={{ padding: '8px 10px' }}>Referencia</th>
                    <th style={{ padding: '8px 10px' }}>Tipo</th>
                    <th style={{ padding: '8px 10px' }}>Monto</th>
                    <th style={{ padding: '8px 10px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                        No hay movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 10px' }}>{formatDate(tx.transaction_date)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{tx.bank_accounts?.bank_name || 'Banco'}</td>
                        <td style={{ padding: '8px 10px' }}>{tx.description}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{tx.reference || '-'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                            {tx.transaction_type === 'income' ? 'Ingreso (+)' : 'Egreso (-)'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                          {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                            Conciliado ✅
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CALENDARIO CXC / CXP ── */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por tercero o factura..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setScheduleFilter('all')}
                className="btn-neu"
                style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: scheduleFilter === 'all' ? 700 : 500, background: scheduleFilter === 'all' ? 'var(--text-primary)' : 'var(--bg)', color: scheduleFilter === 'all' ? 'var(--bg)' : 'var(--text-secondary)' }}
              >
                Todos
              </button>
              <button
                onClick={() => setScheduleFilter('cxc')}
                className="btn-neu"
                style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: scheduleFilter === 'cxc' ? 700 : 500, background: scheduleFilter === 'cxc' ? 'var(--text-primary)' : 'var(--bg)', color: scheduleFilter === 'cxc' ? 'var(--bg)' : 'var(--text-secondary)' }}
              >
                Por Cobrar (CxC)
              </button>
              <button
                onClick={() => setScheduleFilter('cxp')}
                className="btn-neu"
                style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: scheduleFilter === 'cxp' ? 700 : 500, background: scheduleFilter === 'cxp' ? 'var(--text-primary)' : 'var(--bg)', color: scheduleFilter === 'cxp' ? 'var(--bg)' : 'var(--text-secondary)' }}
              >
                Por Pagar (CxP)
              </button>
            </div>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Calendar size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay compromisos en el calendario</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Programa facturas por cobrar a clientes o cuentas por pagar a proveedores con alertas de vencimiento.
              </p>
              <button onClick={() => setShowScheduleModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Agendar Primer Compromiso
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {filteredSchedules.map(sch => {
                const isCxC = sch.schedule_type === 'cxc'
                const isPaid = sch.status === 'paid'

                return (
                  <div key={sch.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{sch.entity_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Ref: {sch.document_reference} • Vence: {formatDate(sch.due_date)}
                        </div>
                      </div>

                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                        {isPaid ? 'Pagado ✅' : isCxC ? 'CxC Por Cobrar' : 'CxP Por Pagar'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 10, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monto Programado:</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{formatCurrency(Number(sch.amount))}</strong>
                    </div>

                    {sch.notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {sch.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                      {!isPaid && (
                        <button
                          onClick={() => handleMarkPaid(sch.id)}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                        >
                          Marcar Pagado
                        </button>
                      )}

                      {isCxC && !isPaid && (
                        <a
                          href={getWhatsAppReminderUrl(sch)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-neu btn-ghost"
                          title="Enviar recordatorio de cobro por WhatsApp"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <MessageSquare size={13} />
                          <span>Recordar Cobro</span>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: NUEVA CUENTA BANCARIA ── */}
      {showAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Nueva Cuenta Bancaria</h3>
              <button onClick={() => setShowAccountModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Entidad Bancaria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Bancolombia, Davivienda, BBVA, Nequi"
                  className="input-neu"
                  value={accountForm.bank_name}
                  onChange={e => setAccountForm(f => ({ ...f, bank_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo de Cuenta</label>
                  <select
                    className="input-neu"
                    value={accountForm.account_type}
                    onChange={e => setAccountForm(f => ({ ...f, account_type: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="caja_menor">Caja Menor</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Número de Cuenta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 241-890214-55"
                    className="input-neu"
                    value={accountForm.account_number}
                    onChange={e => setAccountForm(f => ({ ...f, account_number: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Saldo Inicial ($)</label>
                <input
                  type="number"
                  min="0"
                  className="input-neu"
                  value={accountForm.current_balance}
                  onChange={e => setAccountForm(f => ({ ...f, current_balance: Number(e.target.value) }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAccountModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR MOVIMIENTO ── */}
      {showTransactionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Registrar Movimiento Bancario</h3>
              <button onClick={() => setShowTransactionModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cuenta Bancaria *</label>
                <select
                  required
                  className="input-neu"
                  value={transactionForm.bank_account_id}
                  onChange={e => setTransactionForm(f => ({ ...f, bank_account_id: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                >
                  <option value="">-- Selecciona una cuenta --</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bank_name} ({a.account_number})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo de Movimiento</label>
                  <select
                    className="input-neu"
                    value={transactionForm.transaction_type}
                    onChange={e => setTransactionForm(f => ({ ...f, transaction_type: e.target.value as any }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="income">Ingreso (+)</option>
                    <option value="expense">Egreso (-)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha</label>
                  <input
                    type="date"
                    required
                    className="input-neu"
                    value={transactionForm.transaction_date}
                    onChange={e => setTransactionForm(f => ({ ...f, transaction_date: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Descripción del Movimiento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de factura FE-1092"
                  className="input-neu"
                  value={transactionForm.description}
                  onChange={e => setTransactionForm(f => ({ ...f, description: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Monto ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-neu"
                    value={transactionForm.amount}
                    onChange={e => setTransactionForm(f => ({ ...f, amount: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Referencia / Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej: TRANSF-8921"
                    className="input-neu"
                    value={transactionForm.reference}
                    onChange={e => setTransactionForm(f => ({ ...f, reference: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowTransactionModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGENDAR COBRO / PAGO ── */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Agendar Compromiso en Calendario</h3>
              <button onClick={() => setShowScheduleModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo de Compromiso</label>
                  <select
                    className="input-neu"
                    value={scheduleForm.schedule_type}
                    onChange={e => setScheduleForm(f => ({ ...f, schedule_type: e.target.value as any }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="cxc">Por Cobrar (CxC)</option>
                    <option value="cxp">Por Pagar (CxP)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    required
                    className="input-neu"
                    value={scheduleForm.due_date}
                    onChange={e => setScheduleForm(f => ({ ...f, due_date: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cliente o Proveedor (Tercero) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuciones del Norte S.A.S"
                  className="input-neu"
                  value={scheduleForm.entity_name}
                  onChange={e => setScheduleForm(f => ({ ...f, entity_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Referencia / Factura</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: FE-1095"
                    className="input-neu"
                    value={scheduleForm.document_reference}
                    onChange={e => setScheduleForm(f => ({ ...f, document_reference: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Monto Programado ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-neu"
                    value={scheduleForm.amount}
                    onChange={e => setScheduleForm(f => ({ ...f, amount: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas u Observaciones</label>
                <textarea
                  rows={2}
                  className="input-neu"
                  placeholder="Detalles sobre las condiciones de pago..."
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ fontSize: '0.8rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Agendar Compromiso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

