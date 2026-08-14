'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Coupon {
  id: string; code: string; description: string; discount_type: string;
  discount_value: number; max_uses: number; used_count: number; is_active: boolean;
}

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}
const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--bg)', borderRadius: 20, padding: 32, width: '100%',
  maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 18,
  boxShadow: 'var(--neu-card)',
}

export default function CouponsAdminPage() {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState('percentage')
  const [newValue, setNewValue] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('100')

  // Edit modal
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editMaxUses, setEditMaxUses] = useState('')

  useEffect(() => { fetchCoupons() }, [])

  async function fetchCoupons() {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('platform_coupons').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCoupons(data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.rpc('superadmin_create_coupon', {
      p_code: newCode.toUpperCase().trim(),
      p_description: newDesc.trim() || 'Descuento promocional',
      p_discount_type: newType,
      p_discount_value: parseFloat(newValue),
      p_max_uses: parseInt(newMaxUses) || 100
    })
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await fetchCoupons()
    setShowCreate(false); setNewCode(''); setNewDesc(''); setNewValue(''); setNewMaxUses('100')
    setSaving(false)
  }

  function openEdit(c: Coupon) {
    setEditingCoupon(c); setEditDesc(c.description); setEditValue(c.discount_value.toString()); setEditMaxUses(c.max_uses.toString())
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editingCoupon) return; setSaving(true)
    const { error } = await supabase.rpc('superadmin_update_coupon', {
      p_coupon_id: editingCoupon.id,
      p_description: editDesc,
      p_discount_value: parseFloat(editValue),
      p_max_uses: parseInt(editMaxUses)
    })
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setCoupons(prev => prev.map(c => c.id === editingCoupon.id ? { ...c, description: editDesc, discount_value: parseFloat(editValue), max_uses: parseInt(editMaxUses) } : c))
    setEditingCoupon(null); setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.rpc('superadmin_toggle_coupon', { p_coupon_id: id, p_is_active: !current })
    if (error) return alert('Error: ' + error.message)
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`¿Eliminar el cupón "${code}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.rpc('superadmin_delete_coupon', { p_coupon_id: id })
    if (error) return alert('Error: ' + error.message)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const activeCoupons = coupons.filter(c => c.is_active).length
  const totalUses = coupons.reduce((sum, c) => sum + c.used_count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Cupones de Descuento</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Códigos promocionales para la captación y retención de clientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchCoupons} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>↻</button>
          <button onClick={() => setShowCreate(true)} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>+ Crear Cupón</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Cupones', value: coupons.length, color: 'var(--accent-blue)' },
          { label: 'Activos', value: activeCoupons, color: 'var(--accent-emerald)' },
          { label: 'Desactivados', value: coupons.length - activeCoupons, color: 'var(--text-muted)' },
          { label: 'Total Usos', value: totalUses, color: 'var(--accent-purple)' },
        ].map(s => (
          <div key={s.label} className="neu-card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {error && <div className="neu-card" style={{ padding: 16, background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}><p style={{ color: 'var(--accent-coral)', margin: 0, fontSize: '0.85rem' }}>⚠️ {error}</p></div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando cupones...</div>
      ) : coupons.length === 0 ? (
        <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏷️</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay cupones creados</h2>
          <button onClick={() => setShowCreate(true)} className="btn-neu btn-primary" style={{ marginTop: 16, padding: '10px 24px' }}>+ Crear primer cupón</button>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {['Código', 'Descripción', 'Descuento', 'Usos', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', fontWeight: 600, textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{c.code}</td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `$${c.discount_value} USD`}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--border-color)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--accent-blue)', borderRadius: 2, width: `${Math.min(100, (c.used_count / Math.max(c.max_uses, 1)) * 100)}%` }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.used_count}/{c.max_uses}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '4px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: c.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)', color: c.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {c.is_active ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(c)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>✎</button>
                      <button onClick={() => toggleActive(c.id, c.is_active)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', color: c.is_active ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
                        {c.is_active ? '⏸' : '▶'}
                      </button>
                      <button onClick={() => handleDelete(c.id, c.code)} className="btn-neu btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <form onSubmit={handleCreate} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>+ Nuevo Cupón</h2>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Código del Cupón *</label>
                <input type="text" className="input-neu" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="PROMO40" required style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Tipo *</label>
                <select className="input-neu" value={newType} onChange={e => setNewType(e.target.value)} style={{ width: '100%' }}>
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo (USD)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{newType === 'percentage' ? 'Descuento (%) *' : 'Monto (USD) *'}</label>
                <input type="number" className="input-neu" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={newType === 'percentage' ? '40' : '10.00'} required min="1" max={newType === 'percentage' ? '100' : undefined} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Usos Máximos</label>
                <input type="number" className="input-neu" value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)} placeholder="100" min="1" style={{ width: '100%' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Descripción</label>
                <input type="text" className="input-neu" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descuento especial para clientes nuevos" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-neu btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>{saving ? 'Creando...' : 'Crear Cupón'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingCoupon && (
        <div style={MODAL_STYLE} onClick={e => e.target === e.currentTarget && setEditingCoupon(null)}>
          <form onSubmit={handleEdit} style={PANEL_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>✎ Editar Cupón <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{editingCoupon.code}</span></h2>
              <button type="button" onClick={() => setEditingCoupon(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Descripción</label>
                <input type="text" className="input-neu" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Valor del Descuento</label>
                <input type="number" className="input-neu" value={editValue} onChange={e => setEditValue(e.target.value)} min="1" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Usos Máximos</label>
                <input type="number" className="input-neu" value={editMaxUses} onChange={e => setEditMaxUses(e.target.value)} min={editingCoupon.used_count} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingCoupon(null)} className="btn-neu btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
