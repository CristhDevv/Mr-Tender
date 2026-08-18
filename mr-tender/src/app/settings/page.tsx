'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id
        setTenantId(tenant_id)

        const { data, error: fetchErr } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', tenant_id)
          .single()

        if (fetchErr) throw fetchErr

        if (data) {
          setForm({
            businessName: data.business_name || '',
            tradeName: data.trade_name || '',
            taxId: data.tax_id || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            currency: data.currency || 'COP',
            taxName: data.tax_name || 'IVA',
            taxRate: String(data.tax_rate || '19.00'),
            invoiceSeries: data.invoice_series || 'F',
            receiptSeries: data.receipt_series || 'R',
            dianNit: data.tax_id || '',
            dianRegimen: data.dian_regimen || 'No Responsable de IVA',
            dianResolution: data.dian_resolution || '18760000001',
            dianPrefix: data.dian_prefix || 'SETP',
            dianRangeFrom: data.dian_from || '1',
            dianRangeTo: data.dian_to || '5000',
            dianSoftwareId: data.dian_software_id || '',
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
    setError('')
    setSaved(false)
    try {
      const { error: updateErr } = await supabase
        .from('tenant_settings')
        .update({
          business_name: form.businessName,
          trade_name: form.tradeName,
          tax_id: form.taxId || form.dianNit,
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
        })
        .eq('tenant_id', tenantId)

      if (updateErr) throw updateErr

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al actualizar configuraciones')
    }
  }

  const SECTIONS = [
    {
      title: 'Datos del negocio', icon: '🏪',
      fields: [
        { key: 'businessName', label: 'Nombre del negocio', type: 'text', placeholder: 'Ej: Tienda La Esperanza' },
        { key: 'tradeName', label: 'Nombre comercial', type: 'text', placeholder: 'Opcional' },
        { key: 'taxId', label: 'NIT / Cédula Fiscal', type: 'text', placeholder: '901234567-1' },
        { key: 'address', label: 'Dirección', type: 'text', placeholder: 'Calle, número, barrio' },
      ]
    },
    {
      title: 'Moneda e impuestos 🇨🇴', icon: '💰',
      fields: [
        { key: 'currency', label: 'Moneda', type: 'select', options: ['COP', 'USD', 'MXN', 'PEN'] },
        { key: 'taxName', label: 'Nombre del impuesto', type: 'text', placeholder: 'IVA' },
        { key: 'taxRate', label: 'Tasa de impuesto (%)', type: 'number', placeholder: '19' },
      ]
    },
    {
      title: 'Facturación Electrónica DIAN 🧾', icon: '🧾',
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
      title: 'Configuración de ventas', icon: '🛒',
      fields: [
        { key: 'invoiceSeries', label: 'Serie de facturas', type: 'text', placeholder: 'F' },
        { key: 'receiptSeries', label: 'Serie de recibos', type: 'text', placeholder: 'R' },
      ]
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando configuraciones...</div>
      </div>
    )
  }

  const currentSection = SECTIONS[activeSection]

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Section nav */}
      <div className="neu-card" style={{ width: 250, padding: '16px 12px', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', marginBottom: 8 }}>Configuración</div>
        {SECTIONS.map((s, i) => (
          <button key={s.title} onClick={() => setActiveSection(i)}
            className="sidebar-nav-item" style={{ marginBottom: 2, background: activeSection === i ? 'var(--bg-deep)' : undefined, color: activeSection === i ? 'var(--accent-blue)' : undefined, boxShadow: activeSection === i ? 'var(--neu-pressed)' : undefined }}>
            <span>{s.icon}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.title}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{ flex: 1 }}>
        <div className="neu-card" style={{ padding: '28px' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{currentSection.icon} {currentSection.title}</div>
          <div className="divider" style={{ margin: '14px 0 22px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {currentSection.fields.map(field => (
              <div key={field.key}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>{field.label}</label>
                {field.type === 'select' ? (
                  <select className="input-neu" value={form[field.key as keyof typeof form]} onChange={e => handleFieldChange(field.key as keyof typeof form, e.target.value)}>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input-neu" type={field.type} placeholder={field.placeholder} value={form[field.key as keyof typeof form]} onChange={e => handleFieldChange(field.key as keyof typeof form, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 16, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {saved && <div className="badge badge-green" style={{ padding: '10px 16px' }}>✓ Guardado</div>}
            <button className="btn-neu btn-primary" style={{ padding: '12px 28px' }} onClick={handleSave}>
              💾 Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
