'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Users,
  Receipt,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Clock,
  DollarSign,
  Package,
  Layers,
  TrendingUp,
  Percent,
  Check,
  X,
  FileText,
  ShieldCheck,
  Printer,
  Calendar,
  Building2,
  CreditCard,
  Briefcase
} from 'lucide-react'

interface PayrollContract {
  id: string
  tenant_id: string
  employee_name: string
  document_type: string
  document_number: string
  email?: string | null
  phone?: string | null
  contract_type: string
  salary_type: string
  base_salary: number
  has_transport_allowance: boolean
  transport_allowance: number
  payment_frequency: string
  bank_name?: string | null
  bank_account_type?: string | null
  bank_account_number?: string | null
  status: string
  start_date: string
  created_at: string
}

interface PayrollSettlement {
  id: string
  tenant_id: string
  period_start: string
  period_end: string
  period_type: string
  contract_id: string
  employee_name: string
  document_number: string
  worked_days: number
  base_salary: number
  transport_allowance: number
  overtime_amount: number
  bonuses_amount: number
  commissions_amount: number
  gross_earnings: number
  health_deduction: number
  pension_deduction: number
  solidarity_fund_deduction: number
  withholding_tax: number
  other_deductions: number
  total_deductions: number
  net_pay: number
  status: 'draft' | 'approved' | 'paid' | 'emitted_dian'
  notes?: string | null
  created_at: string
  payroll_contracts?: PayrollContract
  payroll_electronic_documents?: {
    consecutive_number: string
    cune: string
    qr_code?: string
    dian_status: string
    emitted_at: string
  }[]
}

