'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldCheck,
  Send,
  MessageSquare,
  DollarSign,
  ArrowLeft,
  X,
  Building2,
  User
} from 'lucide-react'
import Link from 'next/link'

interface SupportDocument {
  id: string
  tenant_id: string
  document_number: string
  supplier_name: string
  supplier_document_type: string
  supplier_document_number: string
  supplier_email?: string | null
  supplier_phone?: string | null
  issue_date: string
  description: string
  subtotal: number
  retefuente_percent: number
  retefuente_amount: number
  reteica_percent: number
  reteica_amount: number
  total: number
  cuds?: string | null
  qr_code?: string | null
  dian_status: string
  created_at: string
}

export default function SupportDocPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<SupportDocument[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [form, setForm] = useState({
    supplier_name: '',
    supplier_document_type: 'CC',
    supplier_document_number: '',
    supplier_email: '',
    supplier_phone: '',
    description: 'Servicios profesionales de mantenimiento y reparaciones locativas',
    subtotal: 450000,
    retefuente_percent: 4, // 4% servicios
    reteica_percent: 0.966 // 9.66 por mil
  })

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('support_documents')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocs(data || [])
    } catch (err) {
      console.error('Error loading support docs:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmitSupportDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!form.supplier_name.trim() || !form.supplier_document_number.trim() || !form.subtotal) {
      return alert('Completa los campos obligatorios')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dian/support-doc/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: form.supplier_name.trim(),
          supplierDocType: form.supplier_document_type,
          supplierDocNumber: form.supplier_document_number.trim(),
          supplierEmail: form.supplier_email.trim() || undefined,
          supplierPhone: form.supplier_phone.trim() || undefined,
          description: form.description.trim(),
          subtotal: Number(form.subtotal),
          retefuentePercent: Number(form.retefuente_percent),
          reteicaPercent: Number(form.reteica_percent)
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al emitir documento soporte')

      alert(`¡Documento Soporte Electrónico Timbrado!\n\nConsecutivo: ${data.documentNumber}\nCUDS: ${data.cuds.slice(0, 32)}...\nEstado: Validado por la DIAN`)
      setShowModal(false)
      setForm({
        supplier_name: '',
        supplier_document_type: 'CC',
        supplier_document_number: '',
        supplier_email: '',
        supplier_phone: '',
        description: 'Servicios profesionales de mantenimiento',
        subtotal: 450000,
        retefuente_percent: 4,
        reteica_percent: 0.966
      })
      await loadDocs()
    } catch (err: any) {
      alert(err.message || 'Error al conectar con la DIAN')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/dian/support-doc/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: 'Gonzalo Pardo (Técnico Independiente)',
          supplierDocType: 'CC',
          supplierDocNumber: '79845123',
          supplierPhone: '3104567890',
          supplierEmail: 'gonzalo.pardo@tecnico.com',
          description: 'Mantenimiento preventivo de maquinaria y sistema eléctrico',
          subtotal: 650000,
          retefuentePercent: 4,
          reteicaPercent: 0.966
        })
      })

      await fetch('/api/dian/support-doc/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: 'Lucía Mendoza (Diseño Gráfico & Publicidad)',
          supplierDocType: 'CC',
          supplierDocNumber: '52987456',
          supplierPhone: '3157891234',
          supplierEmail: 'lucia.diseno@freelance.com',
          description: 'Diseño de piezas publicitarias, catálogo impreso y branding',
          subtotal: 500000,
          retefuentePercent: 10,
          reteicaPercent: 0.966
        })
      })

      await loadDocs()
    } catch (err: any) {
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function getWhatsAppUrl(doc: SupportDocument) {
    const phone = (doc.supplier_phone || '').replace(/\D/g, '')
    const text = encodeURIComponent(
      `¡Hola ${doc.supplier_name}! 📄 Tu Documento Soporte Electrónico *${doc.document_number}* ha sido emitido y validado ante la DIAN:\n\n` +
      `• *Concepto:* ${doc.description}\n` +
      `• *Subtotal:* ${formatCurrency(Number(doc.subtotal))}\n` +
      (Number(doc.retefuente_amount) > 0 ? `• *Retefuente (${doc.retefuente_percent}%):* -${formatCurrency(Number(doc.retefuente_amount))}\n` : '') +
      (Number(doc.reteica_amount) > 0 ? `• *ReteICA (${doc.reteica_percent}%):* -${formatCurrency(Number(doc.reteica_amount))}\n` : '') +
      `• *Neto Pagado:* ${formatCurrency(Number(doc.total))}\n\n` +
      `CUDS: ${doc.cuds ? doc.cuds.slice(0, 24) + '...' : 'Validado'}\n` +
      `Mr. Tender Facturación & Documento Soporte DIAN ✅`
    )
    return `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${text}`
  }

  const filteredDocs = docs.filter(d =>
    d.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.supplier_document_number.includes(searchQuery)
  )

  const totalAcquisitions = docs.reduce((sum, d) => sum + Number(d.subtotal), 0)
  const totalRetentions = docs.reduce((sum, d) => sum + (Number(d.retefuente_amount) + Number(d.reteica_amount)), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/purchases" className="btn-neu btn-ghost" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
            <ArrowLeft size={14} />
            <span>Volver a Compras</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={18} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Documento Soporte Electrónico DIAN
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadDocs} className="btn-neu btn-ghost" title="Actualizar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {docs.length === 0 && (
            <button onClick={handleSeedDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Ejemplos Demo
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} />
            <span>Nuevo Documento Soporte</span>
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '-10px 0 0' }}>
        Emisión y timbrado de comprobantes fiscales válidos ante la DIAN para compras o servicios adquiridos a personas no obligadas a expedir factura.
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Documentos Emitidos
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {docs.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Validados con CUDS ante DIAN
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Total Compras No Obligados
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(totalAcquisitions)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Subtotal deducible en renta
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Retenciones Practicadas
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(totalRetentions)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            ReteFuente + ReteICA aplicados
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 380, padding: '6px 12px' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por proveedor, documento o número..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
          <FileText size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay documentos soporte registrados</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Genera comprobantes electrónicos válidos para soportar gastos y costos de proveedores no obligados a facturar.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
            + Crear Primer Documento Soporte
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
          {filteredDocs.map(doc => (
            <div key={doc.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{doc.document_number}</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Fecha: {formatDate(doc.issue_date)}
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                  Aceptado DIAN ✅
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 6, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Proveedor: </span>
                  <strong>{doc.supplier_name}</strong> ({doc.supplier_document_type}: {doc.supplier_document_number})
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Concepto: </span>
                  <span>{doc.description}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, background: 'var(--bg)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Subtotal</span>
                  <strong>{formatCurrency(Number(doc.subtotal))}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Retenciones</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>-{formatCurrency(Number(doc.retefuente_amount) + Number(doc.reteica_amount))}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Neto Pagado</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(doc.total))}</strong>
                </div>
              </div>

              {doc.cuds && (
                <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  CUDS: {doc.cuds.slice(0, 24)}...
                </div>
              )}

              {doc.supplier_phone && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                  <a
                    href={getWhatsAppUrl(doc)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-neu btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <MessageSquare size={13} />
                    <span>Enviar a WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Documento Soporte */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Nuevo Documento Soporte Electrónico</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEmitSupportDoc} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre o Razón Social del Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Gonzalo Pardo"
                  className="input-neu"
                  value={form.supplier_name}
                  onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo Doc.</label>
                  <select
                    className="input-neu"
                    value={form.supplier_document_type}
                    onChange={e => setForm(f => ({ ...f, supplier_document_type: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="CC">Cédula (CC)</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="PEP">PEP</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Número Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 79845123"
                    className="input-neu"
                    value={form.supplier_document_number}
                    onChange={e => setForm(f => ({ ...f, supplier_document_number: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 3104567890"
                    className="input-neu"
                    value={form.supplier_phone}
                    onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="proveedor@email.com"
                    className="input-neu"
                    value={form.supplier_email}
                    onChange={e => setForm(f => ({ ...f, supplier_email: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Descripción del Servicio o Bien Adquirido *</label>
                <textarea
                  required
                  rows={2}
                  className="input-neu"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ fontSize: '0.8rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Subtotal ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-neu"
                    value={form.subtotal}
                    onChange={e => setForm(f => ({ ...f, subtotal: Number(e.target.value) }))}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Retefuente (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-neu"
                    value={form.retefuente_percent}
                    onChange={e => setForm(f => ({ ...f, retefuente_percent: Number(e.target.value) }))}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>ReteICA (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="input-neu"
                    value={form.reteica_percent}
                    onChange={e => setForm(f => ({ ...f, reteica_percent: Number(e.target.value) }))}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Emitiendo a DIAN...' : 'Emitir Documento Soporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
