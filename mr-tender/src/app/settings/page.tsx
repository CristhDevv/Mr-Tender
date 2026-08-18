'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  DollarSign,
  Receipt,
  ShoppingCart,
  Smartphone,
  Save,
  Check
} from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [activeSection, setActiveSection] = useState(0)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    tradeName: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    currency: 'COP',
    taxName: 'IVA',
    taxRate: '19.00',
    invoiceSeries: 'F',
    receiptSeries: 'R',
    // DIAN Fields
    dianNit: '',
    dianRegimen: 'No Responsable de IVA',
    dianResolution: '',
    dianPrefix: 'SETP',
    dianRangeFrom: '1',
    dianRangeTo: '5000',
    dianSoftwareId: '',
    // Digital Payments
    nequiPhone: '',
    daviplataPhone: '',
    bancolombiaKey: '',
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id
        if (!tenant_id) return
        setTenantId(tenant_id)

        const { data, error: fetchErr } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', tenant_id)
          .limit(1)

        if (fetchErr) throw fetchErr

        if (data && data.length > 0) {
          const row = data[0]
          setForm({
            businessName: row.business_name || '',
            tradeName: row.trade_name || '',
            taxId: row.tax_id || '',
            phone: row.phone || '',
            email: row.email || '',
            address: row.address || '',
            currency: row.currency || 'COP',
            taxName: row.tax_name || 'IVA',
            taxRate: String(row.tax_rate || '19.00'),
            invoiceSeries: row.invoice_series || 'F',
            receiptSeries: row.receipt_series || 'R',
            dianNit: row.tax_id || '',
            dianRegimen: row.dian_regimen || 'No Responsable de IVA',
            dianResolution: row.dian_resolution || '18760000001',
            dianPrefix: row.dian_prefix || 'SETP',
            dianRangeFrom: row.dian_from || '1',
            dianRangeTo: row.dian_to || '5000',
            dianSoftwareId: row.dian_software_id || '',
            nequiPhone: row.whatsapp || row.phone || '',
            daviplataPhone: row.phone || '',
            bancolombiaKey: '',
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
    try {
      const payload = {
        tenant_id: tenantId,
        business_name: form.businessName,
        trade_name: form.tradeName,
        tax_id: form.taxId || form.dianNit,
        phone: form.phone || form.nequiPhone,
        whatsapp: form.nequiPhone,
        address: form.address,
        currency: form.currency,
        tax_name: form.taxName,
        tax_rate: Number(form.taxRate),
        invoice_series: form.invoiceSeries,
        receipt_series: form.receiptSeries,
        dian_regimen: form.dianRegimen,
        dian_resolution: form.dianResolution,
        dian_prefix: form.dianPrefix,
        dian_from: form.dianRangeFrom,
        dian_to: form.dianRangeTo,
        dian_software_id: form.dianSoftwareId,
      }

      const { error: upsertErr } = await supabase
        .from('tenant_settings')
        .upsert(payload, { onConflict: 'tenant_id' })

      if (upsertErr) throw upsertErr

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al actualizar configuraciones')
    }
  }

  const SECTIONS = [
    {
      title: 'Datos del negocio', Icon: Building2,
      fields: [
        { key: 'businessName', label: 'Nombre del negocio', type: 'text', placeholder: 'Ej: Tienda La Esperanza' },
        { key: 'tradeName', label: 'Nombre comercial', type: 'text', placeholder: 'Opcional' },
        { key: 'taxId', label: 'NIT / Cédula Fiscal', type: 'text', placeholder: '901234567-1' },
        { key: 'phone', label: 'Teléfono / WhatsApp', type: 'text', placeholder: '3001234567' },
        { key: 'address', label: 'Dirección', type: 'text', placeholder: 'Calle, número, barrio' },
      ]
    },
    {
      title: 'Pagos Digitales & QR', Icon: Smartphone,
      fields: [
        { key: 'nequiPhone', label: 'Número Nequi para pagos QR', type: 'text', placeholder: '3001234567' },
        { key: 'daviplataPhone', label: 'Número Daviplata', type: 'text', placeholder: '3001234567' },
        { key: 'bancolombiaKey', label: 'Llave Bre-B / Cuenta Bancolombia', type: 'text', placeholder: 'Opcional' },
      ]
    },
    {
      title: 'Moneda e impuestos', Icon: DollarSign,
      fields: [
        { key: 'currency', label: 'Moneda', type: 'select', options: ['COP', 'USD', 'MXN', 'PEN'] },
        { key: 'taxName', label: 'Nombre del impuesto', type: 'text', placeholder: 'IVA' },
        { key: 'taxRate', label: 'Tasa de impuesto (%)', type: 'number', placeholder: '19' },
      ]
    },
    {
      title: 'Facturación DIAN', Icon: Receipt,
      fields: [
        { key: 'dianNit', label: 'NIT / Identificación Fiscal DIAN', type: 'text', placeholder: 'Ej: 901234567-1' },
        { key: 'dianRegimen', label: 'Régimen Fiscal', type: 'select', options: ['No Responsable de IVA', 'Responsable de IVA (Común)', 'Régimen Simple de TRIBUTACIÓN (RST)'] },
        { key: 'dianResolution', label: 'Resolución DIAN Nº', type: 'text', placeholder: '18760000001' },
        { key: 'dianPrefix', label: 'Prefijo Autorizado', type: 'text', placeholder: 'SETP' },
        { key: 'dianRangeFrom', label: 'Desde (Nº Inicial)', type: 'number', placeholder: '1' },
        { key: 'dianRangeTo', label: 'Hasta (Nº Final)', type: 'number', placeholder: '5000' },
        { key: 'dianSoftwareId', label: 'ID Software Habilitado DIAN', type: 'text', placeholder: 'ID de Software' },
      ]
    },
    {
      title: 'Configuración ventas', Icon: ShoppingCart,
      fields: [
        { key: 'invoiceSeries', label: 'Serie de facturas', type: 'text', placeholder: 'F' },
        { key: 'receiptSeries', label: 'Serie de recibos', type: 'text', placeholder: 'R' },
      ]
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando configuraciones...</div>
      </div>
    )
  }

  const currentSection = SECTIONS[activeSection]
  const CurrentSectionIcon = currentSection.Icon

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 2px' }}>Configuración</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.3 }}>Ajustes generales, datos de facturación DIAN, Nequi y moneda</p>
      </div>

      {/* Responsive Wrapping Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SECTIONS.map((s, i) => {
          const SectionIcon = s.Icon
          const isActive = activeSection === i
          return (
            <button key={s.title} onClick={() => setActiveSection(i)}
              className="btn-neu"
              style={{ padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, background: isActive ? 'var(--accent-blue)' : 'var(--bg)', color: isActive ? '#fff' : 'var(--text-secondary)', boxShadow: isActive ? '4px 4px 10px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
              <SectionIcon size={15} strokeWidth={2} style={{ color: isActive ? '#fff' : 'inherit' }} />
              <span style={{ fontWeight: isActive ? 700 : 500 }}>{s.title}</span>
            </button>
          )
        })}
      </div>

      {/* Form Content */}
      <div className="neu-card" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 8 }}>
          <CurrentSectionIcon size={17} strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
          <span>{currentSection.title}</span>
        </div>

        <div className="divider" style={{ margin: '6px 0 14px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {currentSection.fields.map(field => (
            <div key={field.key}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{field.label}</label>
              {field.type === 'select' ? (
                <select className="input-neu" value={form[field.key as keyof typeof form]} onChange={e => handleFieldChange(field.key as keyof typeof form, e.target.value)} style={{ fontSize: '0.82rem' }}>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input-neu" type={field.type} placeholder={field.placeholder} value={form[field.key as keyof typeof form]} onChange={e => handleFieldChange(field.key as keyof typeof form, e.target.value)} style={{ fontSize: '0.82rem' }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 12, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          {saved && <div className="badge badge-green" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>✓ Guardado</div>}
          <button className="btn-neu btn-primary" style={{ padding: '10px 22px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleSave}>
            <Save size={15} strokeWidth={2.5} />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>
    </div>
  )
}
