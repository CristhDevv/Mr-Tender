'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Subscription {
  id: string; tenant_id: string; plan_id: string; status: string;
  current_period_start: string; current_period_end: string; cancel_at_period_end: boolean;
  platform_tenants: { name: string } | null;
  platform_subscription_plans: { name: string } | null;
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

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}
const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--bg)', borderRadius: 20, padding: 32, width: '100%',
  maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20,
  boxShadow: 'var(--neu-card)',
}

export default function SubscriptionsAdminPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTenantId, setNewTenantId] = useState('')
  const [newPlanId, setNewPlanId] = useState('')
  const [newStatus, setNewStatus] = useState('active')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true); setError(null)
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
      p_tenant_id: newTenantId, p_plan_id: newPlanId, p_status: newStatus
    })
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await fetchAll()
    setShowCreate(false)
    setNewTenantId(''); setNewPlanId(''); setNewStatus('active')
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Suscripciones</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ciclos de cobro, planes contratados y estados de facturación</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchAll} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>↻</button>
          <button onClick={() => setShowCreate(true)} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>+ Nueva Suscripción</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <div key={key} className="neu-card" style={{ padding: '14px 18px', cursor: 'pointer', borderTop: filterStatus === key ? `2px solid ${s.color}` : '2px solid transparent' }} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{subscriptions.filter(s2 => s2.status === key).length}</div>
          </div>
        ))}
      </div>

      {error && <div className="neu-card" style={{ padding: 16, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}><p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.85rem' }}>⚠️ {error}</p></div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando suscripciones...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💳</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Sin suscripciones en este filtro</h2>
          <button onClick={() => setShowCreate(true)} className="btn-neu btn-primary" style={{ marginTop: 16, padding: '10px 24px' }}>+ Crear suscripción</button>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {['Negocio', 'Plan', 'Período', 'Estado', 'Renovación', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', fontWeight: 600, textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const ss = STATUS_STYLE[s.status] || STATUS_STYLE.cancelled
                const daysLeft = s.current_period_end ? Math.ceil((new Date(s.current_period_end).getTime() - Date.now()) / 86400000) : null
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(s as any).platform_tenants?.name || 'Desconocido'}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {(s as any).platform_subscription_plans?.name || 'Desconocido'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>{formatDate(s.current_period_start)}</div>
                      <div style={{ fontWeight: 600, color: daysLeft !== null && daysLeft < 5 ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                        → {formatDate(s.current_period_end)}
                        {daysLeft !== null && <span style={{ marginLeft: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>({daysLeft > 0 ? `${daysLeft}d` : 'Vencida'})</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.color }}>{ss.label}</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.82rem', fontWeight: 600, color: s.cancel_at_period_end ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
                      {s.cancel_at_period_end ? '✗ No renovará' : '✓ Automática'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      {s.status === 'active' && !s.cancel_at_period_end && (
                        <button onClick={() => handleCancel(s.id)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}>
                          ✕ Cancelar
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

      {/* Create Subscription Modal */}
      {showCreate && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <form onSubmit={handleCreate} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>+ Nueva Suscripción Manual</h2>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Negocio (Tenant) *</label>
                <select className="input-neu" value={newTenantId} onChange={e => setNewTenantId(e.target.value)} required style={{ width: '100%' }}>
                  <option value="">— Seleccionar negocio —</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Plan *</label>
                <select className="input-neu" value={newPlanId} onChange={e => setNewPlanId(e.target.value)} required style={{ width: '100%' }}>
                  <option value="">— Seleccionar plan —</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Estado inicial</label>
                <select className="input-neu" value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="active">Activa</option>
                  <option value="trialing">En Prueba</option>
                  <option value="paused">Pausada</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-neu btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>{saving ? 'Creando...' : 'Crear Suscripción'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
