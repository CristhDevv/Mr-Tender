'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  currency: string;
  max_users: number;
  max_products: number;
  max_branches: number;
  is_active: boolean;
}

export default function PlansAdminPage() {
  const supabase = createPlatformClient()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState<string>('')
  const [editUsers, setEditUsers] = useState<number>(0)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price_monthly, currency, max_users, max_products, max_branches, is_active')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (err) {
      console.error('Error fetching plans:', err)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id)
    setEditPrice(plan.price_monthly.toString())
    setEditUsers(plan.max_users)
  }

  async function savePlan(planId: string) {
    try {
      setUpdating(true)
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          price_monthly: parseFloat(editPrice),
          max_users: editUsers
        })
        .eq('id', planId)

      if (error) throw error
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, price_monthly: parseFloat(editPrice), max_users: editUsers } : p))
      setEditingId(null)
    } catch (err) {
      console.error('Error updating plan:', err)
      alert('Error al guardar los cambios del plan.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Planes de Suscripción
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Configura y edita los precios y límites de consumo de los diferentes niveles de servicio
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando planes...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {plans.map(p => {
            const isEditing = editingId === p.id
            return (
              <div key={p.id} className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{p.name}</h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: p.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)',
                    color: p.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }}>
                    {p.is_active ? 'Activo' : 'Pausado'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>$</span>
                      <input
                        type="number"
                        className="input-neu"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        style={{ width: 90, padding: '4px 8px', fontSize: '1rem', fontWeight: 700 }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {formatCurrency(p.price_monthly)}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ mes ({p.currency})</span>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Usuarios máx:</span>
                    {isEditing ? (
                      <input
                        type="number"
                        className="input-neu"
                        value={editUsers}
                        onChange={e => setEditUsers(parseInt(e.target.value) || 0)}
                        style={{ width: 70, padding: '2px 6px', textAlign: 'right' }}
                      />
                    ) : (
                      <strong style={{ color: 'var(--text-primary)' }}>{p.max_users === 99999 ? 'Ilimitados' : p.max_users}</strong>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Productos máx:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.max_products === 99999 ? 'Ilimitados' : p.max_products}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sucursales máx:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.max_branches}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-neu btn-primary" onClick={() => savePlan(p.id)} disabled={updating} style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                        {updating ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button className="btn-neu btn-ghost" onClick={() => setEditingId(null)} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                        X
                      </button>
                    </div>
                  ) : (
                    <button className="btn-neu btn-ghost" onClick={() => startEdit(p)} style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}>
                      Editar Plan
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
