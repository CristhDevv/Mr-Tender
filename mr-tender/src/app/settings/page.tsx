'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'
import { usePermissions } from '@/lib/hooks/usePermissions'
import {
  Building2,
  DollarSign,
  Receipt,
  Smartphone,
  Save,
  Check,
  Printer
} from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const { role, isAdmin } = usePermissions()

  const [activeSection, setActiveSection] = useState(0)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({})
  const [enableInvoicing, setEnableInvoicing] = useState(false)

  const [form, setForm] = useState({
    businessName: '',
    tradeName: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    currency: 'COP',
    taxName: 'IVA',
    taxRate: '19.00',
    invoiceSeries: 'POS',
    receiptSeries: 'R',
    dianRegimen: 'No Responsable de IVA',
    ticketFooterMessage: '¡Gracias por su compra! Vuelva pronto.',
    ticketCopies: '1',
    // Digital Payments
    nequiPhone: '',
    daviplataPhone: '',
    bancolombiaKey: '',
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let tid = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
        if (!tid) {
          const { data: userData } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .limit(1)

          if (userData?.[0]?.tenant_id) {
            tid = userData[0].tenant_id
          } else {
            const { data: ptData } = await supabase
              .from('platform_tenants')
              .select('id')
              .eq('owner_email', user.email)
              .limit(1)

            if (ptData?.[0]?.id) {
              tid = ptData[0].id
            }
          }
        }

        if (!tid) return
        setTenantId(tid)

        const { data, error: fetchErr } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', tid)
          .limit(1)

        if (fetchErr) throw fetchErr

        if (data && data.length > 0) {
          const row = data[0]
          const mods = row.enabled_modules || {}
          setEnabledModules(mods)
          setEnableInvoicing(!!mods.invoicing)
          setForm({
            businessName: row.business_name || '',
            tradeName: row.trade_name || '',
            taxId: row.tax_id || '',
            phone: row.phone || '',
            email: row.email || '',
            address: row.address || '',
            city: row.city || 'Colombia',
            currency: row.currency || 'COP',
            taxName: row.tax_name || 'IVA',
            taxRate: String(row.tax_rate !== null && row.tax_rate !== undefined ? row.tax_rate : '19.00'),
            invoiceSeries: row.invoice_series || 'POS',
            receiptSeries: row.receipt_series || 'R',
            dianRegimen: row.dian_regimen || 'No Responsable de IVA',
            ticketFooterMessage: row.ticket_footer_message || '¡Gracias por su compra! Vuelva pronto.',
            ticketCopies: String(row.ticket_copies || '1'),
            nequiPhone: row.whatsapp || row.phone || '',
            daviplataPhone: row.phone || '',
            bancolombiaKey: row.bancolombia_key || '',
          })
        }
      } catch (err: any) {
        console.error('Error fetching settings:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleFieldChange = (key: keyof typeof form, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!tenantId) return
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        tenant_id: tenantId,
        business_name: form.businessName,
        trade_name: form.tradeName,
        tax_id: form.taxId,
        phone: form.phone || form.nequiPhone,
        whatsapp: form.nequiPhone,
        address: form.address,
        currency: form.currency,
        tax_name: form.taxName,
        tax_rate: Number(form.taxRate),
        invoice_series: form.invoiceSeries,
        receipt_series: form.receiptSeries,
        dian_regimen: form.dianRegimen,
        ticket_footer_message: form.ticketFooterMessage,
        ticket_copies: Number(form.ticketCopies) || 1,
        bancolombia_key: form.bancolombiaKey,
        enabled_modules: {
          ...enabledModules,
          invoicing: enableInvoicing
        }
      }

      const { error: upsertErr } = await supabase
        .from('tenant_settings')
        .upsert(payload, { onConflict: 'tenant_id' })

      if (upsertErr) throw upsertErr

      setSaved(true)
      try {
        const cached = localStorage.getItem('mr_tender_cached_modules')
        const parsed = cached ? JSON.parse(cached) : {}
        parsed.invoicing = enableInvoicing
        localStorage.setItem('mr_tender_cached_modules', JSON.stringify(parsed))
      } catch {}
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al actualizar configuraciones')
    } finally {
      setSaving(false)
    }
  }

  // 100% Non-technical, user-friendly sections for business owners
  const SECTIONS = [
    {
      title: 'Datos del Negocio',
      description: 'Información general y datos de contacto de tu establecimiento.',
      Icon: Building2,
      fields: [
        { key: 'businessName', label: 'Nombre del negocio / Razón Social', type: 'text', placeholder: 'Ej: Panadería y Pastelería La Espiga' },
        { key: 'tradeName', label: 'Nombre comercial (Opcional)', type: 'text', placeholder: 'Ej: La Espiga Dorada' },
        { key: 'taxId', label: 'NIT / Cédula Fiscal', type: 'text', placeholder: 'Ej: 901234567-1' },
        { key: 'phone', label: 'Teléfono / WhatsApp de Contacto', type: 'text', placeholder: '3001234567' },
        { key: 'address', label: 'Dirección del Establecimiento', type: 'text', placeholder: 'Calle 10 # 4-50, Barrio Centro' },
      ]
    },
    {
      title: 'Facturación & Tickets',
      description: 'Ajustes del comprobante de venta, mensajes impresos y régimen.',
      Icon: Receipt,
      fields: [
        { key: 'dianRegimen', label: 'Régimen Tributario', type: 'select', options: ['No Responsable de IVA', 'Responsable de IVA (Común)', 'Régimen Simple de Tributación (RST)'] },
        { key: 'invoiceSeries', label: 'Prefijo de Venta (en el ticket)', type: 'text', placeholder: 'POS' },
        { key: 'ticketCopies', label: 'Copias a imprimir por venta', type: 'select', options: ['1 copia', '2 copias'] },
        { key: 'ticketFooterMessage', label: 'Mensaje al final del ticket', type: 'textarea', placeholder: '¡Gracias por su compra! Vuelva pronto.' },
      ]
    },
    {
      title: 'Pagos Digitales & QR',
      description: 'Cuentas para recibir transferencias y pagos con QR en el punto de venta.',
      Icon: Smartphone,
      fields: [
        { key: 'nequiPhone', label: 'Número Nequi para pagos QR', type: 'text', placeholder: '3001234567' },
        { key: 'daviplataPhone', label: 'Número Daviplata', type: 'text', placeholder: '3001234567' },
        { key: 'bancolombiaKey', label: 'Llave Bre-B / Cuenta Bancolombia (Opcional)', type: 'text', placeholder: 'Número de cuenta o llave QR' },
      ]
    },
    {
      title: 'Moneda e Impuestos',
      description: 'Moneda principal de trabajo e impuesto por defecto para productos.',
      Icon: DollarSign,
      fields: [
        { key: 'currency', label: 'Moneda del Negocio', type: 'select', options: ['COP (Pesos Colombianos)', 'USD (Dólares)', 'MXN (Pesos Mexicanos)', 'PEN (Soles)'] },
        { key: 'taxName', label: 'Nombre del Impuesto', type: 'text', placeholder: 'IVA' },
        { key: 'taxRate', label: 'Tasa de impuesto por defecto (%)', type: 'number', placeholder: '19' },
      ]
    }
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Cargando configuración...</div>
      </div>
    )
  }

  const currentSection = SECTIONS[activeSection]
  const CurrentSectionIcon = currentSection.Icon

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 900, overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 2px' }}>
          Configuración del Negocio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.3 }}>
          Datos de la empresa, comprobantes de venta, métodos de pago e impuestos
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {saved && (
        <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, color: '#059669', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={16} />
          <span>Configuración guardada correctamente.</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SECTIONS.map((s, i) => {
          const SectionIcon = s.Icon
          const isActive = activeSection === i
          return (
            <button
              key={s.title}
              onClick={() => setActiveSection(i)}
              className="btn-neu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 800 : 600,
                background: isActive ? '#00D6BC' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                border: isActive ? '1px solid #00BAA4' : '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <SectionIcon size={14} strokeWidth={isActive ? 2.5 : 1.75} style={{ color: isActive ? '#FFFFFF' : '#64748B' }} />
              <span>{s.title}</span>
            </button>
          )
        })}
      </div>

      {/* Form Card */}
      <div className="neu-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E6FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008272', flexShrink: 0 }}>
            <CurrentSectionIcon size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
              {currentSection.title}
            </h2>
            <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
              {currentSection.description}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeSection === 1 && (
            <div style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: enableInvoicing ? '1px solid #94F0E3' : '1px solid #E2E8F0',
              background: enableInvoicing ? '#E6FAF7' : '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 8,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>Facturación Electrónica DIAN</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: enableInvoicing ? '#00D6BC' : '#94A3B8',
                    color: '#FFFFFF',
                    letterSpacing: '0.02em'
                  }}>
                    {enableInvoicing ? '✓ HABILITADA (Visible en menú lateral)' : '✕ OCULTA (No visible en menú lateral)'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                  {enableInvoicing
                    ? 'El menú Facturación está activo en el menú lateral para emitir facturas UBL 2.1 y documentos soporte.'
                    : 'Mantener oculto el menú Facturación del panel lateral mientras se completan las resoluciones y pruebas DIAN.'}
                </div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableInvoicing}
                  onChange={e => setEnableInvoicing(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  background: enableInvoicing ? '#00D6BC' : '#CBD5E1',
                  transition: '0.2s', borderRadius: 26
                }}>
                  <span style={{
                    position: 'absolute', height: 20, width: 20, left: enableInvoicing ? 24 : 4, bottom: 3,
                    background: '#FFFFFF', transition: '0.2s', borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {currentSection.fields?.map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  {f.label}
                </label>

                {f.type === 'select' ? (
                  <select
                    className="input-neu"
                    value={(form as any)[f.key]}
                    onChange={e => handleFieldChange(f.key as any, e.target.value)}
                    style={{ fontSize: '0.84rem', background: '#FFFFFF', cursor: 'pointer' }}
                  >
                    {f.options?.map(opt => (
                      <option key={opt} value={opt.split(' ')[0]}>{opt}</option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    className="input-neu"
                    rows={2}
                    value={(form as any)[f.key]}
                    onChange={e => handleFieldChange(f.key as any, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ fontSize: '0.84rem', resize: 'vertical' }}
                  />
                ) : (
                  <input
                    type={f.type}
                    className="input-neu"
                    value={(form as any)[f.key]}
                    onChange={e => handleFieldChange(f.key as any, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ fontSize: '0.84rem' }}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn-neu btn-primary"
              style={{ padding: '9px 22px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={15} />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