export default function PayrollPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'settlements' | 'electronic' | 'contracts'>('settlements')
  const [submitting, setSubmitting] = useState(false)
  const [emittingId, setEmittingId] = useState<string | null>(null)

  // Data states
  const [contracts, setContracts] = useState<PayrollContract[]>([])
  const [settlements, setSettlements] = useState<PayrollSettlement[]>([])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')

  // Modals
  const [showContractModal, setShowContractModal] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [selectedSettlementForPrint, setSelectedSettlementForPrint] = useState<PayrollSettlement | null>(null)

  // Forms
  const [contractForm, setContractForm] = useState({
    employee_name: '',
    document_type: 'CC',
    document_number: '',
    email: '',
    phone: '',
    contract_type: 'indefinido',
    salary_type: 'ordinario',
    base_salary: 1300000,
    has_transport_allowance: true,
    transport_allowance: 162000,
    payment_frequency: 'quincenal',
    bank_name: 'Bancolombia',
    bank_account_type: 'ahorros',
    bank_account_number: '',
    start_date: new Date().toISOString().split('T')[0]
  })

  const [settlementForm, setSettlementForm] = useState({
    contract_id: '',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
    period_type: 'quincenal',
    worked_days: 15,
    base_salary: 650000,
    transport_allowance: 81000,
    overtime_amount: 0,
    bonuses_amount: 0,
    commissions_amount: 0,
    health_deduction: 26000, // 4% de base
    pension_deduction: 26000, // 4% de base
    solidarity_fund_deduction: 0,
    withholding_tax: 0,
    other_deductions: 0,
    notes: ''
  })

  useEffect(() => {
    loadPayrollData()
  }, [])

  async function loadPayrollData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [contractsRes, settlementsRes] = await Promise.all([
        supabase.from('payroll_contracts').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('payroll_settlements').select('*, payroll_contracts(*), payroll_electronic_documents(*)').eq('tenant_id', tid).order('period_start', { ascending: false })
      ])

      setContracts(contractsRes.data || [])
      setSettlements((settlementsRes.data as any) || [])
    } catch (err) {
      console.error('Error loading payroll data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Contract
  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!contractForm.employee_name.trim() || !contractForm.document_number.trim()) {
      return alert('Nombre y documento son obligatorios')
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('payroll_contracts').insert({
        tenant_id: tenantId,
        employee_name: contractForm.employee_name.trim(),
        document_type: contractForm.document_type,
        document_number: contractForm.document_number.trim(),
        email: contractForm.email.trim() || null,
        phone: contractForm.phone.trim() || null,
        contract_type: contractForm.contract_type,
        salary_type: contractForm.salary_type,
        base_salary: Number(contractForm.base_salary),
        has_transport_allowance: contractForm.has_transport_allowance,
        transport_allowance: contractForm.has_transport_allowance ? Number(contractForm.transport_allowance) : 0,
        payment_frequency: contractForm.payment_frequency,
        bank_name: contractForm.bank_name.trim() || null,
        bank_account_type: contractForm.bank_account_type,
        bank_account_number: contractForm.bank_account_number.trim() || null,
        start_date: contractForm.start_date,
        status: 'active'
      })

      if (error) throw error

      setShowContractModal(false)
      setContractForm({
        employee_name: '',
        document_type: 'CC',
        document_number: '',
        email: '',
        phone: '',
        contract_type: 'indefinido',
        salary_type: 'ordinario',
        base_salary: 1300000,
        has_transport_allowance: true,
        transport_allowance: 162000,
        payment_frequency: 'quincenal',
        bank_name: 'Bancolombia',
        bank_account_type: 'ahorros',
        bank_account_number: '',
        start_date: new Date().toISOString().split('T')[0]
      })
      await loadPayrollData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar contrato laboral')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Settlement
  async function handleCreateSettlement(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!settlementForm.contract_id) return alert('Selecciona un empleado')

    const selContract = contracts.find(c => c.id === settlementForm.contract_id)
    if (!selContract) return

    setSubmitting(true)
    try {
      const gross = Number(settlementForm.base_salary) + Number(settlementForm.transport_allowance) + Number(settlementForm.overtime_amount) + Number(settlementForm.bonuses_amount) + Number(settlementForm.commissions_amount)
      const deds = Number(settlementForm.health_deduction) + Number(settlementForm.pension_deduction) + Number(settlementForm.solidarity_fund_deduction) + Number(settlementForm.withholding_tax) + Number(settlementForm.other_deductions)
      const net = gross - deds

      const { error } = await supabase.from('payroll_settlements').insert({
        tenant_id: tenantId,
        period_start: settlementForm.period_start,
        period_end: settlementForm.period_end,
        period_type: settlementForm.period_type,
        contract_id: selContract.id,
        employee_name: selContract.employee_name,
        document_number: selContract.document_number,
        worked_days: Number(settlementForm.worked_days),
        base_salary: Number(settlementForm.base_salary),
        transport_allowance: Number(settlementForm.transport_allowance),
        overtime_amount: Number(settlementForm.overtime_amount),
        bonuses_amount: Number(settlementForm.bonuses_amount),
        commissions_amount: Number(settlementForm.commissions_amount),
        gross_earnings: gross,
        health_deduction: Number(settlementForm.health_deduction),
        pension_deduction: Number(settlementForm.pension_deduction),
        solidarity_fund_deduction: Number(settlementForm.solidarity_fund_deduction),
        withholding_tax: Number(settlementForm.withholding_tax),
        other_deductions: Number(settlementForm.other_deductions),
        total_deductions: deds,
        net_pay: net,
        status: 'draft',
        notes: settlementForm.notes.trim() || null
      })

      if (error) throw error

      setShowSettlementModal(false)
      await loadPayrollData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar liquidación')
    } finally {
      setSubmitting(false)
    }
  }

  // Emit to DIAN
  async function handleEmitToDIAN(settlementId: string) {
    setEmittingId(settlementId)
    try {
      const res = await fetch('/api/dian/payroll/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al emitir a la DIAN')

      alert(`¡Nómina Electrónica Timbrada con Éxito!\n\nConsecutivo: ${data.consecutive}\nCUNE: ${data.cune.slice(0, 32)}...\nEstado: Emitido exitosamente`)
      await loadPayrollData()
    } catch (err: any) {
      alert(err.message || 'Error al conectar con la DIAN')
    } finally {
      setEmittingId(null)
    }
  }

  // Seed Demo Data
  async function handleSeedPayrollDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Contracts
      const { data: createdContracts } = await supabase.from('payroll_contracts').insert([
        {
          tenant_id: tenantId,
          employee_name: 'Carlos Alberto Gómez',
          document_type: 'CC',
          document_number: '1020304050',
          email: 'carlos.gomez@empresa.com',
          phone: '3109876543',
          contract_type: 'indefinido',
          salary_type: 'ordinario',
          base_salary: 1600000,
          has_transport_allowance: true,
          transport_allowance: 162000,
          payment_frequency: 'quincenal',
          bank_name: 'Bancolombia',
          bank_account_type: 'ahorros',
          bank_account_number: '458-920192-12',
          start_date: '2024-01-15',
          status: 'active'
        },
        {
          tenant_id: tenantId,
          employee_name: 'María Fernanda Rojas',
          document_type: 'CC',
          document_number: '1030405060',
          email: 'maria.rojas@empresa.com',
          phone: '3151234567',
          contract_type: 'indefinido',
          salary_type: 'ordinario',
          base_salary: 2200000,
          has_transport_allowance: true,
          transport_allowance: 162000,
          payment_frequency: 'quincenal',
          bank_name: 'Davivienda',
          bank_account_type: 'ahorros',
          bank_account_number: '004-889123-99',
          start_date: '2024-03-01',
          status: 'active'
        },
        {
          tenant_id: tenantId,
          employee_name: 'Andrés Felipe Morales',
          document_type: 'CC',
          document_number: '1040506070',
          email: 'andres.morales@empresa.com',
          phone: '3187654321',
          contract_type: 'fijo',
          salary_type: 'ordinario',
          base_salary: 1300000,
          has_transport_allowance: true,
          transport_allowance: 162000,
          payment_frequency: 'quincenal',
          bank_name: 'Nequi',
          bank_account_type: 'ahorros',
          bank_account_number: '3187654321',
          start_date: '2024-06-01',
          status: 'active'
        }
      ]).select()

      const c1 = createdContracts?.[0]
      const c2 = createdContracts?.[1]

      // 2. Settlements
      if (c1 && c2) {
        await supabase.from('payroll_settlements').insert([
          {
            tenant_id: tenantId,
            period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            period_end: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
            period_type: 'quincenal',
            contract_id: c1.id,
            employee_name: c1.employee_name,
            document_number: c1.document_number,
            worked_days: 15,
            base_salary: 800000,
            transport_allowance: 81000,
            overtime_amount: 45000,
            bonuses_amount: 0,
            commissions_amount: 0,
            gross_earnings: 926000,
            health_deduction: 32000,
            pension_deduction: 32000,
            solidarity_fund_deduction: 0,
            withholding_tax: 0,
            other_deductions: 0,
            total_deductions: 64000,
            net_pay: 862000,
            status: 'draft',
            notes: 'Liquidación 1ra Quincena'
          },
          {
            tenant_id: tenantId,
            period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            period_end: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
            period_type: 'quincenal',
            contract_id: c2.id,
            employee_name: c2.employee_name,
            document_number: c2.document_number,
            worked_days: 15,
            base_salary: 1100000,
            transport_allowance: 81000,
            overtime_amount: 0,
            bonuses_amount: 150000,
            commissions_amount: 0,
            gross_earnings: 1331000,
            health_deduction: 44000,
            pension_deduction: 44000,
            solidarity_fund_deduction: 0,
            withholding_tax: 0,
            other_deductions: 0,
            total_deductions: 88000,
            net_pay: 1243000,
            status: 'draft',
            notes: 'Liquidación 1ra Quincena con bonificación'
          }
        ])
      }

      await loadPayrollData()
    } catch (err: any) {
      alert('Error cargando demo de nómina: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Payslip
  function getWhatsAppPayslipUrl(settlement: PayrollSettlement) {
    const contract = settlement.payroll_contracts || contracts.find(c => c.id === settlement.contract_id)
    const phone = (contract?.phone || '').replace(/\D/g, '')
    const text = encodeURIComponent(
      `¡Hola ${settlement.employee_name}! 📄 Tu desprendible de nómina está listo:\n\n` +
      `• *Periodo:* ${formatDate(settlement.period_start)} al ${formatDate(settlement.period_end)}\n` +
      `• *Días trabajados:* ${settlement.worked_days}\n` +
      `• *Sueldo básico:* ${formatCurrency(Number(settlement.base_salary))}\n` +
      (Number(settlement.transport_allowance) > 0 ? `• *Aux. Transporte:* ${formatCurrency(Number(settlement.transport_allowance))}\n` : '') +
      (Number(settlement.overtime_amount) > 0 ? `• *Horas Extras:* ${formatCurrency(Number(settlement.overtime_amount))}\n` : '') +
      (Number(settlement.bonuses_amount) > 0 ? `• *Bonificaciones:* ${formatCurrency(Number(settlement.bonuses_amount))}\n` : '') +
      `• *Total Devengado:* ${formatCurrency(Number(settlement.gross_earnings))}\n\n` +
      `*Deducciones de Ley:*\n` +
      `• Salud (4%): -${formatCurrency(Number(settlement.health_deduction))}\n` +
      `• Pensión (4%): -${formatCurrency(Number(settlement.pension_deduction))}\n` +
      `• Total Deducciones: -${formatCurrency(Number(settlement.total_deductions))}\n\n` +
      `💰 *NETO A PAGAR:* ${formatCurrency(Number(settlement.net_pay))}\n\n` +
      `Cuenta de Abono: ${contract?.bank_name || 'Bancolombia'} (${contract?.bank_account_number || 'N/A'})\n` +
      `Mr. Tender Nómina Electrónica DIAN ✅`
    )
    return `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${text}`
  }

  // Filtered settlements
  const filteredSettlements = settlements.filter(s => {
    const matchQ = s.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.document_number.includes(searchQuery)
    return matchQ
  })

  // KPIs
  const totalPayrollCost = settlements.reduce((acc, s) => acc + Number(s.net_pay), 0)
  const totalEmittedDian = settlements.filter(s => s.status === 'emitted_dian').length
  const activeContractsCount = contracts.filter(c => c.status === 'active').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Briefcase size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Nómina Electrónica DIAN & RRHH
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Liquidación de salarios, deducciones de ley (salud/pensión 4%), timbrado de Nómina Electrónica ante la DIAN y colillas por WhatsApp
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadPayrollData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {contracts.length === 0 && (
            <button onClick={handleSeedPayrollDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Empleados Demo
            </button>
          )}
          {activeTab === 'contracts' ? (
            <button onClick={() => setShowContractModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Nuevo Contrato / Empleado</span>
            </button>
          ) : (
            <button onClick={() => setShowSettlementModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Liquidar Nómina</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards - Monochrome */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Empleados Activos
            </span>
            <Users size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {activeContractsCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Contratos vigentes
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Nómina Liquidada
            </span>
            <DollarSign size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {formatCurrency(totalPayrollCost)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Neto total a pagar
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Timbradas DIAN
            </span>
            <ShieldCheck size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {totalEmittedDian} / {settlements.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Documentos electrónicos con CUNE
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Monochrome */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('settlements')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'settlements' ? 700 : 500,
            background: activeTab === 'settlements' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'settlements' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Receipt size={15} strokeWidth={2} />
          <span>Liquidaciones de Nómina ({settlements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('electronic')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'electronic' ? 700 : 500,
            background: activeTab === 'electronic' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'electronic' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={15} strokeWidth={2} />
          <span>Nómina Electrónica DIAN</span>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'contracts' ? 700 : 500,
            background: activeTab === 'contracts' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'contracts' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Users size={15} strokeWidth={2} />
          <span>Empleados & Contratos ({contracts.length})</span>
        </button>
      </div>

      {/* ── TAB 1: LIQUIDACIONES DE NÓMINA ── */}
      {activeTab === 'settlements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search Bar */}
          <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, padding: '6px 12px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por empleado o cédula..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            />
          </div>

          {filteredSettlements.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Receipt size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay liquidaciones de nómina registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Genera liquidaciones quincenales o mensuales con cálculo automático de aportes de ley.
              </p>
              <button onClick={() => setShowSettlementModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Liquidar Primera Nómina
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {filteredSettlements.map(set => {
                const isEmitted = set.status === 'emitted_dian'
                const elecDoc = set.payroll_electronic_documents?.[0]

                return (
                  <div key={set.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{set.employee_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          CC: {set.document_number} • {set.worked_days} días laborados
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          Periodo: {formatDate(set.period_start)} al {formatDate(set.period_end)}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}>
                        {isEmitted ? 'Timbrada DIAN ✅' : set.status === 'approved' ? 'Aprobada' : 'Borrador'}
                      </span>
                    </div>

                    {/* Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Devengado Total</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(set.gross_earnings))}</strong>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Básico: {formatCurrency(Number(set.base_salary))}
                        </div>
                        {Number(set.transport_allowance) > 0 && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Aux. Transp: {formatCurrency(Number(set.transport_allowance))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Deducciones Ley</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>-{formatCurrency(Number(set.total_deductions))}</span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Salud 4%: -{formatCurrency(Number(set.health_deduction))}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Pensión 4%: -{formatCurrency(Number(set.pension_deduction))}
                        </div>
                      </div>
                    </div>

                    {/* Net Pay */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Neto a Pagar:</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{formatCurrency(Number(set.net_pay))}</strong>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      {!isEmitted ? (
                        <button
                          onClick={() => handleEmitToDIAN(set.id)}
                          disabled={emittingId === set.id}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <Send size={13} />
                          <span>{emittingId === set.id ? 'Timbrando DIAN...' : 'Emitir a la DIAN'}</span>
                        </button>
                      ) : (
                        <div style={{ flex: 1, fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={14} />
                          <span>CUNE: {elecDoc?.cune.slice(0, 16)}...</span>
                        </div>
                      )}

                      <a
                        href={getWhatsAppPayslipUrl(set)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-neu btn-ghost"
                        title="Enviar colilla de nómina por WhatsApp al empleado"
                        style={{ padding: '7px 10px' }}
                      >
                        <MessageSquare size={14} strokeWidth={2} />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: NÓMINA ELECTRÓNICA DIAN ── */}
      {activeTab === 'electronic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Documentos Soporte de Pago de Nómina Electrónica
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Transmisión oficial de XML UBL 2.1 con Código Único de Nómina Electrónica (CUNE) ante los servidores de la DIAN.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Consecutivo</th>
                    <th style={{ padding: '8px 10px' }}>Empleado</th>
                    <th style={{ padding: '8px 10px' }}>Documento</th>
                    <th style={{ padding: '8px 10px' }}>Devengado</th>
                    <th style={{ padding: '8px 10px' }}>Neto Pagado</th>
                    <th style={{ padding: '8px 10px' }}>CUNE DIAN</th>
                    <th style={{ padding: '8px 10px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.filter(s => s.status === 'emitted_dian').length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                        No hay nóminas timbradas electrónicamente aún.
                      </td>
                    </tr>
                  ) : (
                    settlements.filter(s => s.status === 'emitted_dian').map(s => {
                      const doc = s.payroll_electronic_documents?.[0]
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{doc?.consecutive_number || 'NOM-001'}</td>
                          <td style={{ padding: '8px 10px' }}>{s.employee_name}</td>
                          <td style={{ padding: '8px 10px' }}>{s.document_number}</td>
                          <td style={{ padding: '8px 10px' }}>{formatCurrency(Number(s.gross_earnings))}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{formatCurrency(Number(s.net_pay))}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {doc?.cune ? `${doc.cune.slice(0, 18)}...` : 'Validado'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                              Aceptado DIAN ✅
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CONTRATOS & EMPLEADOS ── */}
      {activeTab === 'contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {contracts.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Users size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay contratos registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra los contratos de tus colaboradores para automatizar las liquidaciones de nómina.
              </p>
              <button onClick={() => setShowContractModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Crear Primer Contrato
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {contracts.map(c => (
                <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.employee_name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.document_type}: {c.document_number}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)', textTransform: 'capitalize' }}>
                      {c.contract_type}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-deep)', padding: 8, borderRadius: 6, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Salario Base: </span>
                      <strong>{formatCurrency(Number(c.base_salary))}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Aux. Transporte: </span>
                      <span>{c.has_transport_allowance ? formatCurrency(Number(c.transport_allowance)) : 'No aplica'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Frecuencia: </span>
                      <span style={{ textTransform: 'capitalize' }}>{c.payment_frequency}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Banco: </span>
                      <span>{c.bank_name || 'Bancolombia'} ({c.bank_account_number || 'Sin cuenta'})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: NUEVO CONTRATO LABORAL ── */}
      {showContractModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Nuevo Contrato Laboral</h3>
              <button onClick={() => setShowContractModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Completo del Empleado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Alberto Gómez"
                  className="input-neu"
                  value={contractForm.employee_name}
                  onChange={e => setContractForm(f => ({ ...f, employee_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo Doc.</label>
                  <select
                    className="input-neu"
                    value={contractForm.document_type}
                    onChange={e => setContractForm(f => ({ ...f, document_type: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="CC">Cédula (CC)</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="PEP">PEP</option>
                    <option value="PPT">PPT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Número de Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1020304050"
                    className="input-neu"
                    value={contractForm.document_number}
                    onChange={e => setContractForm(f => ({ ...f, document_number: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 3109876543"
                    className="input-neu"
                    value={contractForm.phone}
                    onChange={e => setContractForm(f => ({ ...f, phone: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="empleado@empresa.com"
                    className="input-neu"
                    value={contractForm.email}
                    onChange={e => setContractForm(f => ({ ...f, email: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Salario Base Mensual ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-neu"
                    value={contractForm.base_salary}
                    onChange={e => setContractForm(f => ({ ...f, base_salary: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Periodicidad de Pago</label>
                  <select
                    className="input-neu"
                    value={contractForm.payment_frequency}
                    onChange={e => setContractForm(f => ({ ...f, payment_frequency: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Banco</label>
                  <input
                    type="text"
                    placeholder="Bancolombia, Nequi, Davivienda"
                    className="input-neu"
                    value={contractForm.bank_name}
                    onChange={e => setContractForm(f => ({ ...f, bank_name: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Número de Cuenta</label>
                  <input
                    type="text"
                    placeholder="Número de cuenta o celular"
                    className="input-neu"
                    value={contractForm.bank_account_number}
                    onChange={e => setContractForm(f => ({ ...f, bank_account_number: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowContractModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Crear Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LIQUIDAR NÓMINA ── */}
      {showSettlementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 540, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Liquidar Periodo de Nómina</h3>
              <button onClick={() => setShowSettlementModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSettlement} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Seleccionar Empleado *</label>
                <select
                  required
                  className="input-neu"
                  value={settlementForm.contract_id}
                  onChange={e => {
                    const cId = e.target.value
                    const c = contracts.find(item => item.id === cId)
                    if (c) {
                      const isQuincenal = c.payment_frequency === 'quincenal'
                      const base = isQuincenal ? Number(c.base_salary) / 2 : Number(c.base_salary)
                      const aux = c.has_transport_allowance ? (isQuincenal ? Number(c.transport_allowance) / 2 : Number(c.transport_allowance)) : 0
                      const health = Math.round(base * 0.04)
                      const pension = Math.round(base * 0.04)
                      setSettlementForm(f => ({
                        ...f,
                        contract_id: cId,
                        period_type: c.payment_frequency,
                        worked_days: isQuincenal ? 15 : 30,
                        base_salary: base,
                        transport_allowance: aux,
                        health_deduction: health,
                        pension_deduction: pension
                      }))
                    } else {
                      setSettlementForm(f => ({ ...f, contract_id: cId }))
                    }
                  }}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                >
                  <option value="">-- Seleccionar colaborador --</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.employee_name} ({c.document_number})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Inicio Periodo</label>
                  <input
                    type="date"
                    required
                    className="input-neu"
                    value={settlementForm.period_start}
                    onChange={e => setSettlementForm(f => ({ ...f, period_start: e.target.value }))}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fin Periodo</label>
                  <input
                    type="date"
                    required
                    className="input-neu"
                    value={settlementForm.period_end}
                    onChange={e => setSettlementForm(f => ({ ...f, period_end: e.target.value }))}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Días Trab.</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="30"
                    className="input-neu"
                    value={settlementForm.worked_days}
                    onChange={e => setSettlementForm(f => ({ ...f, worked_days: Number(e.target.value) }))}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
              </div>

              {/* Devengados */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Devengados (Ingresos)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Sueldo Básico</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={settlementForm.base_salary}
                      onChange={e => {
                        const b = Number(e.target.value)
                        setSettlementForm(f => ({
                          ...f,
                          base_salary: b,
                          health_deduction: Math.round(b * 0.04),
                          pension_deduction: Math.round(b * 0.04)
                        }))
                      }}
                      style={{ fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Auxilio Transporte</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={settlementForm.transport_allowance}
                      onChange={e => setSettlementForm(f => ({ ...f, transport_allowance: Number(e.target.value) }))}
                      style={{ fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Horas Extras / Recargos</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={settlementForm.overtime_amount}
                      onChange={e => setSettlementForm(f => ({ ...f, overtime_amount: Number(e.target.value) }))}
                      style={{ fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bonificaciones / Comisiones</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={settlementForm.bonuses_amount}
                      onChange={e => setSettlementForm(f => ({ ...f, bonuses_amount: Number(e.target.value) }))}
                      style={{ fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Deducciones */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Deducciones de Ley</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Aporte Salud (4%)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={settlementForm.health_deduction}
                      onChange={e => setSettlementForm(f => ({ ...f, health_deduction: Number(e.target.value) }))}
                      style={{ fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Aporte Pensión (4%)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={settlementForm.pension_deduction}
                      onChange={e => setSettlementForm(f => ({ ...f, pension_deduction: Number(e.target.value) }))}
                      style={{ fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowSettlementModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Guardar Liquidación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
