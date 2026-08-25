'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'
import {
  Building2,
  DollarSign,
  Receipt,
  ShoppingCart,
  Smartphone,
  Save,
  Check,
  ExternalLink,
  Layers,
  Wrench,
  Pill,
  UtensilsCrossed,
  Globe,
  Wine
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const supabase = createClient()
  const [activeSection, setActiveSection] = useState(0)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
    pos: true,
    inventory: true,
    cash: true,
    customers: true,
    suppliers: true,
    purchases: true,
    employees: true,
    accounting: true,
    reports: true,
    ecommerce: false,
    pharmacy: false,
    hardware: true,
    liquor_tobacco: true,
    restaurant: false
  })

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
    dianSoftwarePin: '12345',
    dianTechnicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
    dianEnvironment: '2', // 1: Prod, 2: Hab
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
          if (row.enabled_modules) {
            setEnabledModules(prev => ({ ...prev, ...row.enabled_modules }))
          }
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
            dianSoftwarePin: row.fiscal_config?.software_pin || '12345',
            dianTechnicalKey: row.fiscal_config?.technical_key || 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
            dianEnvironment: row.fiscal_config?.environment || '2',
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
        enabled_modules: enabledModules,
        fiscal_config: {
          software_pin: form.dianSoftwarePin,
          technical_key: form.dianTechnicalKey,
          environment: form.dianEnvironment,
          dv: calculateNITVerificationDigit(form.taxId || form.dianNit || '901234567')
        }
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
      title: 'Módulos de Negocio', Icon: Layers,
      isModules: true
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
        { key: 'dianEnvironment', label: 'Ambiente DIAN', type: 'select', options: ['2 - Habilitación / Pruebas', '1 - Producción Oficial'] },
        { key: 'dianNit', label: 'NIT Emisor DIAN', type: 'text', placeholder: 'Ej: 901234567' },
        { key: 'dianRegimen', label: 'Régimen Fiscal', type: 'select', options: ['No Responsable de IVA', 'Responsable de IVA (Común)', 'Régimen Simple de TRIBUTACIÓN (RST)'] },
        { key: 'dianResolution', label: 'Resolución DIAN Nº', type: 'text', placeholder: '18760000001' },
        { key: 'dianPrefix', label: 'Prefijo Autorizado', type: 'text', placeholder: 'SETP' },
        { key: 'dianRangeFrom', label: 'Desde (Nº Inicial)', type: 'number', placeholder: '1' },
        { key: 'dianRangeTo', label: 'Hasta (Nº Final)', type: 'number', placeholder: '5000' },
        { key: 'dianSoftwareId', label: 'ID Software Habilitado DIAN', type: 'text', placeholder: 'ID de Software' },
        { key: 'dianSoftwarePin', label: 'PIN del Software DIAN (5 dígitos)', type: 'text', placeholder: '12345' },
        { key: 'dianTechnicalKey', label: 'Clave Técnica DIAN', type: 'text', placeholder: 'Clave técnica alfanumérica' },
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

  const SYSTEM_MODULES = [
    { id: 'hardware', name: 'Ferretería & Construcción', icon: Wrench, color: 'var(--accent-blue)', desc: 'Cotizaciones de obra, venta por metros/kilos, escalas y alquiler de herramientas' },
    { id: 'pharmacy', name: 'Droguería & Farmacia', icon: Pill, color: 'var(--accent-purple)', desc: 'Control de lotes, FEFO, INVIMA, venta por blíster/tableta y genéricos' },
    { id: 'liquor_tobacco', name: 'Licorera & Estanco', icon: Wine, color: 'var(--accent-coral)', desc: 'Control de botellas en barra / copeo, envases retornables, combos y tabaco' },
    { id: 'restaurant', name: 'Restaurante & Mesas', icon: UtensilsCrossed, color: 'var(--accent-amber)', desc: 'Mapa de mesas, comandas de cocina KDS, recetas y propinas' },
    { id: 'ecommerce', name: 'E-commerce & Tienda Web', icon: Globe, color: 'var(--accent-green)', desc: 'Catálogo público en línea con pedidos directos a WhatsApp' },
    { id: 'purchases', name: 'Compras & Proveedores', icon: ShoppingCart, color: 'var(--text-primary)', desc: 'Registro de facturas de compra, abastecimiento y proveedores' },
    { id: 'accounting', name: 'Contabilidad Automatizada', icon: DollarSign, color: 'var(--accent-blue)', desc: 'Plan de cuentas, balance general y generación de asientos contables' },
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
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.3 }}>Ajustes generales, módulos de negocio, facturación DIAN y pagos</p>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            <CurrentSectionIcon size={17} strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
            <span>{currentSection.title}</span>
          </div>
          {currentSection.title === 'Facturación DIAN' && (
            <Link
              href="/invoices"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={13} />
              <span>Ver Panel de Facturación DIAN</span>
            </Link>
          )}
        </div>

        <div className="divider" style={{ margin: '6px 0 14px' }} />

        {currentSection.isModules ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Activa o desactiva los módulos según el modelo operativo de tu empresa. Los módulos habilitados aparecerán automáticamente en tu menú lateral y en el Punto de Venta.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {SYSTEM_MODULES.map(m => {
                const isEnabled = !!enabledModules[m.id]
                const IconComponent = m.icon
                return (
                  <div
                    key={m.id}
                    onClick={() => setEnabledModules(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                    className="neu-card"
                    style={{
                      padding: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      border: isEnabled ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                      background: isEnabled ? 'var(--bg-deep)' : 'var(--bg)',
                      transition: '0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isEnabled ? `${m.color}15` : 'var(--bg-deep)',
                        color: isEnabled ? m.color : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconComponent size={19} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 2 }}>{m.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{m.desc}</div>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div style={{
                      width: 38,
                      height: 22,
                      borderRadius: 12,
                      background: isEnabled ? m.color : 'var(--border-color)',
                      position: 'relative',
                      flexShrink: 0,
                      marginTop: 2,
                      transition: '0.2s'
                    }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: 3,
                        left: isEnabled ? 19 : 3,
                        transition: '0.2s'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {currentSection.fields?.map(field => (
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
        )}

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
