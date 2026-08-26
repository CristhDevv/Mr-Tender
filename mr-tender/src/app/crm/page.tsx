'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  TrendingUp,
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
  Percent,
  Check,
  X,
  FileText,
  ShieldCheck,
  Printer,
  Calendar,
  Users,
  CreditCard,
  Building2,
  ArrowRight,
  Sparkles,
  QrCode
} from 'lucide-react'
import Link from 'next/link'

interface CrmDeal {
  id: string
  tenant_id: string
  title: string
  customer_name: string
  customer_phone?: string | null
  customer_email?: string | null
  estimated_value: number
  stage: 'lead' | 'contacted' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
  probability: number
  expected_close_date?: string | null
  notes?: string | null
  created_at: string
}

const STAGES = [
  { id: 'lead', label: 'Prospectos (Leads)' },
  { id: 'contacted', label: 'Contactados' },
  { id: 'proposal_sent', label: 'Propuesta Enviada' },
  { id: 'negotiation', label: 'En Negociación' },
  { id: 'won', label: 'Cerrado Ganado 🏆' },
  { id: 'lost', label: 'Perdido' }
]

export default function CrmPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [paymentModalData, setPaymentModalData] = useState<{
    deal: CrmDeal
    paymentUrl: string
    qrCodeUrl: string
  } | null>(null)

  // Form
  const [form, setForm] = useState({
    title: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    estimated_value: 3500000,
    stage: 'lead' as CrmDeal['stage'],
    probability: 20,
    expected_close_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('crm_deals')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (err) {
      console.error('Error loading CRM deals:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Deal
  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!form.title.trim() || !form.customer_name.trim()) {
      return alert('Título y cliente son obligatorios')
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('crm_deals').insert({
        tenant_id: tenantId,
        title: form.title.trim(),
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        customer_email: form.customer_email.trim() || null,
        estimated_value: Number(form.estimated_value),
        stage: form.stage,
        probability: Number(form.probability),
        expected_close_date: form.expected_close_date || null,
        notes: form.notes.trim() || null
      })

      if (error) throw error

      setShowModal(false)
      setForm({
        title: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        estimated_value: 3500000,
        stage: 'lead',
        probability: 20,
        expected_close_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      })
      await loadDeals()
    } catch (err: any) {
      alert(err.message || 'Error al guardar oportunidad')
    } finally {
      setSubmitting(false)
    }
  }

  // Advance Stage
  async function handleMoveStage(dealId: string, nextStage: CrmDeal['stage']) {
    try {
      let prob = 20
      if (nextStage === 'contacted') prob = 40
      if (nextStage === 'proposal_sent') prob = 60
      if (nextStage === 'negotiation') prob = 80
      if (nextStage === 'won') prob = 100
      if (nextStage === 'lost') prob = 0

      const { error } = await supabase
        .from('crm_deals')
        .update({ stage: nextStage, probability: prob, updated_at: new Date().toISOString() })
        .eq('id', dealId)

      if (error) throw error
      await loadDeals()
    } catch (err: any) {
      alert(err.message || 'Error al mover etapa')
    }
  }

  // Generate Payment Link Modal
  async function handleOpenPaymentLink(deal: CrmDeal) {
    try {
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(deal.estimated_value),
          reference: `DEAL-${deal.id.slice(0, 8)}`,
          customerName: deal.customer_name,
          customerPhone: deal.customer_phone,
          customerEmail: deal.customer_email,
          description: deal.title
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar link')

      setPaymentModalData({
        deal,
        paymentUrl: data.paymentUrl,
        qrCodeUrl: data.qrCodeUrl
      })
    } catch (err: any) {
      alert(err.message || 'Error al generar link de cobro')
    }
  }

  // Seed Demo Data
  async function handleSeedDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      await supabase.from('crm_deals').insert([
        {
          tenant_id: tenantId,
          title: 'Contrato de Suministro Anual Corporativo',
          customer_name: 'Inversiones & Consultoría Andina S.A.S',
          customer_phone: '3128904567',
          customer_email: 'compras@inversionesandina.com',
          estimated_value: 12500000,
          stage: 'negotiation',
          probability: 80,
          expected_close_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Esperando visto bueno de junta directiva para orden de compra.'
        },
        {
          tenant_id: tenantId,
          title: 'Dotación Uniformes y Calzado de Seguridad',
          customer_name: 'Constructora Bolívar Occidente',
          customer_phone: '3104561234',
          customer_email: 'gerencia@bolivaroccidente.com',
          estimated_value: 6800000,
          stage: 'proposal_sent',
          probability: 60,
          expected_close_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Propuesta enviada por correo y cotización en PDF.'
        },
        {
          tenant_id: tenantId,
          title: 'Mobiliario y Equipamiento Punto de Venta',
          customer_name: 'Cafetería & Panadería La Estación',
          customer_phone: '3157890123',
          customer_email: 'laestacion@cafe.com',
          estimated_value: 4200000,
          stage: 'won',
          probability: 100,
          expected_close_date: new Date().toISOString().split('T')[0],
          notes: 'Ganado. Cliente solicita emitir factura electrónica con anticipo 50%.'
        },
        {
          tenant_id: tenantId,
          title: 'Mantenimiento Preventivo de Flota',
          customer_name: 'Transportes Rápidos del Valle',
          customer_phone: '3189901122',
          customer_email: 'flota@rapidosvalle.com',
          estimated_value: 8900000,
          stage: 'contacted',
          probability: 40,
          expected_close_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Reunión agendada para el viernes 10:00 AM.'
        }
      ])

      await loadDeals()
    } catch (err: any) {
      alert('Error cargando demo CRM: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function getWhatsAppDealUrl(deal: CrmDeal) {
    const phone = (deal.customer_phone || '').replace(/\D/g, '')
    const text = encodeURIComponent(
      `¡Hola ${deal.customer_name}! 👋 Te contacto respecto a la propuesta *"${deal.title}"* por valor de ${formatCurrency(Number(deal.estimated_value))}.\n\n` +
      `¿Cómo va la revisión de los requerimientos? Quedo atento a tus dudas para formalizar el pedido o resolver inquietudes.`
    )
    return `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${text}`
  }

  const filteredDeals = deals.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // KPIs
  const totalPipelineValue = deals.filter(d => d.stage !== 'lost').reduce((sum, d) => sum + Number(d.estimated_value), 0)
  const wonDealsValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + Number(d.estimated_value), 0)
  const activeDealsCount = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              CRM & Embudo Comercial Kanban
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Seguimiento visual de prospectos, etapas de negociación, enlaces de cobro dinámicos y conversión a factura electrónica en 1 clic
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadDeals} className="btn-neu btn-ghost" title="Actualizar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {deals.length === 0 && (
            <button onClick={handleSeedDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Oportunidades Demo
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} strokeWidth={2} />
            <span>Nueva Oportunidad</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Valor Total Pipeline
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(totalPipelineValue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Oportunidades activas y ganadas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Ventas Cerradas (Ganadas)
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(wonDealsValue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Listas para facturación DIAN
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            En Negociación Activa
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeDealsCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Prospectos en seguimiento
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, padding: '6px 12px' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por oportunidad o cliente..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
        />
      </div>

      {/* ── KANBAN BOARD ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'flex-start' }}>
        {STAGES.filter(st => st.id !== 'lost').map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id)
          const stageTotal = stageDeals.reduce((sum, d) => sum + Number(d.estimated_value), 0)

          return (
            <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-deep)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', minHeight: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{stage.label}</strong>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{stageDeals.length} deals • {formatCurrency(stageTotal)}</div>
                </div>
              </div>

              {stageDeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Sin oportunidades
                </div>
              ) : (
                stageDeals.map(deal => (
                  <div key={deal.id} className="neu-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{deal.title}</strong>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)' }}>{deal.probability}%</span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Cliente: <strong>{deal.customer_name}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {formatCurrency(Number(deal.estimated_value))}
                      </strong>
                      {deal.expected_close_date && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Cierre: {formatDate(deal.expected_close_date)}
                        </span>
                      )}
                    </div>

                    {deal.notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-deep)', padding: '4px 6px', borderRadius: 4 }}>
                        {deal.notes}
                      </div>
                    )}

                    {/* Quick Stage Transitions */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: 6, marginTop: 4 }}>
                      {deal.stage === 'lead' && (
                        <button onClick={() => handleMoveStage(deal.id, 'contacted')} className="btn-neu btn-primary" style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem' }}>
                          Contactar
                        </button>
                      )}
                      {deal.stage === 'contacted' && (
                        <button onClick={() => handleMoveStage(deal.id, 'proposal_sent')} className="btn-neu btn-primary" style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem' }}>
                          Enviar Propuesta
                        </button>
                      )}
                      {deal.stage === 'proposal_sent' && (
                        <button onClick={() => handleMoveStage(deal.id, 'negotiation')} className="btn-neu btn-primary" style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem' }}>
                          Negociar
                        </button>
                      )}
                      {deal.stage === 'negotiation' && (
                        <button onClick={() => handleMoveStage(deal.id, 'won')} className="btn-neu btn-primary" style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem' }}>
                          Marcar Ganado 🏆
                        </button>
                      )}
                      {deal.stage === 'won' && (
                        <Link href={`/invoices?customer=${encodeURIComponent(deal.customer_name)}&amount=${deal.estimated_value}`} className="btn-neu btn-primary" style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem', textAlign: 'center' }}>
                          Facturar DIAN 📄
                        </Link>
                      )}

                      {/* Payment Link & WhatsApp */}
                      <button
                        onClick={() => handleOpenPaymentLink(deal)}
                        className="btn-neu btn-ghost"
                        title="Generar Link de Cobro Wompi / PSE"
                        style={{ padding: '4px 6px' }}
                      >
                        <CreditCard size={13} />
                      </button>

                      {deal.customer_phone && (
                        <a
                          href={getWhatsAppDealUrl(deal)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-neu btn-ghost"
                          title="Contactar por WhatsApp"
                          style={{ padding: '4px 6px' }}
                        >
                          <MessageSquare size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* ── MODAL: NUEVA OPORTUNIDAD ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 500, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Nueva Oportunidad Comercial</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Título de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Contrato anual de suministro"
                  className="input-neu"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cliente o Empresa Prospecto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Constructora Bolívar Occidente"
                  className="input-neu"
                  value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 3104561234"
                    className="input-neu"
                    value={form.customer_phone}
                    onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    className="input-neu"
                    value={form.customer_email}
                    onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Valor Estimado ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-neu"
                    value={form.estimated_value}
                    onChange={e => setForm(f => ({ ...f, estimated_value: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Etapa Inicial</label>
                  <select
                    className="input-neu"
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value as any }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="lead">Prospecto</option>
                    <option value="contacted">Contactado</option>
                    <option value="proposal_sent">Propuesta</option>
                    <option value="negotiation">Negociación</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha Estimada de Cierre</label>
                <input
                  type="date"
                  className="input-neu"
                  value={form.expected_close_date}
                  onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas u Observaciones</label>
                <textarea
                  rows={2}
                  className="input-neu"
                  placeholder="Detalles sobre las necesidades del cliente..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ fontSize: '0.8rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Crear Oportunidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LINK DE PAGO DINÁMICO & QR ── */}
      {paymentModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 22, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>Enlace de Cobro & QR Wompi/PSE</strong>
              <button onClick={() => setPaymentModalData(null)} className="btn-neu btn-ghost" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
              Cobro para <strong>{paymentModalData.deal.customer_name}</strong> por valor de <strong>{formatCurrency(Number(paymentModalData.deal.estimated_value))}</strong>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <img src={paymentModalData.qrCodeUrl} alt="QR Pago" style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid var(--border-color)' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <a
                href={paymentModalData.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-neu btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                Abrir Pasarela de Pago
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(paymentModalData.paymentUrl)
                  alert('¡Enlace de cobro copiado al portapapeles!')
                }}
                className="btn-neu btn-ghost"
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
              >
                Copiar Enlace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

