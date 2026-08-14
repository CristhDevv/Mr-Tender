'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_name: string;
  owner_email: string;
  phone: string;
  business_type: string;
  country: string;
  status: string;
  created_at: string;
}

export default function TenantsAdminPage() {
  const supabase = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('platform_tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (err: any) {
      console.error('Error fetching tenants:', err)
      setError(err.message || 'Error al cargar los negocios')
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(tenantId: string, currentStatus: string) {
    try {
      setUpdatingId(tenantId)
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
      const { error } = await supabase.rpc('superadmin_update_tenant_status', {
        p_tenant_id: tenantId,
        p_status: nextStatus
      })

      if (error) throw error
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: nextStatus } : t))
    } catch (err: any) {
      console.error('Error updating status:', err)
      alert('No se pudo actualizar el estado: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = tenants.filter(t => {
    const matchSearch = !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    return matchSearch && matchStatus
  })

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string, color: string, label: string }> = {
      active: { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)', label: 'Activo' },
      suspended: { bg: 'rgba(235,94,85,0.12)', color: 'var(--accent-coral)', label: 'Suspendido' },
      trial: { bg: 'rgba(242,193,78,0.12)', color: 'var(--accent-gold)', label: 'En Prueba' },
      cancelled: { bg: 'var(--border-color)', color: 'var(--text-muted)', label: 'Cancelado' },
    }
    const s = map[status] || map.cancelled
    return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Gestión de Negocios (Tenants)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Administra las instancias y accesos de los clientes registrados en la plataforma
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filtered.length} de {tenants.length} negocios
          </span>
          <button onClick={fetchTenants} className="btn-neu btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="input-neu"
          placeholder="Buscar por nombre, email o slug..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '10px 14px' }}
        />
        <select
          className="input-neu"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', minWidth: 150 }}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="trial">En Prueba</option>
          <option value="suspended">Suspendidos</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      {error && (
        <div className="neu-card" style={{ padding: '16px 20px', background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando negocios...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏪</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            {tenants.length === 0 ? 'No hay negocios registrados' : 'Sin resultados para tu búsqueda'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {tenants.length === 0 ? 'Los inquilinos aparecerán aquí una vez que se registren en la plataforma.' : 'Prueba con otros filtros o términos de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-deep)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Negocio / Inquilino</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Propietario</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Subdominio</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>País / Tel</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Registro</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.business_type || 'Sin tipo'} · {t.slug}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.owner_name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.owner_email}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.8rem' }}>
                    {t.slug}.mrtender.com
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: 'var(--text-primary)' }}>{t.country}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.phone || '—'}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {formatDate(t.created_at)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {statusBadge(t.status)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="btn-neu btn-ghost"
                        disabled={updatingId === t.id}
                        onClick={() => toggleStatus(t.id, t.status)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          color: t.status === 'active' ? 'var(--accent-coral)' : 'var(--accent-emerald)'
                        }}
                      >
                        {updatingId === t.id ? '...' : t.status === 'active' ? '⏸ Suspender' : '▶ Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
