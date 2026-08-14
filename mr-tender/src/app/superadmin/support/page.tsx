'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  tenants: { name: string } | null;
}

export default function SupportAdminPage() {
  const supabase = createPlatformClient()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data as any || [])
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  async function resolveTicket(ticketId: string, currentStatus: string) {
    try {
      const nextStatus = currentStatus === 'open' ? 'resolved' : 'open'
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: nextStatus })
        .eq('id', ticketId)

      if (error) throw error
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: nextStatus } : t))
    } catch (err) {
      console.error('Error updating ticket:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Atención a Clientes (Soporte)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Monitorea los reportes de errores, dudas y tickets abiertos por los inquilinos
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎧</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay tickets de soporte</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Cuando los clientes tengan problemas técnicos, sus reportes aparecerán aquí.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tickets.map(t => (
            <div key={t.id} className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{
                    padding: '3px 6px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    marginRight: 8,
                    background: t.priority === 'high' ? 'rgba(235,94,85,0.12)' : 'rgba(242,193,78,0.12)',
                    color: t.priority === 'high' ? 'var(--accent-coral)' : 'var(--accent-gold)'
                  }}>
                    Prioridad {t.priority.toUpperCase()}
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{t.subject}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: t.status === 'open' ? 'rgba(242,193,78,0.12)' : 'rgba(74,186,134,0.12)',
                    color: t.status === 'open' ? 'var(--accent-gold)' : 'var(--accent-emerald)'
                  }}>
                    {t.status === 'open' ? 'Abierto' : 'Resuelto'}
                  </span>
                  <button
                    className="btn-neu btn-ghost"
                    onClick={() => resolveTicket(t.id, t.status)}
                    style={{ padding: '6px 12px', fontSize: '0.75rem', color: t.status === 'open' ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}
                  >
                    {t.status === 'open' ? 'Marcar Resuelto' : 'Reabrir Ticket'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                {t.description}
              </p>

              <div className="divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Inquilino: <strong>{t.tenants?.name || 'Inquilino desconocido'}</strong></span>
                <span>Reportado el: {formatDate(t.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
