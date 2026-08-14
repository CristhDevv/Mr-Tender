'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface AuditLog {
  id: string;
  actor_type: string;
  action: string;
  resource_type: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, { bg: string, color: string }> = {
  tenant_suspended: { bg: 'rgba(235,94,85,0.12)', color: 'var(--accent-coral)' },
  tenant_reactivated: { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)' },
  plan_updated: { bg: 'rgba(139,114,190,0.12)', color: 'var(--accent-purple)' },
  coupon_created: { bg: 'rgba(242,193,78,0.12)', color: 'var(--accent-gold)' },
  payment_processed: { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)' },
  subscription_renewed: { bg: 'rgba(74,144,226,0.12)', color: 'var(--accent-blue)' },
  support_ticket_resolved: { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)' },
}

const ACTOR_COLORS: Record<string, { bg: string, color: string }> = {
  superadmin: { bg: 'rgba(139,114,190,0.12)', color: 'var(--accent-purple)' },
  system: { bg: 'rgba(74,144,226,0.12)', color: 'var(--accent-blue)' },
  admin: { bg: 'rgba(242,193,78,0.12)', color: 'var(--accent-gold)' },
}

export default function LogsAdminPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterActor, setFilterActor] = useState('all')
  const [filterResource, setFilterResource] = useState('all')
  const [searchAction, setSearchAction] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('platform_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data || [])
    } catch (err: any) {
      console.error('Error fetching logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const uniqueActors = [...new Set(logs.map(l => l.actor_type))]
  const uniqueResources = [...new Set(logs.map(l => l.resource_type).filter(Boolean))]

  const filtered = logs.filter(l => {
    const matchActor = filterActor === 'all' || l.actor_type === filterActor
    const matchResource = filterResource === 'all' || l.resource_type === filterResource
    const matchSearch = !searchAction || l.action.toLowerCase().includes(searchAction.toLowerCase())
    return matchActor && matchResource && matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Bitácora de Auditoría
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Registro cronológico de acciones y eventos del sistema — últimos 200 registros
          </p>
        </div>
        <button onClick={fetchLogs} className="btn-neu btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Total Eventos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{logs.length}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Por Superadmin</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-purple)' }}>{logs.filter(l => l.actor_type === 'superadmin').length}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Por Sistema</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{logs.filter(l => l.actor_type === 'system').length}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tipos Recursos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-gold)' }}>{uniqueResources.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="input-neu"
          placeholder="Filtrar por acción..."
          value={searchAction}
          onChange={e => setSearchAction(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '10px 14px' }}
        />
        <select className="input-neu" value={filterActor} onChange={e => setFilterActor(e.target.value)} style={{ padding: '10px 14px' }}>
          <option value="all">Todos los Actores</option>
          {uniqueActors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="input-neu" value={filterResource} onChange={e => setFilterResource(e.target.value)} style={{ padding: '10px 14px' }}>
          <option value="all">Todos los Recursos</option>
          {uniqueResources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterActor !== 'all' || filterResource !== 'all' || searchAction) && (
          <button className="btn-neu btn-ghost" onClick={() => { setFilterActor('all'); setFilterResource('all'); setSearchAction('') }} style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--accent-coral)' }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="neu-card" style={{ padding: '16px 20px', background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Mostrando {filtered.length} de {logs.length} eventos
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando bitácora...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay registros de auditoría</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Las acciones críticas de la plataforma quedarán grabadas aquí.</p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-deep)' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Evento / Acción</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Actor</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Recurso</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>IP</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>User Agent</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Fecha / Hora</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const actionStyle = ACTION_COLORS[log.action] || { bg: 'var(--border-color)', color: 'var(--text-secondary)' }
                const actorStyle = ACTOR_COLORS[log.actor_type] || { bg: 'var(--border-color)', color: 'var(--text-muted)' }
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, background: actionStyle.bg, color: actionStyle.color }}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: actorStyle.bg, color: actorStyle.color }}>
                        {log.actor_type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      {log.resource_type || '—'}
                    </td>
                    <td style={{ padding: '13px 20px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: 'var(--text-muted)', fontSize: '0.72rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.user_agent || '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDate(log.created_at)}
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
