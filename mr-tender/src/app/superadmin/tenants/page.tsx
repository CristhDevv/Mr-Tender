'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'
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
  const supabase = createPlatformClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (err) {
      console.error('Error fetching tenants:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(tenantId: string, currentStatus: string) {
    try {
      setUpdatingId(tenantId)
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
      const { error } = await supabase
        .from('tenants')
        .update({ status: nextStatus })
        .eq('id', tenantId)

      if (error) throw error
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: nextStatus } : t))
    } catch (err) {
      console.error('Error updating status:', err)
      alert('No se pudo actualizar el estado del negocio.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Gestión de Negocios (Tenants)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Administra las instancias y accesos de los clientes registrados en la plataforma
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando negocios...</div>
      ) : tenants.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏪</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay negocios registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Los inquilinos aparecerán aquí una vez que se registren en la plataforma.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Negocio / Inquilino</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Propietario</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Subdominio</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>País / Tel</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Registro</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipo: {t.business_type}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.owner_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.owner_email}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {t.slug}.mrtender.com
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>🇲🇽 {t.country}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.phone}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {formatDate(t.created_at)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: t.status === 'active' ? 'rgba(74,186,134,0.12)' : t.status === 'suspended' ? 'rgba(235,94,85,0.12)' : 'rgba(242,193,78,0.12)',
                      color: t.status === 'active' ? 'var(--accent-emerald)' : t.status === 'suspended' ? 'var(--accent-coral)' : 'var(--accent-gold)'
                    }}>
                      {t.status === 'active' ? 'Activo' : t.status === 'suspended' ? 'Suspendido' : 'Prueba'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      className={`btn-neu ${t.status === 'active' ? 'btn-ghost' : 'btn-primary'}`}
                      disabled={updatingId === t.id}
                      onClick={() => toggleStatus(t.id, t.status)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        color: t.status === 'active' ? 'var(--accent-coral)' : 'var(--accent-emerald)'
                      }}
                    >
                      {updatingId === t.id ? '...' : t.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
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
