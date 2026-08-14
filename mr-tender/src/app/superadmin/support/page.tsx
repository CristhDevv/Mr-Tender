'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface SupportTicket {
  id: string; subject: string; description: string; status: string;
  priority: string; created_at: string;
  platform_tenants: { name: string } | null;
}

const PRIORITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: 'rgba(235,94,85,0.12)', color: 'var(--accent-coral)', label: '🔴 Alta' },
  medium: { bg: 'rgba(242,193,78,0.12)', color: 'var(--accent-gold)', label: '🟡 Media' },
  low:    { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)', label: '🟢 Baja' },
}

export default function SupportAdminPage() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    setLoading(true); setError(null)
    const { data, error } = await supabase
      .from('platform_support_tickets')
      .select('*, platform_tenants(name)')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setTickets(data as any || [])
    setLoading(false)
  }

  async function updateTicketStatus(ticketId: string, newStatus: string) {
    setUpdatingId(ticketId)
    const { error } = await supabase.rpc('superadmin_update_ticket_status', {
      p_ticket_id: ticketId,
      p_status: newStatus
    })
    if (error) alert('Error: ' + error.message)
    else setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
    setUpdatingId(null)
  }

  async function handleDeleteTicket(ticketId: string, subject: string) {
    if (!confirm(`¿Eliminar el ticket "${subject}"?`)) return
    const { error } = await supabase.rpc('superadmin_delete_ticket', { p_ticket_id: ticketId })
    if (error) alert('Error: ' + error.message)
    else setTickets(prev => prev.filter(t => t.id !== ticketId))
  }

  const filtered = tickets.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchPriority && matchSearch
  })

  const openCount = tickets.filter(t => t.status === 'open').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length
  const highPriorityOpen = tickets.filter(t => t.status === 'open' && t.priority === 'high').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Atención a Clientes (Soporte)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Monitorea, resuelve y gestiona los tickets de soporte de los inquilinos
          </p>
        </div>
        <button onClick={fetchTickets} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Total Tickets</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{tickets.length}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Abiertos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: openCount > 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{openCount}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Alta Prioridad</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: highPriorityOpen > 0 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>{highPriorityOpen}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Resueltos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" className="input-neu" placeholder="Buscar en el asunto o descripción..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 14px' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'open', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} className="btn-neu btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: filterStatus === f ? 700 : 500, color: filterStatus === f ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
              {f === 'all' ? 'Todos' : f === 'open' ? 'Abiertos' : 'Resueltos'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="neu-card" style={{ padding: 16, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}><p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.85rem' }}>⚠️ {error}</p></div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tickets...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎧</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No se encontraron tickets</h2>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(t => {
            const pStyle = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.low
            const isExpanded = expandedId === t.id
            return (
              <div key={t.id} className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: pStyle.bg, color: pStyle.color, flexShrink: 0 }}>
                      {pStyle.label}
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.subject}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: t.status === 'open' ? 'rgba(242,193,78,0.12)' : 'rgba(74,186,134,0.12)', color: t.status === 'open' ? 'var(--accent-gold)' : 'var(--accent-emerald)' }}>
                      {t.status === 'open' ? 'Abierto' : 'Resuelto'}
                    </span>
                    <button className="btn-neu btn-ghost" onClick={() => updateTicketStatus(t.id, t.status === 'open' ? 'resolved' : 'open')} disabled={updatingId === t.id} style={{ padding: '6px 12px', fontSize: '0.75rem', color: t.status === 'open' ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
                      {updatingId === t.id ? '...' : t.status === 'open' ? '✓ Resolver' : '↩ Reabrir'}
                    </button>
                    <button className="btn-neu btn-ghost" onClick={() => handleDeleteTicket(t.id, t.subject)} style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}>
                      🗑
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{t.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Inquilino: <strong style={{ color: 'var(--text-primary)' }}>{(t as any).platform_tenants?.name || 'Desconocido'}</strong></span>
                      <span>Reportado: {formatDate(t.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
