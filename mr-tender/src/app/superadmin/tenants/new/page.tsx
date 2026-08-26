'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ALL_SYSTEM_MODULES, getDefaultModulesForBusinessType, getModuleIcon, resolveModuleToggle, getModuleById } from '@/lib/constants/modules'
import {
  ArrowLeft,
  Store,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Key,
  Layers,
  Globe,
  Check,
  RefreshCw
} from 'lucide-react'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Comercio General / Minimercado' },
  { value: 'optometry', label: 'Óptica, Consultorio Visual & Lentes' },
  { value: 'apparel', label: 'Boutique, Tienda de Ropa & Calzado' },
  { value: 'gym', label: 'Gimnasio, Centro Fitness & Crossfit' },
  { value: 'laundry', label: 'Lavandería, Tintorería & Planchado' },
  { value: 'automotive', label: 'Taller Mecánico, Serviteca & Autolavado' },
  { value: 'veterinary', label: 'Veterinaria, Pet Shop & Grooming' },
  { value: 'beauty_salon', label: 'Salón de Belleza, Barbería & Spa' },
  { value: 'restaurant', label: 'Restaurante, Cafetería & Bar' },
  { value: 'liquor_tobacco', label: 'Licorera, Estanco & Cigarrería' },
  { value: 'pharmacy', label: 'Droguería y Farmacia' },
  { value: 'hardware', label: 'Ferretería & Construcción' },
  { value: 'services', label: 'Prestador de Servicios' },
  { value: 'wholesale', label: 'Mayorista / Distribuidor' },
]

