'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { ALL_SYSTEM_MODULES, getModuleIcon } from '@/lib/constants/modules'
import {
  ArrowLeft,
  Store,
  CheckCircle2,
  AlertCircle,
  Layers,
  Check,
  RefreshCw,
  Trash2,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  owner_name: string
  owner_email: string
  phone: string
  business_type: string
  country: string
  status: string
  created_at: string
}

interface TenantUser {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  trial: 'En Prueba',
  cancelled: 'Cancelado',
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'modules' | 'users' | 'danger'>('info')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Tenant Edit Form
  const [form, setForm] = useState({
    name: '',
    slug: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    business_type: '',
    country: 'Colombia',
    status: 'active'
  })

  // Password reset
  const [newPassword, setNewPassword] = useState('')

  // 21 Modules Map
  const [modules, setModules] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (tenantId) {
      loadTenantData()
    }
  }, [tenantId])

  async function loadTenantData() {
    try {
      setLoading(true)
      setMessage(null)

      const [tenantRes, settingsRes, usersRes] = await Promise.all([
        supabase.from('platform_tenants').select('*').eq('id', tenantId).single(),
        supabase.from('tenant_settings').select('enabled_modules').eq('tenant_id', tenantId).limit(1),
        supabase.from('profiles').select('id, email, full_name, role, created_at').eq('tenant_id', tenantId)
      ])

      if (tenantRes.error) throw tenantRes.error
      const t = tenantRes.data
      setTenant(t)
      setForm({
        name: t.name || '',
        slug: t.slug || '',
        owner_name: t.owner_name || '',
        owner_email: t.owner_email || '',
        phone: t.phone || '',
        business_type: t.business_type || 'retail',
        country: t.country || 'Colombia',
        status: t.status || 'active'
      })

      // Load Modules
      const defaultMods: Record<string, boolean> = {}
      ALL_SYSTEM_MODULES.forEach(m => { defaultMods[m.id] = m.defaultEnabled })

      if (settingsRes.data?.[0]?.enabled_modules) {
        setModules({ ...defaultMods, ...settingsRes.data[0].enabled_modules })
      } else {
        setModules(defaultMods)
      }

      setTenantUsers(usersRes.data || [])
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error cargando negocio' })
    } finally {
      setLoading(false)
    }
  }

  // Update General Info
  async function handleSaveGeneralInfo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('superadmin_update_tenant', {
        p_tenant_id: tenantId,
        p_name: form.name.trim(),
        p_owner_name: form.owner_name.trim(),
        p_owner_email: form.owner_email.trim().toLowerCase(),
        p_phone: form.phone.trim(),
        p_business_type: form.business_type,
        p_country: form.country
      })

      if (error) throw error

      if (tenant && tenant.status !== form.status) {
        await supabase.rpc('superadmin_update_tenant_status', {
          p_tenant_id: tenantId,
          p_status: form.status
        })
      }

      setMessage({ type: 'success', text: 'Información del negocio guardada exitosamente.' })
      await loadTenantData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar cambios' })
    } finally {
      setSaving(false)
    }
  }

  // Reset Admin Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('superadmin_create_user', {
        p_email: form.owner_email.trim().toLowerCase(),
        p_password: newPassword.trim(),
        p_full_name: form.owner_name.trim(),
        p_role: 'admin',
        p_tenant_id: tenantId
      })

      if (error) throw error
      setMessage({ type: 'success', text: `Contraseña de "${form.owner_email}" restablecida exitosamente.` })
      setNewPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al restablecer contraseña' })
    } finally {
      setSaving(false)
    }
  }

  // Toggle and Save Single Module
  async function handleToggleModule(modId: string) {
    const nextModules = { ...modules, [modId]: !modules[modId] }
    setModules(nextModules)

    try {
      await supabase.from('tenant_settings').upsert({
        tenant_id: tenantId,
        enabled_modules: nextModules
      }, { onConflict: 'tenant_id' })
    } catch (err: any) {
      console.error('Error auto-saving module:', err)
    }
  }

  // Save All Modules
  async function handleSaveAllModules() {
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('superadmin_update_tenant_modules', {
        p_tenant_id: tenantId,
        p_modules: modules
      })

      if (error) throw error
      setMessage({ type: 'success', text: 'Módulos del sistema actualizados y sincronizados.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar módulos' })
    } finally {
      setSaving(false)
    }
  }

  // Delete Tenant
  async function handleDeleteTenant() {
    if (!tenant) return
    const confirmation = prompt(`Escribe el nombre del negocio "${tenant.name}" para confirmar la eliminación permanente:`)
    if (confirmation !== tenant.name) return alert('Confirmación incorrecta. No se eliminó el negocio.')

    setSaving(true)
    try {
      const { error } = await supabase.rpc('superadmin_delete_tenant', { p_tenant_id: tenantId })
      if (error) throw error
      router.push('/superadmin/tenants')
    } catch (err: any) {
      alert('Error eliminando negocio: ' + err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="neu-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <div>Cargando panel de gestión del negocio...</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Negocio no encontrado</h2>
        <Link href="/superadmin/tenants" className="btn-neu btn-primary" style={{ marginTop: 12 }}>
          Volver a Negocios
        </Link>
      </div>
    )
  }

  const activeModulesCount = Object.values(modules).filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      
      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link
          href="/superadmin/tenants"
          className="btn-neu btn-ghost"
          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span>Volver al Listado</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subdominio:</span>
          <a
            href={`https://${tenant.slug}.mrtender.com`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span>{tenant.slug}.mrtender.com</span>
            <ArrowUpRight size={12} strokeWidth={2} />
          </a>
        </div>
      </div>

      {/* Tenant Header Card - Minimalist */}
      <div className="neu-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={22} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {tenant.name}
              </h1>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Giro: <strong>{tenant.business_type}</strong> • Creado el {formatDate(tenant.created_at)} • {tenant.country}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'var(--bg-deep)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}>
            {STATUS_LABEL[tenant.status] || tenant.status}
          </span>
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <div className="neu-card animate-scale-in" style={{
          padding: 12,
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} strokeWidth={2} /> : <AlertCircle size={16} strokeWidth={2} />}
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {message.text}
          </span>
        </div>
      )}

      {/* Dedicated Navigation Tabs - Monochrome */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('info')}
          className="btn-neu"
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'info' ? 700 : 500,
            background: activeTab === 'info' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'info' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Store size={15} strokeWidth={2} />
          <span>Configuración & Datos</span>
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className="btn-neu"
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'modules' ? 700 : 500,
            background: activeTab === 'modules' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'modules' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Layers size={15} strokeWidth={2} />
          <span>Módulos del Sistema ({activeModulesCount}/{ALL_SYSTEM_MODULES.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className="btn-neu"
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'users' ? 700 : 500,
            background: activeTab === 'users' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'users' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Users size={15} strokeWidth={2} />
          <span>Personal & Usuarios ({tenantUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('danger')}
          className="btn-neu"
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'danger' ? 700 : 500,
            background: activeTab === 'danger' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'danger' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={15} strokeWidth={2} />
          <span>Zona de Seguridad</span>
        </button>
      </div>

      {/* ── TAB 1: CONFIGURACIÓN GENERAL & DATOS ── */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          
          {/* Edit Tenant Form */}
          <div className="neu-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Editar Datos del Comercio</h3>
            
            <form onSubmit={handleSaveGeneralInfo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Nombre Comercial
                </label>
                <input
                  type="text"
                  className="input-neu"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Propietario / Representante
                </label>
                <input
                  type="text"
                  className="input-neu"
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    Correo Acceso
                  </label>
                  <input
                    type="email"
                    className="input-neu"
                    value={form.owner_email}
                    onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    className="input-neu"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    Estado
                  </label>
                  <select
                    className="input-neu"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="active">Activo</option>
                    <option value="trial">En Prueba</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    País
                  </label>
                  <input
                    type="text"
                    className="input-neu"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-neu btn-primary"
                style={{ padding: '9px 18px', fontSize: '0.82rem', marginTop: 6 }}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios del Negocio'}
              </button>
            </form>
          </div>

          {/* Reset Password Card */}
          <div className="neu-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Restablecer Contraseña de Administrador</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Genera o asigna una nueva contraseña para el correo principal ({form.owner_email}).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Nueva Contraseña
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Escribe la nueva contraseña..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !newPassword}
                className="btn-neu"
                style={{ padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Actualizar Contraseña
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ── TAB 2: GESTIÓN DE 21 MÓDULOS MONOCHROME ── */}
      {activeTab === 'modules' && (
        <div className="neu-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                Control Modular en Tiempo Real ({activeModulesCount}/{ALL_SYSTEM_MODULES.length} Activos)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Cada interruptor activa o desactiva de forma inmediata el acceso a los módulos.
              </p>
            </div>

            <button
              onClick={handleSaveAllModules}
              disabled={saving}
              className="btn-neu btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              {saving ? 'Guardando...' : 'Sincronizar Módulos'}
            </button>
          </div>

          {/* Grid of 21 Modules with Monochrome Lucide Icons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {ALL_SYSTEM_MODULES.map(m => {
              const isEnabled = !!modules[m.id]
              const IconComponent = getModuleIcon(m.id)
              return (
                <div
                  key={m.id}
                  onClick={() => handleToggleModule(m.id)}
                  style={{
                    background: isEnabled ? 'var(--bg)' : 'var(--bg-deep)',
                    border: isEnabled ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IconComponent size={20} strokeWidth={2} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.2, marginTop: 2 }}>
                        {m.description}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: isEnabled ? 'var(--text-primary)' : 'var(--bg)',
                    border: isEnabled ? 'none' : '1.5px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bg)',
                    flexShrink: 0
                  }}>
                    {isEnabled && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: PERSONAL & USUARIOS DEL NEGOCIO ── */}
      {activeTab === 'users' && (
        <div className="neu-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
            Usuarios y Colaboradores Registrados ({tenantUsers.length})
          </h3>

          {tenantUsers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: '0.82rem' }}>
              No hay usuarios adicionales registrados en este comercio.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Usuario</th>
                    <th style={{ padding: 8 }}>Email</th>
                    <th style={{ padding: 8 }}>Rol</th>
                    <th style={{ padding: 8 }}>Fecha Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{u.full_name || 'Sin nombre'}</td>
                      <td style={{ padding: 8 }}>{u.email}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: 8, color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ZONA DE SEGURIDAD ── */}
      {activeTab === 'danger' && (
        <div className="neu-card" style={{ padding: 24, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Zona de Seguridad / Baja de Comercio
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Acciones permanentes que afectan la disponibilidad de datos de este inquilino.
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--bg-deep)', padding: 16, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Eliminar Inquilino Permanentemente
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Borra la base de datos, ventas, inventario, productos y usuarios asociados a este negocio.
              </div>
            </div>

            <button
              onClick={handleDeleteTenant}
              disabled={saving}
              className="btn-neu"
              style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Eliminar Comercio
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
