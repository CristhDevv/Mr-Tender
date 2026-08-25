'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  CreditCard,
  Plus,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface Subscription {
  id: string
  tenant_id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  platform_tenants: { name: string } | null
  platform_subscription_plans: { name: string } | null
}

interface Tenant { id: string; name: string }
interface Plan { id: string; name: string }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'rgba(74,186,134,0.12)',  color: 'var(--accent-emerald)', label: 'Activa' },
  trialing:  { bg: 'rgba(242,193,78,0.12)',  color: 'var(--accent-gold)',    label: 'En Prueba' },
  past_due:  { bg: 'rgba(235,94,85,0.12)',   color: 'var(--accent-coral)',   label: 'Vencida' },
  cancelled: { bg: 'var(--border-color)',    color: 'var(--text-muted)',     label: 'Cancelada' },
  paused:    { bg: 'rgba(139,114,190,0.12)', color: 'var(--accent-purple)',  label: 'Pausada' },
}

export default function SubscriptionsAdminPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Dedicated View: 'list' | 'new'
  const [view, setView] = useState<'list' | 'new'>('list')
  const [newTenantId, setNewTenantId] = useState('')
  const [newPlanId, setNewPlanId] = useState('')
  const [newStatus, setNewStatus] = useState('active')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    const [subRes, tenantRes, planRes] = await Promise.all([
      supabase.from('platform_subscriptions').select('*, platform_tenants(name), platform_subscription_plans(name)').order('created_at', { ascending: false }),
      supabase.from('platform_tenants').select('id, name').order('name'),
      supabase.from('platform_subscription_plans').select('id, name').order('sort_order')
    ])
    if (subRes.error) setError(subRes.error.message)
    setSubscriptions(subRes.data as any || [])
    setTenants(tenantRes.data || [])
    setPlans(planRes.data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTenantId || !newPlanId) return
    setSaving(true)
    const { error } = await supabase.rpc('superadmin_create_subscription', {
      p_tenant_id: newTenantId,
      p_plan_id: newPlanId,
      p_status: newStatus
    })
    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }
    await fetchAll()
    setView('list')
    setNewTenantId('')
    setNewPlanId('')
    setNewStatus('active')
    setSaving(false)
  }

  async function handleCancel(subId: string) {
    if (!confirm('¿Cancelar esta suscripción al final del período?')) return
    const { error } = await supabase.from('platform_subscriptions').update({ cancel_at_period_end: true, status: 'cancelled' }).eq('id', subId)
    if (error) return alert('Error: ' + error.message)
    setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, cancel_at_period_end: true, status: 'cancelled' } : s))
  }

  const filtered = filterStatus === 'all' ? subscriptions : subscriptions.filter(s => s.status === filterStatus)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>💳</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Suscripciones de Negocios
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Ciclos de cobro, planes contratados y estados de facturación (Sin modales).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchAll} className="btn-neu btn-ghost" title="Recargar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {view === 'list' ? (
            <button
              onClick={() => setView('new')}
              className="btn-neu btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Nueva Suscripción</span>
            </button>
          ) : (
            <button
              onClick={() => setView('list')}
              className="btn-neu btn-ghost"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={16} />
              <span>Volver a Suscripciones</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="neu-card" style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span style={{ color: 'var(--accent-coral)', fontSize: '0.82rem', fontWeight: 600 }}>⚠️ {error}</span>
        </div>
      )}

      {/* ── DEDICATED VIEW: CREATE NEW SUBSCRIPTION ── */}
      {view === 'new' && (
        <div className="neu-card animate-scale-in" style={{ padding: 26, maxWidth: 600, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              + Asignar Nueva Suscripción
            </h2>
          </div>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Seleccionar Negocio *
              </label>
              <select
                className="input-neu"
                value={newTenantId}
                onChange={e => setNewTenantId(e.target.value)}
                required
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="">Selecciona un negocio...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Nivel de Plan *
              </label>
              <select
                className="input-neu"
                value={newPlanId}
                onChange={e => setNewPlanId(e.target.value)}
                required
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="">Selecciona un plan...</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Estado Inicial
              </label>
              <select
                className="input-neu"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="active">🟢 Activa</option>
                <option value="trialing">🟡 En Período de Prueba</option>
                <option value="past_due">🔴 Pendiente de Pago</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => setView('list')}
                className="btn-neu btn-ghost"
                style={{ padding: '8px 18px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !newTenantId || !newPlanId}
                className="btn-neu btn-primary"
                style={{ padding: '8px 24px', fontWeight: 800 }}
              >
                {saving ? 'Guardando...' : 'Crear Suscripción'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DEDICATED VIEW: LIST OF SUBSCRIPTIONS ── */}
      {view === 'list' && (
        <>
          {/* Stats Ribbon */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {Object.entries(STATUS_STYLE).map(([key, s]) => (
              <div
                key={key}
                className="neu-card"
                style={{ padding: '12px 16px', cursor: 'pointer', borderTop: filterStatus === key ? `3px solid ${s.color}` : '3px solid transparent' }}
                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: s.color }}>
                  {subscriptions.filter(s2 => s2.status === key).length}
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <div>Cargando suscripciones...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💳</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Sin suscripciones en este filtro</h3>
              <button onClick={() => setView('new')} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Crear primera suscripción
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Negocio</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Plan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Período</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const ss = STATUS_STYLE[s.status] || STATUS_STYLE.cancelled
                    const daysLeft = s.current_period_end ? Math.ceil((new Date(s.current_period_end).getTime() - Date.now()) / 86400000) : null
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {(s as any).platform_tenants?.name || 'Desconocido'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {(s as any).platform_subscription_plans?.name || 'Desconocido'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <div>{formatDate(s.current_period_start)}</div>
                          <div style={{ fontWeight: 700, color: daysLeft !== null && daysLeft < 5 ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                            → {formatDate(s.current_period_end)}
                            {daysLeft !== null && <span style={{ marginLeft: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>({daysLeft > 0 ? `${daysLeft}d` : 'Vencida'})</span>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: ss.bg, color: ss.color }}>
                            {ss.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {s.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(s.id)}
                              className="btn-neu btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--accent-coral)' }}
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
        </>
      )}

    </div>
  )
}
