'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { generateDianInvoicePdfA4, generateDianInvoicePdfPos } from '@/lib/dian/pdf-dian'
import { getDianVerificationUrl } from '@/lib/dian/qr'
import {
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Copy,
  Send,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building,
  Key,
  Layers,
  Check
} from 'lucide-react'

export default function InvoicesPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'invoices' | 'resolutions' | 'testset' | 'new_invoice'>('invoices')
  const [invoices, setInvoices] = useState<any[]>([])
  const [resolutions, setResolutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [copiedCufe, setCopiedCufe] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string>('')
  const [tenantSettings, setTenantSettings] = useState<any>(null)

  // Credit Note Modal State
  const [selectedInvoiceForNc, setSelectedInvoiceForNc] = useState<any>(null)
  const [ncReason, setNcReason] = useState('Anulación de factura electrónica')
  const [ncCode, setNcCode] = useState<'1' | '2' | '3' | '4' | '5'>('2')
  const [emittingNc, setEmittingNc] = useState(false)

  // Test Set Runner State
  const [testSetId, setTestSetId] = useState('')
  const [testSetRunning, setTestSetRunning] = useState(false)
  const [testSetResult, setTestSetResult] = useState<any>(null)

  // Manual Invoice Form State
  const [manualForm, setManualForm] = useState({
    customerName: 'Consumidor Final',
    customerId: '222222222222',
    idType: '13',
    personType: '2',
    regime: '49',
    email: '',
    phone: '',
    address: 'Mostrador',
    paymentMethod: 'cash',
    notes: 'Factura manual',
    items: [
      { name: 'Servicio / Producto General', quantity: 1, unitPrice: 50000, taxRate: 19 }
    ]
  })
  const [emittingManual, setEmittingManual] = useState(false)

  // Resolution Form Modal State
  const [showResModal, setShowResModal] = useState(false)
  const [resForm, setResForm] = useState({
    resolutionNumber: '18760000001',
    prefix: 'SETP',
    fromNumber: 1,
    toNumber: 5000,
    currentNumber: 1,
    validFrom: '2026-01-01',
    validTo: '2027-12-31',
    technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
    environment: '2',
    documentType: '01'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      // 1. Fetch tenant settings
      const { data: tSet } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tid)
        .limit(1)
        .maybeSingle()
      setTenantSettings(tSet)
      if (tSet?.dian_software_id) {
        setTestSetId(tSet.dian_software_id)
      }

      // 2. Fetch invoices
      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tid)
        .order('issued_at', { ascending: false })

      if (!invErr && invData) {
        setInvoices(invData)
      }

      // 3. Fetch resolutions
      const { data: resData, error: resErr } = await supabase
        .from('dian_resolutions')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (!resErr && resData) {
        setResolutions(resData)
      }
    } catch (err) {
      console.error('Error loading DIAN invoices data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle CUFE copy
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedCufe(text)
    setTimeout(() => setCopiedCufe(null), 2500)
  }

  // Trigger A4 PDF Generation
  async function handleDownloadA4(inv: any) {
    const payload = {
      documentType: inv.invoice_type || '01',
      number: inv.number,
      prefix: inv.series || 'FE',
      folio: inv.folio || 1,
      issueDate: inv.issued_at ? inv.issued_at.split('T')[0] : new Date().toISOString().split('T')[0],
      issueTime: inv.issued_at ? inv.issued_at.split('T')[1]?.slice(0, 8) + '-05:00' : '10:00:00-05:00',
      currency: 'COP',
      environment: inv.dian_environment || '2',
      resolution: {
        resolutionNumber: inv.resolution_number || tenantSettings?.dian_resolution || '18760000001',
        prefix: inv.series || 'FE',
        fromNumber: 1,
        toNumber: 50000,
        currentNumber: inv.folio || 1,
        validFrom: '2026-01-01',
        validTo: '2027-12-31',
        technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
        environment: inv.dian_environment || '2'
      },
      emisor: {
        nit: tenantSettings?.tax_id ? tenantSettings.tax_id.replace(/\D/g, '') : '901234567',
        dv: '1',
        businessName: tenantSettings?.business_name || 'MR TENDER S.A.S.',
        regime: (tenantSettings?.dian_regimen?.includes('No') ? '49' : '48') as any,
        personType: '1' as any,
        idType: '31' as any,
        email: tenantSettings?.email || 'facturacion@mrtender.com',
        phone: tenantSettings?.phone || '3001234567',
        address: tenantSettings?.address || 'Calle 100 # 15-20',
        city: tenantSettings?.city || 'Bogotá',
        state: tenantSettings?.state || 'Bogotá D.C.',
        country: 'Colombia'
      },
      adquiriente: inv.customer_tax_data || {
        id: '222222222222',
        idType: '13',
        name: 'Consumidor Final',
        personType: '2',
        regime: '49',
        city: 'Bogotá',
        address: 'Mostrador'
      },
      paymentMeans: {
        code: '10' as any,
        name: 'Efectivo / Transferencia',
        isCredit: false
      },
      items: inv.items || [
        {
          id: '1',
          sku: 'SKU-01',
          name: 'Venta de productos/servicios',
          quantity: 1,
          unitCode: 'EA',
          unitPrice: Number(inv.subtotal),
          subtotal: Number(inv.subtotal),
          taxes: [
            { taxCode: '01' as any, taxName: 'IVA', taxRate: 19, taxableAmount: Number(inv.subtotal), taxAmount: Number(inv.tax_amount) }
          ],
          total: Number(inv.total)
        }
      ],
      totals: {
        lineExtensionAmount: Number(inv.subtotal),
        taxExclusiveAmount: Number(inv.subtotal),
        taxInclusiveAmount: Number(inv.total),
        allowanceTotalAmount: 0,
        payableAmount: Number(inv.total),
        taxBreakdown: {
          iva19: { base: Number(inv.subtotal), tax: Number(inv.tax_amount) },
          iva5: { base: 0, tax: 0 },
          iva0: { base: 0, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax: Number(inv.tax_amount)
        }
      }
    }

    await generateDianInvoicePdfA4(
      payload as any,
      inv.cufe || inv.cude || inv.uuid_fiscal || '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      inv.qr_data || '',
      inv.dian_status === 'validated' ? 'Validada por la DIAN (Aprobada)' : 'Documento Electrónico DIAN'
    )
  }

  // Trigger POS 80mm PDF Generation
  async function handleDownloadPos(inv: any) {
    const payload = {
      documentType: inv.invoice_type || '01',
      number: inv.number,
      prefix: inv.series || 'FE',
      folio: inv.folio || 1,
      issueDate: inv.issued_at ? inv.issued_at.split('T')[0] : new Date().toISOString().split('T')[0],
      issueTime: inv.issued_at ? inv.issued_at.split('T')[1]?.slice(0, 8) + '-05:00' : '10:00:00-05:00',
      currency: 'COP',
      environment: inv.dian_environment || '2',
      resolution: {
        resolutionNumber: inv.resolution_number || tenantSettings?.dian_resolution || '18760000001',
        prefix: inv.series || 'FE',
        fromNumber: 1,
        toNumber: 50000,
        currentNumber: inv.folio || 1,
        validFrom: '2026-01-01',
        validTo: '2027-12-31',
        technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
        environment: inv.dian_environment || '2'
      },
      emisor: {
        nit: tenantSettings?.tax_id ? tenantSettings.tax_id.replace(/\D/g, '') : '901234567',
        dv: '1',
        businessName: tenantSettings?.business_name || 'MR TENDER',
        regime: '48' as any,
        personType: '1' as any,
        idType: '31' as any,
        email: tenantSettings?.email || 'facturacion@mrtender.com',
        phone: tenantSettings?.phone || '3001234567',
        address: tenantSettings?.address || 'Colombia',
        city: 'Bogotá',
        state: 'Bogotá D.C.',
        country: 'Colombia'
      },
      adquiriente: inv.customer_tax_data || {
        id: '222222222222',
        name: 'Consumidor Final'
      },
      paymentMeans: { code: '10' as any, name: 'Efectivo', isCredit: false },
      items: inv.items || [{ name: 'Venta', quantity: 1, unitPrice: Number(inv.subtotal), total: Number(inv.total) }],
      totals: {
        taxExclusiveAmount: Number(inv.subtotal),
        payableAmount: Number(inv.total),
        taxBreakdown: { totalTax: Number(inv.tax_amount) }
      }
    }

    await generateDianInvoicePdfPos(
      payload as any,
      inv.cufe || inv.cude || inv.uuid_fiscal || '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      inv.qr_data || ''
    )
  }

  // Trigger XML Download
  function handleDownloadXml(inv: any) {
    window.open(`/api/dian/download/${inv.id}?format=xml`, '_blank')
  }

  // WhatsApp Share
  function handleShareWhatsApp(inv: any) {
    const cufe = inv.cufe || inv.cude || ''
    const dianUrl = getDianVerificationUrl(cufe, inv.dian_environment || '2')
    const phone = inv.customer_tax_data?.phone?.replace(/\D/g, '') || ''
    const msg = `*FACTURA ELECTRÓNICA DIAN — ${tenantSettings?.business_name || 'MR TENDER'}*
Folio: *${inv.number}*
Fecha: ${new Date(inv.issued_at).toLocaleString('es-CO')}
Total: *${formatCurrency(Number(inv.total))}*
Estado DIAN: *${inv.dian_status === 'validated' ? 'Validada y Aprobada' : 'Emitida'}*

Consulta tu factura en el catálogo oficial de la DIAN:
${dianUrl}

¡Gracias por tu confianza!`

    const targetPhone = phone.length === 10 ? '57' + phone : phone
    if (targetPhone) {
      window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  // Emit Credit Note
  async function handleEmitCreditNote() {
    if (!selectedInvoiceForNc) return
    setEmittingNc(true)
    try {
      const res = await fetch('/api/dian/credit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceForNc.id,
          discrepancyCode: ncCode,
          reason: ncReason
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al emitir la nota crédito')

      alert(`Nota Crédito ${data.creditNote?.number} emitida con éxito ante la DIAN (CUDE: ${data.cude?.slice(0, 16)}...)`)
      setSelectedInvoiceForNc(null)
      loadData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEmittingNc(false)
    }
  }

  // Run Test Set
  async function handleRunTestSet() {
    if (!testSetId.trim()) {
      alert('Por favor ingresa el TestSetId obtenido en el portal DIAN Habilitación')
      return
    }
    setTestSetRunning(true)
    setTestSetResult(null)
    try {
      const res = await fetch('/api/dian/test-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testSetId: testSetId.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error ejecutando set de pruebas')

      setTestSetResult(data.result)
      loadData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setTestSetRunning(false)
    }
  }

  // Create Resolution
  async function handleCreateResolution(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    try {
      const { error } = await supabase.from('dian_resolutions').insert([{
        tenant_id: tenantId,
        resolution_number: resForm.resolutionNumber,
        prefix: resForm.prefix,
        from_number: Number(resForm.fromNumber),
        to_number: Number(resForm.toNumber),
        current_number: Number(resForm.currentNumber),
        valid_from: resForm.validFrom,
        valid_to: resForm.validTo,
        technical_key: resForm.technicalKey,
        environment: resForm.environment,
        document_type: resForm.documentType,
        is_active: true
      }])

      if (error) throw error
      setShowResModal(false)
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Manual Invoice Creation
  async function handleEmitManualInvoice(e: React.FormEvent) {
    e.preventDefault()
    setEmittingManual(true)
    try {
      const res = await fetch('/api/dian/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customCustomer: {
            id: manualForm.customerId,
            idType: manualForm.idType,
            personType: manualForm.personType,
            regime: manualForm.regime,
            name: manualForm.customerName,
            email: manualForm.email,
            phone: manualForm.phone,
            address: manualForm.address
          },
          customItems: manualForm.items.map(it => ({
            name: it.name,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate),
            taxAmount: (Number(it.unitPrice) * Number(it.quantity) * Number(it.taxRate)) / 100,
            subtotal: Number(it.unitPrice) * Number(it.quantity),
            total: (Number(it.unitPrice) * Number(it.quantity)) * (1 + Number(it.taxRate) / 100)
          })),
          paymentMethod: manualForm.paymentMethod,
          notes: manualForm.notes
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al emitir factura manual')

      alert(`Factura ${data.invoice?.number} emitida con éxito ante la DIAN! (CUFE: ${data.cufe?.slice(0, 16)}...)`)
      setActiveTab('invoices')
      loadData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEmittingManual(false)
    }
  }

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch =
      inv.number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.cufe?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_tax_data?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_tax_data?.id?.includes(search)

    if (statusFilter === 'all') return matchSearch
    if (statusFilter === 'validated') return matchSearch && inv.dian_status === 'validated'
    if (statusFilter === 'credit_note') return matchSearch && inv.invoice_type === '91'
    if (statusFilter === 'pending') return matchSearch && (inv.dian_status === 'pending' || inv.dian_status === 'contingency')
    return matchSearch
  })

  // KPIs
  const totalInvoiced = invoices.filter(i => i.invoice_type === '01' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.total || 0), 0)
  const validatedCount = invoices.filter(i => i.dian_status === 'validated').length
  const creditNotesCount = invoices.filter(i => i.invoice_type === '91').length
  const pendingCount = invoices.filter(i => i.dian_status === 'pending' || i.dian_status === 'contingency').length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', minHeight: '90vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#fff', padding: 10, borderRadius: 12, display: 'flex' }}>
              <Receipt size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Facturación Electrónica DIAN</h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Emisión, gestión UBL 2.1, CUFE/CUDE, QR y validación previa ante la DIAN (Colombia)
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--surface-muted, #F1F5F9)', padding: 4, borderRadius: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeTab === 'invoices' ? '#fff' : 'transparent',
              color: activeTab === 'invoices' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'invoices' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Facturas Emitidas
          </button>
          <button
            onClick={() => setActiveTab('new_invoice')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeTab === 'new_invoice' ? '#fff' : 'transparent',
              color: activeTab === 'new_invoice' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'new_invoice' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            + Emitir Factura
          </button>
          <button
            onClick={() => setActiveTab('resolutions')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeTab === 'resolutions' ? '#fff' : 'transparent',
              color: activeTab === 'resolutions' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'resolutions' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Resoluciones DIAN
          </button>
          <button
            onClick={() => setActiveTab('testset')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeTab === 'testset' ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)' : 'transparent',
              color: activeTab === 'testset' ? '#fff' : '#64748B',
              boxShadow: activeTab === 'testset' ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Sparkles size={14} />
            Habilitación DIAN
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="neu-card" style={{ padding: 18, borderRadius: 14, background: '#fff', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>TOTAL FACTURADO</span>
            <Building size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 8, color: '#0F172A' }}>
            {formatCurrency(totalInvoiced)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>
            {invoices.filter(i => i.invoice_type === '01').length} facturas emitidas
          </div>
        </div>

        <div className="neu-card" style={{ padding: 18, borderRadius: 14, background: '#fff', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>VALIDADAS DIAN</span>
            <CheckCircle2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 8, color: '#10B981' }}>
            {validatedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
            ApplicationResponse 00 Aprobado
          </div>
        </div>

        <div className="neu-card" style={{ padding: 18, borderRadius: 14, background: '#fff', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>NOTAS CRÉDITO</span>
            <FileText size={18} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 8, color: '#8B5CF6' }}>
            {creditNotesCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
            Anulaciones y devoluciones UBL
          </div>
        </div>

        <div className="neu-card" style={{ padding: 18, borderRadius: 14, background: '#fff', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>PENDIENTES / CONTINGENCIA</span>
            <Clock size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 8, color: '#F59E0B' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
            Reintentos automáticos
          </div>
        </div>
      </div>

      {/* TAB: Invoices List */}
      {activeTab === 'invoices' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Buscar por N° Factura, Cliente, NIT o CUFE..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: '0.88rem',
                background: '#fff',
                color: '#334155'
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="validated">Solo Validadas DIAN</option>
              <option value="credit_note">Notas Crédito (Tipo 91)</option>
              <option value="pending">Pendientes / Contingencia</option>
            </select>

            <button
              onClick={loadData}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>

          {/* Table */}
          <div className="neu-card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>DOCUMENTO</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>FECHA</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>CLIENTE (ADQUIRIENTE)</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>TOTAL</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>ESTADO DIAN</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>CUFE / CUDE</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                        Cargando facturas electrónicas...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                        No se encontraron facturas emitidas. ¡Emite tu primera factura desde el Punto de Venta o el botón "+ Emitir Factura"!
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const isCreditNote = inv.invoice_type === '91'
                      const isValidated = inv.dian_status === 'validated'
                      const cufe = inv.cufe || inv.cude || inv.uuid_fiscal || ''
                      const customer = inv.customer_tax_data || {}

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                          
                          {/* Document Number & Type */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{inv.number}</div>
                            <div style={{ fontSize: '0.72rem', color: isCreditNote ? '#8B5CF6' : '#0284C7', fontWeight: 600 }}>
                              {isCreditNote ? 'Nota Crédito (91)' : 'Factura Electrónica (01)'}
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '14px 16px', color: '#64748B' }}>
                            <div>{new Date(inv.issued_at || inv.created_at).toLocaleDateString('es-CO')}</div>
                            <div style={{ fontSize: '0.72rem' }}>{new Date(inv.issued_at || inv.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>

                          {/* Customer */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#1E293B' }}>{customer.name || 'Consumidor Final'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>NIT/CC: {customer.id || '222222222222'}</div>
                          </td>

                          {/* Total */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 800, color: isCreditNote ? '#DC2626' : '#0F172A' }}>
                              {isCreditNote ? '-' : ''}{formatCurrency(Number(inv.total))}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              IVA: {formatCurrency(Number(inv.tax_amount || 0))}
                            </div>
                          </td>

                          {/* DIAN Status */}
                          <td style={{ padding: '14px 16px' }}>
                            {inv.status === 'cancelled' ? (
                              <span style={{ background: '#F1F5F9', color: '#64748B', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                                Anulada (NC)
                              </span>
                            ) : isValidated ? (
                              <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={12} /> Validada DIAN
                              </span>
                            ) : (
                              <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> En Contingencia
                              </span>
                            )}
                          </td>

                          {/* CUFE */}
                          <td style={{ padding: '14px 16px' }}>
                            {cufe ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: '#F8FAFC', padding: '2px 6px', borderRadius: 4, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid #E2E8F0' }}>
                                  {cufe}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(cufe)}
                                  title="Copiar CUFE completo"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copiedCufe === cufe ? '#10B981' : '#64748B' }}
                                >
                                  {copiedCufe === cufe ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <a
                                  href={getDianVerificationUrl(cufe, inv.dian_environment || '2')}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Consultar en catálogo DIAN"
                                  style={{ color: '#0284C7' }}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>N/A</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => handleDownloadA4(inv)}
                                title="Descargar PDF Oficial A4"
                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}
                              >
                                <Download size={13} /> PDF
                              </button>

                              <button
                                onClick={() => handleDownloadPos(inv)}
                                title="Imprimir Tirilla POS 80mm"
                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}
                              >
                                POS
                              </button>

                              <button
                                onClick={() => handleDownloadXml(inv)}
                                title="Descargar XML UBL 2.1"
                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#0284C7' }}
                              >
                                XML
                              </button>

                              <button
                                onClick={() => handleShareWhatsApp(inv)}
                                title="Enviar por WhatsApp con link DIAN"
                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #10B981', background: '#ECFDF5', cursor: 'pointer', color: '#059669' }}
                              >
                                <Send size={13} />
                              </button>

                              {!isCreditNote && inv.status !== 'cancelled' && (
                                <button
                                  onClick={() => setSelectedInvoiceForNc(inv)}
                                  title="Emitir Nota Crédito"
                                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}
                                >
                                  NC
                                </button>
                              )}
                            </div>
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

      {/* TAB: Manual Invoice Emission */}
      {activeTab === 'new_invoice' && (
        <div className="neu-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Receipt size={22} color="#0284C7" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Emitir Factura Electrónica de Venta (01)</h2>
          </div>

          <form onSubmit={handleEmitManualInvoice}>
            {/* Customer Info */}
            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#334155' }}>
                1. Datos del Adquiriente (Cliente)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.customerName}
                    onChange={e => setManualForm(f => ({ ...f, customerName: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>NIT / Cédula *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.customerId}
                    onChange={e => setManualForm(f => ({ ...f, customerId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Tipo de Documento</label>
                  <select
                    value={manualForm.idType}
                    onChange={e => setManualForm(f => ({ ...f, idType: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="13">Cédula de Ciudadanía (13)</option>
                    <option value="31">NIT (31)</option>
                    <option value="22">Cédula de Extranjería (22)</option>
                    <option value="41">Pasaporte (41)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Correo Electrónico (Recepción DIAN)</label>
                  <input
                    type="email"
                    placeholder="cliente@correo.com"
                    value={manualForm.email}
                    onChange={e => setManualForm(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  2. Detalle de Bienes y Servicios
                </div>
                <button
                  type="button"
                  onClick={() => setManualForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unitPrice: 0, taxRate: 19 }] }))}
                  style={{ background: '#0284C7', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Agregar Línea
                </button>
              </div>

              {manualForm.items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Descripción del ítem"
                    required
                    value={it.name}
                    onChange={e => {
                      const val = e.target.value
                      setManualForm(f => ({
                        ...f,
                        items: f.items.map((item, i) => i === idx ? { ...item, name: val } : item)
                      }))
                    }}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
                  />

                  <input
                    type="number"
                    min="1"
                    placeholder="Cant"
                    value={it.quantity}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setManualForm(f => ({
                        ...f,
                        items: f.items.map((item, i) => i === idx ? { ...item, quantity: val } : item)
                      }))
                    }}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
                  />

                  <input
                    type="number"
                    placeholder="Precio Unitario"
                    value={it.unitPrice}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setManualForm(f => ({
                        ...f,
                        items: f.items.map((item, i) => i === idx ? { ...item, unitPrice: val } : item)
                      }))
                    }}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
                  />

                  <select
                    value={it.taxRate}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setManualForm(f => ({
                        ...f,
                        items: f.items.map((item, i) => i === idx ? { ...item, taxRate: val } : item)
                      }))
                    }}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', background: '#fff' }}
                  >
                    <option value="19">IVA 19%</option>
                    <option value="5">IVA 5%</option>
                    <option value="0">0% Exento</option>
                  </select>

                  {manualForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setManualForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                      style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', padding: 8, borderRadius: 6, cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={emittingManual}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                  color: '#fff',
                  cursor: emittingManual ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {emittingManual ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {emittingManual ? 'Firmando y Transmitiendo DIAN...' : 'Emitir Factura Electrónica DIAN'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: Resolutions Manager */}
      {activeTab === 'resolutions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>Resoluciones de Facturación DIAN</h3>
            <button
              onClick={() => setShowResModal(true)}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#0284C7', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Plus size={16} /> Agregar Resolución
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {resolutions.map(res => (
              <div key={res.id} className="neu-card" style={{ background: '#fff', padding: 18, borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>Prefijo: {res.prefix}</span>
                  <span style={{ background: res.is_active ? '#ECFDF5' : '#F1F5F9', color: res.is_active ? '#059669' : '#64748B', padding: '3px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                    {res.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
                  <div><strong>Resolución N°:</strong> {res.resolution_number}</div>
                  <div><strong>Rango Autorizado:</strong> {res.from_number} al {res.to_number}</div>
                  <div><strong>Consecutivo Actual:</strong> {res.current_number}</div>
                  <div><strong>Vigencia:</strong> {res.valid_from} al {res.valid_to}</div>
                  <div><strong>Ambiente:</strong> {res.environment === '1' ? 'Producción' : 'Habilitación (Pruebas)'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DIAN Habilitation Test Set Runner */}
      {activeTab === 'testset' && (
        <div className="neu-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, maxWidth: 850, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', padding: 10, borderRadius: 12 }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Asistente de Habilitación DIAN</h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
                Pasa el Set de Pruebas obligatorio de la DIAN (8 Facturas + 1 Nota Crédito) en un solo clic.
              </p>
            </div>
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.85rem', marginBottom: 4 }}>
              ¿Cómo funciona la Habilitación DIAN?
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1E3A8A', lineHeight: 1.5 }}>
              1. Ingresa al portal DIAN Habilitación &gt; Registro y Participantes &gt; Configurar Modos de Operación.<br />
              2. Copia el <strong>TestSetId</strong> asignado por la DIAN para tu software.<br />
              3. Pégalo aquí abajo y presiona <strong>&quot;Iniciar Set de Pruebas Automático&quot;</strong>.<br />
              4. Mr Tender generará, firmará y transmitirá el lote completo requerido.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input
              type="text"
              placeholder="Ingresa tu TestSetId (Ej: 8b73f1a0-1234-4567-89ab-cdef01234567)"
              value={testSetId}
              onChange={e => setTestSetId(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
            />
            <button
              onClick={handleRunTestSet}
              disabled={testSetRunning}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                fontWeight: 700,
                cursor: testSetRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {testSetRunning ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {testSetRunning ? 'Emitiendo Set...' : 'Iniciar Set de Pruebas'}
            </button>
          </div>

          {/* Results Output */}
          {testSetResult && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, background: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: testSetResult.status === 'completed' ? '#10B981' : '#EF4444' }}>
                  {testSetResult.status === 'completed' ? '✓ SET DE PRUEBAS COMPLETADO Y APROBADO' : '✗ SET DE PRUEBAS FINALIZADO'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {testSetResult.invoicesAccepted}/8 Facturas • {testSetResult.creditNotesAccepted}/1 Nota Crédito
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {testSetResult.logs.map((log: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                    <span style={{ fontWeight: 600 }}>{log.step} ({log.document})</span>
                    <span style={{ color: log.status === 'Aceptada' ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Emit Credit Note */}
      {selectedInvoiceForNc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="neu-card" style={{ background: '#fff', padding: 24, borderRadius: 16, maxWidth: 460, width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', fontWeight: 800 }}>Emitir Nota Crédito (91)</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748B' }}>
              Se emitirá una nota crédito electrónica ante la DIAN para anular o ajustar la factura <strong>{selectedInvoiceForNc.number}</strong> (Total: {formatCurrency(Number(selectedInvoiceForNc.total))}).
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Concepto de Corrección DIAN</label>
              <select
                value={ncCode}
                onChange={e => setNcCode(e.target.value as any)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#fff' }}
              >
                <option value="2">2 - Anulación de factura electrónica</option>
                <option value="1">1 - Devolución parcial de los bienes / no aceptación</option>
                <option value="3">3 - Rebaja o descuento total o parcial</option>
                <option value="4">4 - Ajuste de precio</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Motivo / Justificación</label>
              <textarea
                value={ncReason}
                onChange={e => setNcReason(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForNc(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEmitCreditNote}
                disabled={emittingNc}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {emittingNc ? 'Transmitiendo...' : 'Confirmar y Emitir Nota Crédito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Resolution */}
      {showResModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="neu-card" style={{ background: '#fff', padding: 24, borderRadius: 16, maxWidth: 520, width: '100%' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Registrar Resolución de Facturación DIAN</h3>
            <form onSubmit={handleCreateResolution}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>N° Resolución</label>
                  <input
                    type="text"
                    required
                    value={resForm.resolutionNumber}
                    onChange={e => setResForm(f => ({ ...f, resolutionNumber: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Prefijo</label>
                  <input
                    type="text"
                    required
                    value={resForm.prefix}
                    onChange={e => setResForm(f => ({ ...f, prefix: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Desde</label>
                  <input
                    type="number"
                    required
                    value={resForm.fromNumber}
                    onChange={e => setResForm(f => ({ ...f, fromNumber: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Hasta</label>
                  <input
                    type="number"
                    required
                    value={resForm.toNumber}
                    onChange={e => setResForm(f => ({ ...f, toNumber: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Consecutivo</label>
                  <input
                    type="number"
                    required
                    value={resForm.currentNumber}
                    onChange={e => setResForm(f => ({ ...f, currentNumber: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Vigencia Desde</label>
                  <input
                    type="date"
                    required
                    value={resForm.validFrom}
                    onChange={e => setResForm(f => ({ ...f, validFrom: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Vigencia Hasta</label>
                  <input
                    type="date"
                    required
                    value={resForm.validTo}
                    onChange={e => setResForm(f => ({ ...f, validTo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Clave Técnica DIAN</label>
                <input
                  type="text"
                  required
                  placeholder="Cadena alfanumérica entregada por la DIAN"
                  value={resForm.technicalKey}
                  onChange={e => setResForm(f => ({ ...f, technicalKey: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowResModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0284C7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Guardar Resolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
