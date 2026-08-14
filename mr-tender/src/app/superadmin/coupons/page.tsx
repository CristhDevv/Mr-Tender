'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
}

export default function CouponsAdminPage() {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState('percentage')
  const [value, setValue] = useState('')
  const [maxUses, setMaxUses] = useState('100')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function fetchCoupons() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('platform_coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (err: any) {
      console.error('Error fetching coupons:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !value) return

    try {
      setCreating(true)
      const { data: newId, error } = await supabase.rpc('superadmin_create_coupon', {
        p_code: code.toUpperCase().trim(),
        p_description: description.trim() || 'Descuento promocional',
        p_discount_type: discountType,
        p_discount_value: parseFloat(value),
        p_max_uses: parseInt(maxUses) || 100
      })

      if (error) throw error
      // Refresh list
      await fetchCoupons()
      setCode('')
      setDescription('')
      setValue('')
      setMaxUses('100')
      setShowForm(false)
    } catch (err: any) {
      console.error('Error creating coupon:', err)
      alert('Error al crear el cupón: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  async function toggleCouponActive(couponId: string, currentActive: boolean) {
    try {
      const { error } = await supabase.rpc('superadmin_toggle_coupon', {
        p_coupon_id: couponId,
        p_is_active: !currentActive
      })
      if (error) throw error
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, is_active: !currentActive } : c))
    } catch (err: any) {
      console.error('Error updating coupon:', err)
      alert('Error: ' + err.message)
    }
  }

  const activeCoupons = coupons.filter(c => c.is_active)
  const totalDiscountsGiven = coupons.reduce((sum, c) => sum + c.used_count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Cupones de Descuento
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Crea y administra los códigos promocionales para la suscripción de nuevos inquilinos
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
          {showForm ? '✕ Cancelar' : '+ Crear Cupón'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Total Cupones</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{coupons.length}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Cupones Activos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>{activeCoupons.length}</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Descuentos Usados</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-purple)' }}>{totalDiscountsGiven}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreateCoupon} className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Nuevo Cupón de Descuento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Código del Cupón *</label>
              <input type="text" className="input-neu" placeholder="E.g., PROMO40" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Tipo de Descuento *</label>
              <select className="input-neu" value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ width: '100%' }}>
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto Fijo (USD)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                {discountType === 'percentage' ? 'Descuento (%)' : 'Monto (USD)'} *
              </label>
              <input type="number" className="input-neu" placeholder={discountType === 'percentage' ? 'E.g., 40' : 'E.g., 10.00'} value={value} onChange={e => setValue(e.target.value)} required min="1" max={discountType === 'percentage' ? '100' : undefined} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Usos máximos</label>
              <input type="number" className="input-neu" placeholder="100" value={maxUses} onChange={e => setMaxUses(e.target.value)} min="1" style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Descripción</label>
              <input type="text" className="input-neu" placeholder="Descuento especial para clientes nuevos" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn-neu btn-ghost" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', fontSize: '0.85rem' }}>Cancelar</button>
            <button type="submit" className="btn-neu btn-primary" disabled={creating} style={{ padding: '10px 24px', fontSize: '0.85rem' }}>
              {creating ? 'Creando...' : '+ Crear Cupón'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="neu-card" style={{ padding: '16px 20px', background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando cupones...</div>
      ) : coupons.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏷️</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay cupones creados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Usa el botón de arriba para crear tu primer cupón promocional.</p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-deep)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Código</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Descripción</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Descuento</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Usos</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.description}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `$${c.discount_value} USD`}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border-color)', overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ height: '100%', background: 'var(--accent-blue)', borderRadius: 2, width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {c.used_count} / {c.max_uses}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                      background: c.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)',
                      color: c.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                    }}>
                      {c.is_active ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      className="btn-neu btn-ghost"
                      onClick={() => toggleCouponActive(c.id, c.is_active)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: c.is_active ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}
                    >
                      {c.is_active ? '⏸ Desactivar' : '▶ Activar'}
                    </button>
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
