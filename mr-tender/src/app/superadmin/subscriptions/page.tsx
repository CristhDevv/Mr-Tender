'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  platform_tenants: { name: string } | null;
  platform_subscription_plans: { name: string } | null;
}

export default function SubscriptionsAdminPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  async function fetchSubscriptions() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .select('*, platform_tenants(name), platform_subscription_plans(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubscriptions(data as any || [])
    } catch (err: any) {
      console.error('Error fetching subscriptions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelSubscription(subId: string) {
    if (!confirm('¿Marcar esta suscripción para NO renovar al final del período?')) return
    try {
      const { error } = await supabase
        .from('platform_subscriptions')
        .update({ cancel_at_period_end: true, status: 'cancelled' })
        .eq('id', subId)
      if (error) throw error
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, cancel_at_period_end: true, status: 'cancelled' } : s))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const filtered = filterStatus === 'all' ? subscriptions : subscriptions.filter(s => s.status === filterStatus)

  const getStatusStyle = (status: string) => {
    const map: Record<string, { bg: string, color: string, label: string }> = {
      active: { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)', label: 'Activa' },
      trialing: { bg: 'rgba(242,193,78,0.12)', color: 'var(--accent-gold)', label: 'En Prueba' },
      past_due: { bg: 'rgba(235,94,85,0.12)', color: 'var(--accent-coral)', label: 'Vencida' },
      cancelled: { bg: 'var(--border-color)', color: 'var(--text-muted)', label: 'Cancelada' },
      paused: { bg: 'rgba(139,114,190,0.12)', color: 'var(--accent-purple)', label: 'Pausada' },
    }
    return map[status] || map.cancelled
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Suscripciones Activas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Monitorea los ciclos de cobro, planes contratados y estados de facturación recurrente
          </p>
        </div>
        <button onClick={fetchSubscriptions} className="btn-neu btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total', value: subscriptions.length, color: 'var(--accent-blue)' },
          { label: 'Activas', value: subscriptions.filter(s => s.status === 'active').length, color: 'var(--accent-emerald)' },
          { label: 'En Prueba', value: subscriptions.filter(s => s.status === 'trialing').length, color: 'var(--accent-gold)' },
          { label: 'Canceladas', value: subscriptions.filter(s => s.status === 'cancelled').length, color: 'var(--accent-coral)' },
        ].map(stat => (
          <div key={stat.label} className="neu-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filtrar:</span>
        {['all', 'active', 'trialing', 'past_due', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="btn-neu btn-ghost"
            style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: filterStatus === s ? 700 : 500, color: filterStatus === s ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
            {s === 'all' ? 'Todas' : s === 'active' ? 'Activas' : s === 'trialing' ? 'En Prueba' : s === 'past_due' ? 'Vencidas' : 'Canceladas'}
          </button>
        ))}
      </div>

      {error && (
        <div className="neu-card" style={{ padding: '16px 20px', background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando suscripciones...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💳</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay suscripciones en este filtro</h2>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-deep)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Negocio</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Plan Contratado</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Período Actual</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Renovación</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const ss = getStatusStyle(s.status)
                const daysLeft = s.current_period_end
                  ? Math.ceil((new Date(s.current_period_end).getTime() - Date.now()) / 86400000)
                  : null
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(s as any).platform_tenants?.name || 'Inquilino desconocido'}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {(s as any).platform_subscription_plans?.name || 'Plan desconocido'}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      <div>{formatDate(s.current_period_start)} →</div>
                      <div style={{ fontWeight: 600, color: daysLeft !== null && daysLeft < 5 ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                        {formatDate(s.current_period_end)}
                        {daysLeft !== null && <span style={{ marginLeft: 6, fontSize: '0.7rem' }}>({daysLeft > 0 ? `${daysLeft}d restantes` : 'Vencida'})</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.color }}>
                        {ss.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: s.cancel_at_period_end ? 'var(--accent-coral)' : 'var(--accent-emerald)', fontWeight: 600, fontSize: '0.82rem' }}>
                      {s.cancel_at_period_end ? '✗ No Renovará' : '✓ Automática'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {s.status === 'active' && !s.cancel_at_period_end && (
                        <button
                          className="btn-neu btn-ghost"
                          onClick={() => cancelSubscription(s.id)}
                          style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}
                        >
                          Cancelar
                        </button>
                      )}
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
