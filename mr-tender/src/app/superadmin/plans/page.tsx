'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Plan {
  id: string; name: string; slug: string; description: string;
  price_monthly: number; price_yearly: number; currency: string;
  max_users: number; max_products: number; max_branches: number;
  has_ecommerce: boolean; has_api_access: boolean;
  has_electronic_invoice: boolean; has_advanced_reports: boolean;
  trial_days: number; is_active: boolean;
}

const PLAN_ICONS: Record<string, string> = { free: '🆓', basic: '⭐', professional: '🚀', enterprise: '🏢' }
const PLAN_COLORS: Record<string, string> = { free: '#8B8B8B', basic: '#4A90D9', professional: '#8B72BE', enterprise: '#F2C14E' }

const EMPTY_PLAN = {
  name: '', slug: '', description: '', price_monthly: '0', price_yearly: '0',
  currency: 'USD', max_users: '5', max_products: '500', max_branches: '1', trial_days: '14'
}

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--bg)', borderRadius: 20, padding: 32, width: '100%',
  maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 18,
  boxShadow: 'var(--neu-card)', maxHeight: '90vh', overflowY: 'auto',
}

export default function PlansAdminPage() {
  const supabase = createClient()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editUsers, setEditUsers] = useState(0)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [newPlan, setNewPlan] = useState(EMPTY_PLAN)

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('platform_subscription_plans').select('*').order('sort_order', { ascending: true })
    if (error) setError(error.message)
    else setPlans(data || [])
    setLoading(false)
  }

  async function savePlan(planId: string) {
    setSaving(true)
    const { error } = await supabase.rpc('superadmin_update_plan', {
      p_plan_id: planId, p_price: parseFloat(editPrice), p_max_users: editUsers
    })
    if (error) return alert('Error: ' + error.message)
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, price_monthly: parseFloat(editPrice), max_users: editUsers } : p))
    setEditingId(null)
    setSaving(false)
  }

  async function togglePlan(planId: string, current: boolean) {
    const { error } = await supabase.rpc('superadmin_toggle_plan', { p_plan_id: planId, p_is_active: !current })
    if (error) return alert('Error: ' + error.message)
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_active: !current } : p))
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.rpc('superadmin_create_plan', {
        p_name: newPlan.name,
        p_slug: newPlan.slug.toLowerCase().replace(/\s+/g, '-'),
        p_description: newPlan.description,
        p_price_monthly: parseFloat(newPlan.price_monthly),
        p_price_yearly: parseFloat(newPlan.price_yearly),
        p_currency: newPlan.currency,
        p_max_users: parseInt(newPlan.max_users),
        p_max_products: parseInt(newPlan.max_products),
        p_max_branches: parseInt(newPlan.max_branches),
        p_trial_days: parseInt(newPlan.trial_days)
      })
      if (error) throw error
      await fetchPlans()
      setShowCreate(false)
      setNewPlan(EMPTY_PLAN)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally { setSaving(false) }
  }

  const NP = (k: keyof typeof newPlan) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewPlan(f => ({ ...f, [k]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Planes de Suscripción</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Configura precios, límites y características de cada nivel de servicio</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchPlans} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>↻</button>
          <button onClick={() => setShowCreate(true)} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>+ Nuevo Plan</button>
        </div>
      </div>

      {error && <div className="neu-card" style={{ padding: 16, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}><p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.85rem' }}>⚠️ {error}</p></div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando planes...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {plans.map(p => {
            const isEditing = editingId === p.id
            const icon = PLAN_ICONS[p.slug] || '📋'
            const color = PLAN_COLORS[p.slug] || 'var(--accent-blue)'
            return (
              <div key={p.id} className="neu-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, borderTop: `3px solid ${color}`, opacity: p.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>{p.name}</h3>
                  </div>
                  <button onClick={() => togglePlan(p.id, p.is_active)} style={{ border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: p.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)', color: p.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    {p.is_active ? 'Activo' : 'Pausado'}
                  </button>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{p.description}</p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$</span>
                      <input type="number" className="input-neu" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: 90, padding: '4px 8px', fontSize: '1rem', fontWeight: 700 }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: '1.7rem', fontWeight: 900, color, letterSpacing: '-0.03em' }}>{formatCurrency(p.price_monthly)}</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ mes ({p.currency})</span>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.82rem' }}>
                  {[
                    ['Usuarios', isEditing
                      ? <input key="u" type="number" className="input-neu" value={editUsers} onChange={e => setEditUsers(+e.target.value)} style={{ width: 70, padding: '2px 6px', textAlign: 'right' }} />
                      : <strong key="ul" style={{ color: 'var(--text-primary)' }}>{p.max_users < 0 ? '∞ Ilimitados' : p.max_users}</strong>],
                    ['Productos', <strong key="p" style={{ color: 'var(--text-primary)' }}>{p.max_products < 0 ? '∞ Ilimitados' : p.max_products}</strong>],
                    ['Sucursales', <strong key="b" style={{ color: 'var(--text-primary)' }}>{p.max_branches < 0 ? '∞ Ilimitadas' : p.max_branches}</strong>],
                    ['Período prueba', <strong key="t" style={{ color: 'var(--text-primary)' }}>{p.trial_days} días</strong>],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>{val}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.has_ecommerce && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,186,134,0.1)', color: 'var(--accent-emerald)' }}>E-commerce</span>}
                  {p.has_electronic_invoice && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,144,226,0.1)', color: 'var(--accent-blue)' }}>Facturación</span>}
                  {p.has_api_access && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,114,190,0.1)', color: 'var(--accent-purple)' }}>API</span>}
                  {p.has_advanced_reports && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(242,193,78,0.1)', color: 'var(--accent-gold)' }}>Reportes+</span>}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-neu btn-primary" onClick={() => savePlan(p.id)} disabled={saving} style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>{saving ? '...' : '✓ Guardar'}</button>
                      <button className="btn-neu btn-ghost" onClick={() => setEditingId(null)} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  ) : (
                    <button className="btn-neu btn-ghost" onClick={() => { setEditingId(p.id); setEditPrice(p.price_monthly.toString()); setEditUsers(p.max_users) }} style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}>
                      ✎ Editar Precio y Usuarios
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreate && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <form onSubmit={handleCreatePlan} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>+ Nuevo Plan de Suscripción</h2>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Nombre del Plan *', field: 'name' as const, placeholder: 'Premium', span: 2 },
                { label: 'Slug (identificador) *', field: 'slug' as const, placeholder: 'premium', span: 2 },
                { label: 'Descripción', field: 'description' as const, placeholder: 'Para negocios avanzados', span: 2 },
                { label: 'Precio Mensual (USD) *', field: 'price_monthly' as const, placeholder: '49' },
                { label: 'Precio Anual (USD)', field: 'price_yearly' as const, placeholder: '490' },
                { label: 'Máx. Usuarios', field: 'max_users' as const, placeholder: '5' },
                { label: 'Máx. Productos', field: 'max_products' as const, placeholder: '500' },
                { label: 'Máx. Sucursales', field: 'max_branches' as const, placeholder: '2' },
                { label: 'Días de Prueba', field: 'trial_days' as const, placeholder: '14' },
              ].map(({ label, field, placeholder, span }) => (
                <div key={field} style={{ gridColumn: span ? `span ${span}` : undefined }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
                  <input type="text" className="input-neu" value={newPlan[field]} onChange={NP(field)} placeholder={placeholder} style={{ width: '100%' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-neu btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>{saving ? 'Creando...' : 'Crear Plan'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
