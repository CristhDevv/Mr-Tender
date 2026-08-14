'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'

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
  const supabase = createPlatformClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function fetchCoupons() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (err) {
      console.error('Error fetching coupons:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !value) return

    try {
      setCreating(true)
      const { data, error } = await supabase
        .from('coupons')
        .insert([{
          code: code.toUpperCase().trim(),
          description: description.trim() || 'Descuento promocional',
          discount_type: 'percentage',
          discount_value: parseFloat(value),
          max_uses: 100,
          used_count: 0,
          is_active: true
        }])
        .select()

      if (error) throw error
      if (data) setCoupons(prev => [data[0], ...prev])
      
      // Clear form
      setCode('')
      setDescription('')
      setValue('')
    } catch (err) {
      console.error('Error creating coupon:', err)
      alert('Error al crear el cupón. Es posible que el código ya exista.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleCouponActive(couponId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !currentActive })
        .eq('id', couponId)

      if (error) throw error
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, is_active: !currentActive } : c))
    } catch (err) {
      console.error('Error updating coupon:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Cupones de Descuento
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Crea y administra los códigos promocionales para la suscripción de inquilinos
        </p>
      </div>

      {/* Formulario de creación */}
      <form onSubmit={handleCreateCoupon} className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Crear Nuevo Cupón</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Código del Cupón</label>
            <input
              type="text"
              className="input-neu"
              placeholder="E.g., PROMO40"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Descuento (%)</label>
            <input
              type="number"
              className="input-neu"
              placeholder="E.g., 40"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
              min="1"
              max="100"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Descripción</label>
            <input
              type="text"
              className="input-neu"
              placeholder="Descuento en suscripción anual"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <button type="submit" className="btn-neu btn-primary" disabled={creating} style={{ alignSelf: 'flex-end', padding: '10px 24px', fontSize: '0.85rem' }}>
          {creating ? 'Creando...' : 'Crear Cupón'}
        </button>
      </form>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando cupones...</div>
      ) : coupons.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏷</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay cupones creados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Usa el formulario de arriba para crear tu primer cupón promocional.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Código</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Descripción</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Descuento</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Usos</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '0.02em' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {c.description}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {c.discount_value}% OFF
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {c.used_count} usos
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
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
                      {c.is_active ? 'Desactivar' : 'Activar'}
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
