'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateQuotePdf, HardwareQuotePdfData } from '@/lib/pdf-generator'
import {
  FileText,
  Wrench,
  Plus,
  Search,
  RefreshCw,
  Printer,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react'

interface HardwareQuote {
  id: string
  tenant_id: string
  quote_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  project_name?: string
  status: 'draft' | 'sent' | 'approved' | 'converted' | 'expired' | 'rejected'
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  valid_until?: string
  notes?: string
  created_at: string
}

export default function HardwareQuotesPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<HardwareQuote[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    project_name: 'Remodelación Obra Casa Campestre',
    valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    notes: 'Precios válidos por 15 días. Incluye transporte en perímetro urbano.',
    items: [
      { name: 'Cemento Gris Argos 50kg', quantity: 20, unitPrice: 32000, taxRate: 19 },
      { name: 'Varilla Corrugada 1/2 pulgada', quantity: 15, unitPrice: 42000, taxRate: 19 },
      { name: 'Arena de Peña por Metro Cúbico', quantity: 3, unitPrice: 95000, taxRate: 19 }
    ]
  })

  useEffect(() => {
    loadQuotes()
  }, [])

  async function loadQuotes() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('hardware_quotes')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (err) {
      console.error('Error loading hardware quotes:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleAddItem() {
    setForm({
      ...form,
      items: [...form.items, { name: '', quantity: 1, unitPrice: 10000, taxRate: 19 }]
    })
  }

  function handleRemoveItem(idx: number) {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx)
    })
  }

  function handleUpdateItem(idx: number, field: string, value: any) {
    const updated = [...form.items]
    updated[idx] = { ...updated[idx], [field]: value }
    setForm({ ...form, items: updated })
  }

  async function handleCreateQuote(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const quoteNumber = 'COT-' + Math.floor(1000 + Math.random() * 9000)
      const subtotal = form.items.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unitPrice)), 0)
      const tax = subtotal * 0.19
      const total = subtotal + tax

      const { data: newQuote, error } = await supabase
        .from('hardware_quotes')
        .insert({
          tenant_id: tenantId,
          quote_number: quoteNumber,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone || null,
          customer_email: form.customer_email || null,
          project_name: form.project_name || null,
          subtotal,
          discount_amount: 0,
          tax_amount: tax,
          total,
          valid_until: form.valid_until,
          notes: form.notes || null,
          status: 'sent'
        })
        .select()
        .single()

      if (error) throw error

      // Insert quote items
      const quoteItems = form.items.map(it => ({
        quote_id: newQuote.id,
        item_name: it.name,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unitPrice) || 0,
        tax_rate: Number(it.taxRate) || 0,
        total_price: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
      }))

      await supabase.from('hardware_quote_items').insert(quoteItems)

      setShowModal(false)
      await loadQuotes()
    } catch (err: any) {
      alert(err.message || 'Error al crear cotización')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePrintPdf(q: HardwareQuote) {
    try {
      const { data: items } = await supabase.from('hardware_quote_items').select('*').eq('quote_id', q.id)
      const { data: tenantSetting } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId).single()

      const pdfData: HardwareQuotePdfData = {
        businessName: tenantSetting?.business_name || 'FERRETERÍA & CONSTRUCCIÓN',
        merchantPhone: tenantSetting?.phone || '300 123 4567',
        merchantEmail: tenantSetting?.email || 'ventas@ferreteria.com',
        quoteNumber: q.quote_number,
        customerName: q.customer_name,
        customerPhone: q.customer_phone || undefined,
        customerEmail: q.customer_email || undefined,
        projectName: q.project_name || undefined,
        date: formatDate(q.created_at),
        validUntil: q.valid_until ? formatDate(q.valid_until) : undefined,
        notes: q.notes || undefined,
        items: (items || []).map((it: any) => ({
          name: it.item_name,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unit_price) || 0,
          total: Number(it.total_price) || 0
        })),
        subtotal: q.subtotal,
        discountAmount: q.discount_amount || 0,
        taxAmount: q.tax_amount || 0,
        total: q.total
      }

      generateQuotePdf(pdfData)
    } catch (err: any) {
      alert('Error al exportar PDF: ' + err.message)
    }
  }

  async function handleSeedDemoQuotes() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const tomorrow = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
      const demo = [
        {
          tenant_id: tenantId,
          quote_number: 'COT-7821',
          customer_name: 'Constructora Bolívar S.A.S.',
          customer_phone: '3104567890',
          customer_email: 'compras@constructorabolivar.co',
          project_name: 'Edificio Los Rosales - Etapa 2',
          subtotal: 3500000,
          discount_amount: 0,
          tax_amount: 665000,
          total: 4165000,
          status: 'sent',
          valid_until: tomorrow,
          notes: 'Precios fijados por 15 días calendario.'
        },
        {
          tenant_id: tenantId,
          quote_number: 'COT-7822',
          customer_name: 'Maestro Fernando Castillo',
          customer_phone: '3157891234',
          project_name: 'Remodelación Baño & Cocina',
          subtotal: 850000,
          discount_amount: 0,
          tax_amount: 161500,
          total: 1011500,
          status: 'approved',
          valid_until: tomorrow,
          notes: 'Aprobado por el cliente.'
        }
      ]
      await supabase.from('hardware_quotes').insert(demo)
      await loadQuotes()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredQuotes = quotes.filter(q =>
    !search ||
    q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    (q.project_name && q.project_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Cotizaciones A4</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} style={{ color: 'var(--accent-blue)' }} />
            Cotizaciones & Presupuestos Formales (PDF A4)
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Presupuestos profesionales con vigencia, desglose de impuestos y exportación a PDF para clientes y constructoras.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/hardware/rentals"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber)' }}
          >
            <Wrench size={15} />
            <span>Alquiler Herramientas</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Cotización</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por cliente, cotización o proyecto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Quotes Grid */}
      {filteredQuotes.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay cotizaciones registradas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Genera presupuestos en formato carta imprimible para tus clientes o carga datos demo.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoQuotes} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Cotizaciones Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredQuotes.map(q => (
            <div key={q.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{q.customer_name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Folio: <strong>{q.quote_number}</strong> {q.project_name ? `• ${q.project_name}` : ''}</div>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: q.status === 'approved' ? 'var(--accent-green-lt)' : 'var(--accent-blue-lt)',
                  color: q.status === 'approved' ? 'var(--accent-green)' : 'var(--accent-blue)'
                }}>
                  {q.status === 'approved' ? 'Aprobada' : 'Enviada'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Fecha:</strong> 📅 {formatDate(q.created_at)}</div>
                {q.valid_until && <div><strong>Válido hasta:</strong> ⏳ {formatDate(q.valid_until)}</div>}
                <div style={{ color: 'var(--accent-blue)', fontWeight: 800, fontSize: '0.95rem' }}>
                  Total: {formatCurrency(q.total)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                <button
                  onClick={() => handlePrintPdf(q)}
                  className="btn-neu btn-primary"
                  style={{ width: '100%', padding: '7px 0', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Printer size={14} /> Descargar Cotización PDF (A4)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Cotización */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 580, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nueva Cotización Formal</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cliente / Constructora</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre o Razón Social"
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="WhatsApp"
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Proyecto / Obra</label>
                  <input
                    type="text"
                    value={form.project_name}
                    onChange={e => setForm({ ...form, project_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Vigencia</label>
                  <input
                    type="date"
                    required
                    value={form.valid_until}
                    onChange={e => setForm({ ...form, valid_until: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Materiales & Productos</label>
                  <button type="button" onClick={handleAddItem} className="btn-neu" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                    + Ítem
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Material (ej. Cemento Argos 50kg)"
                        value={it.name}
                        onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                        className="input-neu"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      />
                      <input
                        type="number"
                        placeholder="Cantidad"
                        value={it.quantity}
                        onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                        className="input-neu"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      />
                      <input
                        type="number"
                        placeholder="Precio Unit."
                        value={it.unitPrice}
                        onChange={e => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="input-neu"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="btn-neu btn-ghost"
                        style={{ padding: 6, color: 'var(--accent-coral)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Condiciones Comerciales & Notas</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Crear Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
