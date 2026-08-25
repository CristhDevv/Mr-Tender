'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Tenant {
  id: string; name: string; slug: string; owner_name: string;
  owner_email: string; phone: string; business_type: string;
  country: string; status: string; created_at: string;
}

const EMPTY_FORM = {
  name: '', slug: '', owner_email: '', owner_name: '',
  phone: '', business_type: '', country: 'Colombia', status: 'trial',
  password: 'Soloc@li1'
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'rgba(74,186,134,0.12)',  color: 'var(--accent-emerald)', label: 'Activo' },
  suspended: { bg: 'rgba(235,94,85,0.12)',   color: 'var(--accent-coral)',   label: 'Suspendido' },
  trial:     { bg: 'rgba(242,193,78,0.12)',  color: 'var(--accent-gold)',    label: 'En Prueba' },
  cancelled: { bg: 'var(--border-color)',    color: 'var(--text-muted)',     label: 'Cancelado' },
}

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--bg)', borderRadius: 20, padding: 32, width: '100%',
  maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20,
  boxShadow: 'var(--neu-card)', maxHeight: '90vh', overflowY: 'auto',
}

const AVAILABLE_MODULES = [
  { id: 'pos', name: 'Punto de Venta (POS)', icon: '🛒', description: 'Venta rápida, escaneo y tickets' },
  { id: 'inventory', name: 'Inventario & Kardex', icon: '📦', description: 'Stock, Kardex, ajustes y traslados' },
  { id: 'cash', name: 'Caja & Turnos', icon: '💵', description: 'Aperturas, arqueos y control de efectivo' },
  { id: 'customers', name: 'Clientes & Fiados', icon: '👥', description: 'Libreta de fiao, abonos y WhatsApp' },
  { id: 'suppliers', name: 'Proveedores', icon: '🚚', description: 'Directorio y contactos de proveedores' },
  { id: 'purchases', name: 'Compras', icon: '🛍️', description: 'Registro de compras y costos' },
  { id: 'employees', name: 'Empleados & Asistencia', icon: '⏰', description: 'Control de personal y fichajes' },
  { id: 'reports', name: 'Reportes & Analítica', icon: '📊', description: 'Ventas, márgenes y exportación' },
  { id: 'accounting', name: 'Contabilidad', icon: '📈', description: 'Plan de cuentas y asientos automáticos' },
  { id: 'ecommerce', name: 'E-commerce / Catálogo Web', icon: '🌐', description: 'Tienda virtual con pedidos por WhatsApp' },
  { id: 'pharmacy', name: 'Droguería & Farmacia', icon: '💊', description: 'Lotes, FEFO, INVIMA, genéricos y controlados' },
  { id: 'hardware', name: 'Ferretería & Construcción', icon: '🔩', description: 'Venta por metros/kilos, cotizaciones a contratistas, alquiler de herramientas' },
  { id: 'liquor_tobacco', name: 'Licorera & Estanco', icon: '🍷', description: 'Control de copeo en barra, envases retornables, combos y tabaco' },
  { id: 'restaurant', name: 'Restaurante & Mesas', icon: '🍽️', description: 'Mesas, comandas y cocina' },
  { id: 'beauty_salon', name: 'Salón de Belleza & Spa', icon: '💇', description: 'Agenda de citas, estilistas, comisiones y fichas técnicas capilares' },
  { id: 'veterinary', name: 'Veterinaria & Pet Shop', icon: '🐾', description: 'Historias clínicas, carnet de vacunas, peluquería canina y alimento a granel' },
]

