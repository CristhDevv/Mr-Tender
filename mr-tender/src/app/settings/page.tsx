'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'
import { ALL_SYSTEM_MODULES, getModuleIcon, resolveModuleToggle, getModuleById } from '@/lib/constants/modules'
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
  Wine,
  Scissors,
  Dog,
  Car,
  Shirt,
  Dumbbell,
  Footprints,
  Glasses,
  Croissant,
  Briefcase,
  TrendingUp,
  Landmark,
  AlertTriangle,
  Info,
  Database,
  Download
} from 'lucide-react'
import Link from 'next/link'
import ContingencyBackupModal from '@/components/ContingencyBackupModal'

export default function SettingsPage() {
  const supabase = createClient()
  const [activeSection, setActiveSection] = useState(0)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [dependencyNotice, setDependencyNotice] = useState<string | null>(null)
  const [moduleFilter, setModuleFilter] = useState<'all' | 'base' | 'vertical'>('all')
  const [tenantId, setTenantId] = useState('')
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    const defaultMods: Record<string, boolean> = {}
    ALL_SYSTEM_MODULES.forEach(m => {
      defaultMods[m.id] = m.defaultEnabled
    })
    return defaultMods
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

        let tid = user.user_metadata?.tenant_id
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
          if (row.enabled_modules) {
            const defaultMods: Record<string, boolean> = {}
            ALL_SYSTEM_MODULES.forEach(m => { defaultMods[m.id] = m.defaultEnabled })
            setEnabledModules({ ...defaultMods, ...row.enabled_modules })
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
    {
      title: 'Respaldo de Contingencia', Icon: Database,
      isBackup: true
    }
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
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--text-primary)' : 'var(--bg)',
                color: isActive ? 'var(--bg)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
              }}>
              <SectionIcon size={15} strokeWidth={2} />
              <span>{s.title}</span>
            </button>
          )
        })}
      </div>

      {/* Form Content */}
      <div className="neu-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
          <CurrentSectionIcon size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
          <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{currentSection.title}</h2>
        </div>

        {currentSection.isModules ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header & Segmented Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Activa o desactiva las funcionalidades de tu negocio. Los cambios se reflejarán inmediatamente en tu menú lateral.
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>🟢 Base: <strong>{ALL_SYSTEM_MODULES.filter(m => m.group === 'base' && enabledModules[m.id]).length}/13</strong></span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>🟣 Verticales: <strong>{ALL_SYSTEM_MODULES.filter(m => m.group === 'vertical' && enabledModules[m.id]).length}/12</strong></span>
                </div>
              </div>

              {/* Segmented Filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setModuleFilter('all')}
                  className="btn-neu"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: moduleFilter === 'all' ? 700 : 500,
                    background: moduleFilter === 'all' ? 'var(--text-primary)' : 'var(--bg-deep)',
                    color: moduleFilter === 'all' ? 'var(--bg)' : 'var(--text-secondary)'
                  }}
                >
                  Todos ({Object.values(enabledModules).filter(Boolean).length}/25)
                </button>

                <button
                  type="button"
                  onClick={() => setModuleFilter('base')}
                  className="btn-neu"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: moduleFilter === 'base' ? 700 : 500,
                    background: moduleFilter === 'base' ? 'var(--text-primary)' : 'var(--bg-deep)',
                    color: moduleFilter === 'base' ? 'var(--bg)' : 'var(--text-secondary)'
                  }}
                >
                  🟢 Módulos Base / Indispensables ({ALL_SYSTEM_MODULES.filter(m => m.group === 'base' && enabledModules[m.id]).length}/13)
                </button>

                <button
                  type="button"
                  onClick={() => setModuleFilter('vertical')}
                  className="btn-neu"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: moduleFilter === 'vertical' ? 700 : 500,
                    background: moduleFilter === 'vertical' ? 'var(--text-primary)' : 'var(--bg-deep)',
                    color: moduleFilter === 'vertical' ? 'var(--bg)' : 'var(--text-secondary)'
                  }}
                >
                  🟣 Módulos Verticales / Especializados ({ALL_SYSTEM_MODULES.filter(m => m.group === 'vertical' && enabledModules[m.id]).length}/12)
                </button>
              </div>
            </div>

            {dependencyNotice && (
              <div style={{
                background: dependencyNotice.startsWith('⚠️') ? 'var(--accent-coral-lt)' : 'var(--bg-deep)',
                color: 'var(--text-primary)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--border-color)'
              }}>
                <span>{dependencyNotice}</span>
              </div>
            )}

            {/* 🟢 SECCIÓN 1: MÓDULOS BASE (INDISPENSABLES) */}
            {(moduleFilter === 'all' || moduleFilter === 'base') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '1rem' }}>🟢</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      Módulos Base & Operativos
                    </span>
                    <span style={{ fontSize: '0.65rem', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                      INDISPENSABLES
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Herramientas transversales necesarias para facturación, caja, control de existencias, compras, cartera y contabilidad.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {ALL_SYSTEM_MODULES.filter(m => m.group === 'base').map(m => {
                    const IconComponent = getModuleIcon(m.id)
                    const isEnabled = !!enabledModules[m.id]
                    const requiresNames = m.requires?.map(reqId => getModuleById(reqId)?.name.split('(')[0].trim() || reqId) || []

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          const currentState = !!enabledModules[m.id]
                          const targetState = !currentState
                          const result = resolveModuleToggle(m.id, targetState, enabledModules)

                          if (!targetState && result.blockedBy.length > 0) {
                            const blockedNames = result.blockedBy.map(id => getModuleById(id)?.name.split('(')[0].trim() || id).join(', ')
                            setDependencyNotice(`⚠️ No puedes desactivar "${m.name}" porque es requerido por: ${blockedNames}. Desactiva primero esos módulos.`)
                            setTimeout(() => setDependencyNotice(null), 6000)
                            return
                          }

                          if (targetState && result.autoEnabled.length > 0) {
                            const autoNames = result.autoEnabled.map(id => getModuleById(id)?.name.split('(')[0].trim() || id).join(', ')
                            setDependencyNotice(`ℹ️ Se activaron automáticamente los prerrequisitos: ${autoNames}`)
                            setTimeout(() => setDependencyNotice(null), 5000)
                          } else {
                            setDependencyNotice(null)
                          }

                          setEnabledModules(result.updatedModules)
                        }}
                        className="neu-card"
                        style={{
                          padding: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          border: isEnabled ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
                          background: isEnabled ? 'var(--bg)' : 'var(--bg-deep)',
                          transition: '0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: 'var(--bg-deep)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <IconComponent size={16} strokeWidth={2} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{m.name}</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.25, marginBottom: requiresNames.length > 0 ? 4 : 0 }}>
                              {m.description}
                            </div>
                            {requiresNames.length > 0 && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>🔗 Requiere:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{requiresNames.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <div style={{
                          width: 34,
                          height: 18,
                          borderRadius: 9,
                          background: isEnabled ? 'var(--text-primary)' : 'var(--border-color)',
                          position: 'relative',
                          flexShrink: 0,
                          transition: '0.2s'
                        }}>
                          <div style={{
                            width: 12,
                            height: 12,
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
            )}

            {/* 🟣 SECCIÓN 2: MÓDULOS VERTICALES (ESPECIALIZADOS) */}
            {(moduleFilter === 'all' || moduleFilter === 'vertical') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginTop: moduleFilter === 'all' ? 12 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '1rem' }}>🟣</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      Módulos Verticales & Especializados por Giro
                    </span>
                    <span style={{ fontSize: '0.65rem', background: 'var(--accent-purple-lt, rgba(168,85,247,0.12))', color: 'var(--accent-purple, #9333ea)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                      POR INDUSTRIA
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Activa únicamente el vertical que pertenezca a la actividad económica de tu negocio.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {ALL_SYSTEM_MODULES.filter(m => m.group === 'vertical').map(m => {
                    const IconComponent = getModuleIcon(m.id)
                    const isEnabled = !!enabledModules[m.id]
                    const requiresNames = m.requires?.map(reqId => getModuleById(reqId)?.name.split('(')[0].trim() || reqId) || []

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          const currentState = !!enabledModules[m.id]
                          const targetState = !currentState
                          const result = resolveModuleToggle(m.id, targetState, enabledModules)

                          if (!targetState && result.blockedBy.length > 0) {
                            const blockedNames = result.blockedBy.map(id => getModuleById(id)?.name.split('(')[0].trim() || id).join(', ')
                            setDependencyNotice(`⚠️ No puedes desactivar "${m.name}" porque es requerido por: ${blockedNames}. Desactiva primero esos módulos.`)
                            setTimeout(() => setDependencyNotice(null), 6000)
                            return
                          }

                          if (targetState && result.autoEnabled.length > 0) {
                            const autoNames = result.autoEnabled.map(id => getModuleById(id)?.name.split('(')[0].trim() || id).join(', ')
                            setDependencyNotice(`ℹ️ Se activaron automáticamente los prerrequisitos: ${autoNames}`)
                            setTimeout(() => setDependencyNotice(null), 5000)
                          } else {
                            setDependencyNotice(null)
                          }

                          setEnabledModules(result.updatedModules)
                        }}
                        className="neu-card"
                        style={{
                          padding: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          border: isEnabled ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
                          background: isEnabled ? 'var(--bg)' : 'var(--bg-deep)',
                          transition: '0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: 'var(--bg-deep)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <IconComponent size={16} strokeWidth={2} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{m.name}</span>
                              <span style={{ fontSize: '0.62rem', background: 'var(--accent-purple-lt, rgba(168,85,247,0.12))', color: 'var(--accent-purple, #9333ea)', padding: '1px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid var(--border-color)' }}>
                                {m.categoryName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.25, marginBottom: requiresNames.length > 0 ? 4 : 0 }}>
                              {m.description}
                            </div>
                            {requiresNames.length > 0 && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>🔗 Requiere:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{requiresNames.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <div style={{
                          width: 34,
                          height: 18,
                          borderRadius: 9,
                          background: isEnabled ? 'var(--text-primary)' : 'var(--border-color)',
                          position: 'relative',
                          flexShrink: 0,
                          transition: '0.2s'
                        }}>
                          <div style={{
                            width: 12,
                            height: 12,
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
            )}

          </div>
        ) : (currentSection as any).isBackup ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="neu-flat" style={{ padding: 18, borderRadius: 'var(--radius-md)', background: 'var(--bg-deep)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Database size={22} style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Copia de Seguridad y Contingencia Local
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Exporta una copia completa de tus productos, clientes, ventas y configuraciones en formato JSON cifrado/descargable para contingencia fuera de línea.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-neu btn-primary"
                  onClick={() => setShowBackupModal(true)}
                  style={{ padding: '10px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Download size={16} />
                  <span>Generar y Descargar Respaldo Local (JSON)</span>
                </button>
              </div>
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

      <ContingencyBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        tenantId={tenantId}
      />
    </div>
  )
}
