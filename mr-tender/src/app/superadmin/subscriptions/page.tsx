'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tenants: { name: string } | null;
  subscription_plans: { name: string } | null;
}

export default function SubscriptionsAdminPage() {
  const supabase = createPlatformClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  async function fetchSubscriptions() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, tenants(name), subscription_plans(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubscriptions(data as any || [])
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Suscripciones Activas
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Monitorea los ciclos de cobro, planes contratados y estados de facturación recurrente
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando suscripciones...</div>
      ) : subscriptions.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💳</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay suscripciones registradas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Los registros aparecerán cuando los inquilinos adquieran un plan de servicio.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Negocio (Tenant)</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Plan Contratado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Inicio de Período</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Fin de Período</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Renovación</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {s.tenants?.name || 'Inquilino desconocido'}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {s.subscription_plans?.name || 'Plan desconocido'}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {formatDate(s.current_period_start)}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {formatDate(s.current_period_end)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: s.status === 'active' ? 'rgba(74,186,134,0.12)' : s.status === 'trialing' ? 'rgba(242,193,78,0.12)' : 'rgba(235,94,85,0.12)',
                      color: s.status === 'active' ? 'var(--accent-emerald)' : s.status === 'trialing' ? 'var(--accent-gold)' : 'var(--accent-coral)'
                    }}>
                      {s.status === 'active' ? 'Activa' : s.status === 'trialing' ? 'Prueba' : s.status === 'past_due' ? 'Vencida' : s.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: s.cancel_at_period_end ? 'var(--accent-coral)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                    {s.cancel_at_period_end ? 'No Renovará' : 'Automática'}
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
