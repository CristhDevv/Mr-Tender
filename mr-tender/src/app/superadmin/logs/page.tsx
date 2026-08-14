'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'
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

export default function LogsAdminPage() {
  const supabase = createPlatformClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Bitácora de Auditoría
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Registro cronológico detallado de las acciones y eventos del sistema global
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando logs...</div>
      ) : logs.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay registros de auditoría</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Las acciones críticas de la plataforma quedarán grabadas aquí.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Evento / Acción</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Actor</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Recurso</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Dirección IP</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Navegador / Agente</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Fecha / Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {log.action.replace('_', ' ').toUpperCase()}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '3px 6px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: log.actor_type === 'superadmin' ? 'rgba(155,81,224,0.12)' : 'var(--border-color)',
                      color: log.actor_type === 'superadmin' ? 'var(--accent-purple)' : 'var(--text-secondary)'
                    }}>
                      {log.actor_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                    {log.resource_type}
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {log.ip_address}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.user_agent}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {formatDate(log.created_at)}
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