export default function NewTenantPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ email: string; pass: string; slug: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    business_type: 'retail',
    country: 'Colombia',
    status: 'active',
    owner_name: '',
    owner_email: '',
    phone: '',
    password: 'Password2026*'
  })

  const [modules, setModules] = useState<Record<string, boolean>>(() =>
    getDefaultModulesForBusinessType('retail')
  )
  const [moduleFilter, setModuleFilter] = useState<'all' | 'base' | 'vertical'>('all')
  const [dependencyNotice, setDependencyNotice] = useState<string | null>(null)

  function handleNameChange(name: string) {
    const autoSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    setForm(f => ({ ...f, name, slug: autoSlug }))
  }

  function handleBusinessTypeChange(bType: string) {
    setForm(f => ({ ...f, business_type: bType }))
    const defaultMods = getDefaultModulesForBusinessType(bType)
    setModules(defaultMods)
  }

  function toggleModule(modId: string) {
    const currentState = !!modules[modId]
    const targetState = !currentState
    const result = resolveModuleToggle(modId, targetState, modules)

    if (!targetState && result.blockedBy.length > 0) {
      const blockedNames = result.blockedBy.map(id => getModuleById(id)?.name.split('(')[0].trim() || id).join(', ')
      setDependencyNotice(`⚠️ No puedes desactivar "${getModuleById(modId)?.name}" porque es requerido por: ${blockedNames}.`)
      setTimeout(() => setDependencyNotice(null), 5000)
      return
    }

    if (targetState && result.autoEnabled.length > 0) {
      const autoNames = result.autoEnabled.map(id => getModuleById(id)?.name.split('(')[0].trim() || id).join(', ')
      setDependencyNotice(`ℹ️ Prerrequisitos activados: ${autoNames}`)
      setTimeout(() => setDependencyNotice(null), 4000)
    } else {
      setDependencyNotice(null)
    }

    setModules(result.updatedModules)
  }

  function applyPreset(preset: 'all' | 'base_only' | 'default') {
    if (preset === 'all') {
      const allTrue: Record<string, boolean> = {}
      ALL_SYSTEM_MODULES.forEach(m => { allTrue[m.id] = true })
      setModules(allTrue)
      setDependencyNotice('⚡ Se activaron todos los 25 módulos del sistema.')
    } else if (preset === 'base_only') {
      const baseOnly: Record<string, boolean> = {}
      ALL_SYSTEM_MODULES.forEach(m => { baseOnly[m.id] = m.group === 'base' })
      setModules(baseOnly)
      setDependencyNotice('✅ Se activaron los 13 módulos base y se desactivaron los verticales.')
    } else {
      setModules(getDefaultModulesForBusinessType(form.business_type))
      setDependencyNotice(`✅ Se aplicó la configuración recomendada para ${form.business_type}.`)
    }
    setTimeout(() => setDependencyNotice(null), 4000)
  }

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm(f => ({ ...f, password: pass }))
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('El nombre del negocio es obligatorio')
    if (!form.slug.trim()) return setError('El subdominio / slug es obligatorio')
    if (!form.owner_email.trim()) return setError('El correo del propietario es obligatorio')

    setSaving(true)
    setError(null)

    try {
      const { data: tenantId, error: createErr } = await supabase.rpc('superadmin_create_tenant', {
        p_name: form.name.trim(),
        p_slug: form.slug.toLowerCase().replace(/\s+/g, '-').trim(),
        p_owner_email: form.owner_email.trim().toLowerCase(),
        p_owner_name: form.owner_name.trim() || form.name.trim(),
        p_phone: form.phone.trim() || '',
        p_business_type: form.business_type,
        p_country: form.country,
        p_status: form.status,
        p_password: form.password || 'Soloc@li1'
      })

      if (createErr) throw createErr

      const { data: tenantData } = await supabase
        .from('platform_tenants')
        .select('id')
        .eq('slug', form.slug.toLowerCase().replace(/\s+/g, '-').trim())
        .single()

      const finalTenantId = tenantId || tenantData?.id

      if (finalTenantId) {
        await supabase.from('tenant_settings').upsert({
          tenant_id: finalTenantId,
          enabled_modules: modules
        }, { onConflict: 'tenant_id' })
      }

      setSuccessInfo({
        email: form.owner_email.trim().toLowerCase(),
        pass: form.password,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-').trim()
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al crear negocio en la plataforma')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link
          href="/superadmin/tenants"
          className="btn-neu btn-ghost"
          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span>Volver al Listado de Negocios</span>
        </Link>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Panel Superadmin • Alta de Inquilino
        </div>
      </div>

      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Crear Nuevo Negocio en la Plataforma
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>
          Configura los datos del comercio, credenciales del administrador y asigna los módulos que tendrá habilitados.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="neu-card" style={{ padding: 14, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Success View */}
      {successInfo ? (
        <div className="neu-card animate-scale-in" style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <CheckCircle2 size={40} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Negocio Creado Exitosamente
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 500, margin: 0 }}>
            El comercio ha sido registrado con sus módulos activados y su usuario administrador listo para operar.
          </p>

          <div style={{ background: 'var(--bg-deep)', padding: 18, borderRadius: 12, width: '100%', maxWidth: 450, textAlign: 'left', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Subdominio: </span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{successInfo.slug}.mrtender.com</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Usuario Administrador: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{successInfo.email}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Contraseña Inicial: </span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{successInfo.pass}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Link href="/superadmin/tenants" className="btn-neu btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem' }}>
              Volver a Lista de Negocios
            </Link>
          </div>
        </div>
      ) : (
        /* Creation Form */
        <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            
            {/* Card 1: Business Details */}
            <div className="neu-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                <Store size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Información del Comercio</h3>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Nombre Comercial del Negocio *
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Supermercado El Ahorro, Óptica Visual..."
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Subdominio / Slug URL *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="el-ahorro"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    required
                    style={{ flex: 1, fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>.mrtender.com</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Tipo de Comercio
                  </label>
                  <select
                    className="input-neu"
                    value={form.business_type}
                    onChange={e => handleBusinessTypeChange(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    {BUSINESS_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    País
                  </label>
                  <select
                    className="input-neu"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Colombia">Colombia (COP $)</option>
                    <option value="México">México (MXN $)</option>
                    <option value="Perú">Perú (PEN S/.)</option>
                    <option value="Chile">Chile (CLP $)</option>
                    <option value="Estados Unidos">USA (USD $)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Estado Inicial
                </label>
                <select
                  className="input-neu"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                >
                  <option value="active">Activo (Producción)</option>
                  <option value="trial">Período de Prueba (Trial)</option>
                </select>
              </div>
            </div>

            {/* Card 2: Administrator Credentials */}
            <div className="neu-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                <User size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Propietario / Administrador Principal</h3>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Nombre del Propietario
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Carlos Mendoza"
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Correo Electrónico de Acceso *
                </label>
                <input
                  type="email"
                  className="input-neu"
                  placeholder="propietario@empresa.com"
                  value={form.owner_email}
                  onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: 3001234567"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Contraseña Inicial *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="btn-neu btn-ghost"
                    style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                  >
                    Generar Segura
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="text"
                    className="input-neu"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    style={{ flex: 1, fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Esta contraseña servirá para que el cliente ingrese por primera vez.
                </div>
              </div>
            </div>

          </div>

          {/* Card 3: Modular Architecture (Base vs Verticales) */}
          <div className="neu-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    Asignación de Módulos ({Object.values(modules).filter(Boolean).length} / {ALL_SYSTEM_MODULES.length} Activos)
                  </h3>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🟢 Base: <strong>{ALL_SYSTEM_MODULES.filter(m => m.group === 'base' && modules[m.id]).length}/13</strong></span>
                  <span>•</span>
                  <span>🟣 Verticales: <strong>{ALL_SYSTEM_MODULES.filter(m => m.group === 'vertical' && modules[m.id]).length}/12</strong></span>
                </div>
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applyPreset('base_only')}
                  className="btn-neu btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                >
                  🟢 Solo Base (13)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('default')}
                  className="btn-neu btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                >
                  🎯 Según Giro ({form.business_type})
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="btn-neu btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700 }}
                >
                  Activar Todos (25)
                </button>
              </div>
            </div>

            {/* Segmented Filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setModuleFilter('all')}
                className="btn-neu"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: moduleFilter === 'all' ? 700 : 500,
                  background: moduleFilter === 'all' ? 'var(--text-primary)' : 'var(--bg-deep)',
                  color: moduleFilter === 'all' ? 'var(--bg)' : 'var(--text-secondary)'
                }}
              >
                Todos ({Object.values(modules).filter(Boolean).length}/25)
              </button>

              <button
                type="button"
                onClick={() => setModuleFilter('base')}
                className="btn-neu"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: moduleFilter === 'base' ? 700 : 500,
                  background: moduleFilter === 'base' ? 'var(--text-primary)' : 'var(--bg-deep)',
                  color: moduleFilter === 'base' ? 'var(--bg)' : 'var(--text-secondary)'
                }}
              >
                🟢 Módulos Base / Indispensables ({ALL_SYSTEM_MODULES.filter(m => m.group === 'base' && modules[m.id]).length}/13)
              </button>

              <button
                type="button"
                onClick={() => setModuleFilter('vertical')}
                className="btn-neu"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: moduleFilter === 'vertical' ? 700 : 500,
                  background: moduleFilter === 'vertical' ? 'var(--text-primary)' : 'var(--bg-deep)',
                  color: moduleFilter === 'vertical' ? 'var(--bg)' : 'var(--text-secondary)'
                }}
              >
                🟣 Módulos Verticales / Especializados ({ALL_SYSTEM_MODULES.filter(m => m.group === 'vertical' && modules[m.id]).length}/12)
              </button>
            </div>

            {dependencyNotice && (
              <div style={{
                background: dependencyNotice.startsWith('⚠️') ? 'var(--accent-coral-lt)' : 'var(--bg-deep)',
                border: '1px solid var(--border-color)',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                {dependencyNotice}
              </div>
            )}

            {/* 🟢 SECCIÓN BASE */}
            {(moduleFilter === 'all' || moduleFilter === 'base') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                  <span style={{ fontSize: '0.9rem' }}>🟢</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    Módulos Base (Indispensables para Todo Comercio)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {ALL_SYSTEM_MODULES.filter(m => m.group === 'base').map(m => {
                    const isEnabled = !!modules[m.id]
                    const IconComponent = getModuleIcon(m.id)
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        style={{
                          background: isEnabled ? 'var(--bg)' : 'var(--bg-deep)',
                          border: isEnabled ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <IconComponent size={17} strokeWidth={2} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                              {m.name}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.2, marginTop: 2 }}>
                              {m.description}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: isEnabled ? 'var(--text-primary)' : 'var(--bg)',
                          border: isEnabled ? 'none' : '1.5px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--bg)',
                          flexShrink: 0
                        }}>
                          {isEnabled && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 🟣 SECCIÓN VERTICAL */}
            {(moduleFilter === 'all' || moduleFilter === 'vertical') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: moduleFilter === 'all' ? 8 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                  <span style={{ fontSize: '0.9rem' }}>🟣</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    Módulos Verticales (Especializados por Giro)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {ALL_SYSTEM_MODULES.filter(m => m.group === 'vertical').map(m => {
                    const isEnabled = !!modules[m.id]
                    const IconComponent = getModuleIcon(m.id)
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        style={{
                          background: isEnabled ? 'var(--bg)' : 'var(--bg-deep)',
                          border: isEnabled ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <IconComponent size={17} strokeWidth={2} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                {m.name}
                              </span>
                              <span style={{ fontSize: '0.6rem', background: 'var(--accent-purple-lt, rgba(168,85,247,0.12))', color: 'var(--accent-purple, #9333ea)', padding: '1px 5px', borderRadius: 4, fontWeight: 700, border: '1px solid var(--border-color)' }}>
                                {m.categoryName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.2, marginTop: 2 }}>
                              {m.description}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: isEnabled ? 'var(--text-primary)' : 'var(--bg)',
                          border: isEnabled ? 'none' : '1.5px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--bg)',
                          flexShrink: 0
                        }}>
                          {isEnabled && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Action Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 24 }}>
            <Link href="/superadmin/tenants" className="btn-neu btn-ghost" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-neu btn-primary"
              style={{ padding: '10px 30px', fontSize: '0.88rem', fontWeight: 700 }}
            >
              {saving ? 'Creando Negocio...' : 'Crear Negocio y Activar Módulos'}
            </button>
          </div>
        </form>
      )}

    </div>
  )
}