export default function TenantsAdminPage() {
  const supabase = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [createdInfo, setCreatedInfo] = useState<{ email: string; pass: string } | null>(null)

  // Modal state
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Modules Modal state
  const [selectedTenantForModules, setSelectedTenantForModules] = useState<Tenant | null>(null)
  const [tenantModules, setTenantModules] = useState<Record<string, boolean>>({})
  const [loadingModules, setLoadingModules] = useState(false)
  const [savingModules, setSavingModules] = useState(false)

  useEffect(() => { fetchTenants() }, [])

  async function fetchTenants() {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('platform_tenants').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTenants(data || [])
    setLoading(false)
  }

  async function openModulesModal(t: Tenant) {
    setSelectedTenantForModules(t)
    setLoadingModules(true)
    try {
      const { data } = await supabase
        .from('tenant_settings')
        .select('enabled_modules')
        .eq('tenant_id', t.id)
        .limit(1)

      const defaultMods: Record<string, boolean> = {
        pos: true, inventory: true, cash: true, customers: true,
        suppliers: true, purchases: true, employees: true,
        accounting: true, reports: true, ecommerce: true,
        pharmacy: false, hardware: true, liquor_tobacco: true, restaurant: true,
        beauty_salon: true, veterinary: true
      }

      if (data?.[0]?.enabled_modules) {
        setTenantModules({ ...defaultMods, ...data[0].enabled_modules })
      } else {
        setTenantModules(defaultMods)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingModules(false)
    }
  }

  async function handleSaveModules() {
    if (!selectedTenantForModules || savingModules) return
    setSavingModules(true)
    try {
      const { data, error } = await supabase.rpc('superadmin_update_tenant_modules', {
        p_tenant_id: selectedTenantForModules.id,
        p_modules: tenantModules
      })

      if (error) throw error
      alert(`Módulos de "${selectedTenantForModules.name}" actualizados correctamente`)
      setSelectedTenantForModules(null)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar módulos')
    } finally {
      setSavingModules(false)
    }
  }

  function openCreate() { setForm(EMPTY_FORM); setModal('create'); setCreatedInfo(null) }
  function openEdit(t: Tenant) {
    setForm({
      name: t.name, slug: t.slug, owner_email: t.owner_email,
      owner_name: t.owner_name || '', phone: t.phone || '',
      business_type: t.business_type || '', country: t.country,
      status: t.status, password: ''
    })
    setEditingId(t.id); setModal('edit'); setCreatedInfo(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'create') {
        const { error } = await supabase.rpc('superadmin_create_tenant', {
          p_name: form.name, p_slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
          p_owner_email: form.owner_email, p_owner_name: form.owner_name,
          p_phone: form.phone, p_business_type: form.business_type,
          p_country: form.country, p_status: form.status,
          p_password: form.password || 'Soloc@li1'
        })
        if (error) throw error
        setCreatedInfo({ email: form.owner_email, pass: form.password || 'Soloc@li1' })
      } else if (modal === 'edit' && editingId) {
        const { error } = await supabase.rpc('superadmin_update_tenant', {
          p_tenant_id: editingId, p_name: form.name, p_owner_name: form.owner_name,
          p_owner_email: form.owner_email, p_phone: form.phone,
          p_business_type: form.business_type, p_country: form.country
        })
        if (error) throw error

        // If password provided in edit, update user password too
        if (form.password) {
          await supabase.rpc('superadmin_create_user', {
            p_email: form.owner_email,
            p_password: form.password,
            p_full_name: form.owner_name,
            p_role: 'admin',
            p_tenant_id: editingId
          })
        }
      }
      await fetchTenants()
      if (modal !== 'create') setModal(null)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar permanentemente "${name}"? Esta acción eliminará también sus suscripciones, pagos y tickets.`)) return
    const { error } = await supabase.rpc('superadmin_delete_tenant', { p_tenant_id: id })
    if (error) return alert('Error: ' + error.message)
    setTenants(prev => prev.filter(t => t.id !== id))
  }

  async function toggleStatus(id: string, status: string) {
    const next = status === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.rpc('superadmin_update_tenant_status', { p_tenant_id: id, p_status: next })
    if (error) return alert('Error: ' + error.message)
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: next } : t))
  }

  const setF = (key: keyof typeof EMPTY_FORM) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }))

  const filtered = tenants.filter(t => {
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.owner_email.toLowerCase().includes(search.toLowerCase())
    const mf = filterStatus === 'all' || t.status === filterStatus
    return ms && mf
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Gestión de Negocios</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tenants.length} inquilinos registrados en la plataforma</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchTenants} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>↻</button>
          <button onClick={openCreate} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>+ Nuevo Negocio</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <div key={key} className="neu-card" style={{ padding: '14px 18px', cursor: 'pointer', borderTop: filterStatus === key ? `2px solid ${s.color}` : '2px solid transparent' }} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{tenants.filter(t => t.status === key).length}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input type="text" className="input-neu" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '10px 14px' }} />
        {filterStatus !== 'all' && (
          <button className="btn-neu btn-ghost" onClick={() => setFilterStatus('all')} style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--accent-coral)' }}>✕ Limpiar</button>
        )}
      </div>

      {error && <div className="neu-card" style={{ padding: 16, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}><p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.85rem' }}>⚠️ {error}</p></div>}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando negocios...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏪</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{tenants.length === 0 ? 'No hay negocios registrados' : 'Sin resultados'}</h2>
          <button onClick={openCreate} className="btn-neu btn-primary" style={{ marginTop: 16, padding: '10px 24px' }}>+ Crear primer negocio</button>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {['Negocio', 'Propietario', 'Subdominio', 'País', 'Registro', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', fontWeight: 600, textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const ss = STATUS_STYLE[t.status] || STATUS_STYLE.cancelled
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.business_type || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.owner_name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.owner_email}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{t.slug}.mrtender.com</td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{t.country}<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.phone || '—'}</div></td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(t.created_at)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.color }}>{ss.label}</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openModulesModal(t)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
                          🧩 Módulos
                        </button>
                        <button onClick={() => openEdit(t)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>✎ Editar</button>
                        <button onClick={() => toggleStatus(t.id, t.status)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', color: t.status === 'active' ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
                          {t.status === 'active' ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => handleDelete(t.id, t.name)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Modules Configuration */}
      {selectedTenantForModules && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setSelectedTenantForModules(null)}>
          <div style={{ ...PANEL_STYLE, maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🧩 Módulos Activos — {selectedTenantForModules.name}
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Habilita o deshabilita los módulos disponibles para este negocio
                </p>
              </div>
              <button type="button" onClick={() => setSelectedTenantForModules(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {loadingModules ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando módulos...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                {AVAILABLE_MODULES.map(mod => {
                  const isEnabled = !!tenantModules[mod.id]
                  return (
                    <div
                      key={mod.id}
                      onClick={() => setTenantModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="neu-card"
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: isEnabled ? '1.5px solid var(--accent-purple)' : '1px solid var(--border-color)',
                        background: isEnabled ? 'rgba(139, 114, 190, 0.05)' : 'var(--bg)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.3rem' }}>{mod.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{mod.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mod.description}</div>
                        </div>
                      </div>
                      <div style={{
                        width: 38,
                        height: 22,
                        borderRadius: 12,
                        background: isEnabled ? 'var(--accent-purple)' : 'var(--bg-deep)',
                        position: 'relative',
                        transition: '0.2s',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: 2,
                          left: isEnabled ? 18 : 3,
                          transition: '0.2s'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setSelectedTenantForModules(null)} className="btn-neu btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
              <button type="button" onClick={handleSaveModules} className="btn-neu btn-primary" disabled={savingModules} style={{ padding: '10px 24px' }}>
                {savingModules ? 'Guardando...' : 'Guardar Módulos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {modal && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {modal === 'create' ? '+ Nuevo Negocio' : '✎ Editar Negocio'}
              </h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {createdInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '3rem' }}>🎉</div>
                <h3 style={{ fontWeight: 800, color: 'var(--accent-emerald)', margin: 0 }}>¡Negocio y Usuario Creados Exitosamente!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>El usuario puede iniciar sesión **inmediatamente sin confirmar correo** con los siguientes accesos:</p>

                <div className="neu-card" style={{ padding: 16, background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                  <div><strong>Email:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{createdInfo.email}</span></div>
                  <div><strong>Contraseña:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{createdInfo.pass}</span></div>
                  <div><strong>Estado Email:</strong> <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>✓ Auto-Confirmado</span></div>
                </div>

                <button onClick={() => setModal(null)} className="btn-neu btn-primary" style={{ padding: '10px 24px', marginTop: 10 }}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Nombre del Negocio *</label>
                    <input type="text" className="input-neu" value={form.name} onChange={e => setF('name')(e.target.value)} placeholder="Tienda Los Cedritos" required style={{ width: '100%' }} />
                  </div>
                  {modal === 'create' && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Slug (subdominio) *</label>
                      <input type="text" className="input-neu" value={form.slug} onChange={e => setF('slug')(e.target.value)} placeholder="cedritos" required style={{ width: '100%' }} />
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Propietario *</label>
                    <input type="text" className="input-neu" value={form.owner_name} onChange={e => setF('owner_name')(e.target.value)} placeholder="Juan García" required style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email Propietario *</label>
                    <input type="email" className="input-neu" value={form.owner_email} onChange={e => setF('owner_email')(e.target.value)} placeholder="juan@negocio.com" required style={{ width: '100%' }} />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 6 }}>
                      {modal === 'create' ? '🔑 Contraseña de Acceso para el Usuario *' : '🔑 Cambiar Contraseña del Usuario (opcional)'}
                    </label>
                    <input type="text" className="input-neu" value={form.password} onChange={e => setF('password')(e.target.value)} placeholder="Soloc@li1" required={modal === 'create'} style={{ width: '100%', fontFamily: 'monospace' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Teléfono</label>
                    <input type="text" className="input-neu" value={form.phone} onChange={e => setF('phone')(e.target.value)} placeholder="+57 300 000 0000" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Tipo de Negocio</label>
                    <input type="text" className="input-neu" value={form.business_type} onChange={e => setF('business_type')(e.target.value)} placeholder="Retail, Farmacia..." style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>País</label>
                    <select className="input-neu" value={form.country} onChange={e => setF('country')(e.target.value)} style={{ width: '100%' }}>
                      {['Colombia', 'Mexico', 'Peru', 'Venezuela', 'Argentina', 'Chile', 'Ecuador', 'Bolivia'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {modal === 'create' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Estado inicial</label>
                      <select className="input-neu" value={form.status} onChange={e => setF('status')(e.target.value)} style={{ width: '100%' }}>
                        <option value="trial">En Prueba</option>
                        <option value="active">Activo</option>
                        <option value="suspended">Suspendido</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                  <button type="button" onClick={() => setModal(null)} className="btn-neu btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
                  <button type="submit" className="btn-neu btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>
                    {saving ? 'Guardando...' : modal === 'create' ? 'Crear Negocio y Usuario' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
