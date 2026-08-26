'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Store,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
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

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  trial: 'En Prueba',
  cancelled: 'Cancelado',
}

export default function TenantsAdminPage() {
  const supabase = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('platform_tenants').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTenants(data || [])
    setLoading(false)
  }

  async function toggleStatus(id: string, status: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = status === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.rpc('superadmin_update_tenant_status', { p_tenant_id: id, p_status: next })
    if (error) return alert('Error: ' + error.message)
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: next } : t))
  }

  const filtered = tenants.filter(t => {
    const ms = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.owner_email.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.owner_name || '').toLowerCase().includes(search.toLowerCase())
    const mf = filterStatus === 'all' || t.status === filterStatus
    const mt = filterType === 'all' || t.business_type === filterType
    return ms && mf && mt
  })

  const uniqueTypes = Array.from(new Set(tenants.map(t => t.business_type).filter(Boolean)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Gestión de Negocios
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Directorio maestro de comercios con gestión modular completa, credenciales y estados.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchTenants} className="btn-neu btn-ghost" title="Recargar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          
          <Link
            href="/superadmin/tenants/new"
            className="btn-neu btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} strokeWidth={2} />
            <span>Crear Nuevo Negocio</span>
          </Link>
        </div>
      </div>

      {/* Stats KPI Ribbon - Monochrome */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div
          className="neu-card"
          style={{ padding: '12px 16px', cursor: 'pointer', borderTop: filterStatus === 'all' ? '2px solid var(--text-primary)' : '2px solid transparent' }}
          onClick={() => setFilterStatus('all')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Inquilinos</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{tenants.length}</div>
        </div>

        <div
          className="neu-card"
          style={{ padding: '12px 16px', cursor: 'pointer', borderTop: filterStatus === 'active' ? '2px solid var(--text-primary)' : '2px solid transparent' }}
          onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activos</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{tenants.filter(t => t.status === 'active').length}</div>
        </div>

        <div
          className="neu-card"
          style={{ padding: '12px 16px', cursor: 'pointer', borderTop: filterStatus === 'trial' ? '2px solid var(--text-primary)' : '2px solid transparent' }}
          onClick={() => setFilterStatus(filterStatus === 'trial' ? 'all' : 'trial')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>En Prueba</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{tenants.filter(t => t.status === 'trial').length}</div>
        </div>

        <div
          className="neu-card"
          style={{ padding: '12px 16px', cursor: 'pointer', borderTop: filterStatus === 'suspended' ? '2px solid var(--text-primary)' : '2px solid transparent' }}
          onClick={() => setFilterStatus(filterStatus === 'suspended' ? 'all' : 'suspended')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suspendidos</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{tenants.filter(t => t.status === 'suspended').length}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, padding: '6px 12px' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, email, slug o propietario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
          />
        </div>

        <select
          className="input-neu"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          <option value="all">Todos los giros de negocio</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {(filterStatus !== 'all' || filterType !== 'all' || search) && (
          <button
            className="btn-neu btn-ghost"
            onClick={() => { setFilterStatus('all'); setFilterType('all'); setSearch('') }}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {error && (
        <div className="neu-card" style={{ padding: 12, border: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Tenants Table */}
      {loading ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <div>Cargando negocios...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
          <Store size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {tenants.length === 0 ? 'No hay negocios registrados en la plataforma' : 'Sin coincidencias con la búsqueda'}
          </h3>
          <Link href="/superadmin/tenants/new" className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', marginTop: 10, display: 'inline-flex' }}>
            Crear primer negocio
          </Link>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Comercio</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Propietario / Contacto</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Subdominio</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>País</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const statusLabel = STATUS_LABEL[t.status] || 'Desconocido'
                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        style={{ textDecoration: 'none', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}
                      >
                        {t.name}
                      </Link>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.business_type || 'General'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.owner_name || '—'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.owner_email}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <a
                        href={`https://${t.slug}.mrtender.com`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>{t.slug}</span>
                        <ArrowUpRight size={12} strokeWidth={2} />
                      </a>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      <div>{t.country}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatDate(t.created_at)}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: 'var(--bg-deep)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {statusLabel}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={e => toggleStatus(t.id, t.status, e)}
                          className="btn-neu btn-ghost"
                          title={t.status === 'active' ? 'Pausar negocio' : 'Reactivar negocio'}
                          style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                        >
                          {t.status === 'active' ? 'Pausar' : 'Activar'}
                        </button>

                        <Link
                          href={`/superadmin/tenants/${t.id}`}
                          className="btn-neu"
                          style={{ padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', color: 'var(--text-primary)' }}
                        >
                          <span>Gestionar</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
