'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Tag,
  Plus,
  ArrowLeft,
  RefreshCw,
  Trash2
} from 'lucide-react'

interface Coupon {
  id: string
  code: string
  description: string
  discount_type: string
  discount_value: number
  max_uses: number
  used_count: number
  is_active: boolean
}

export default function CouponsAdminPage() {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [view, setView] = useState<'list' | 'new' | 'edit'>('list')
  const [newCode, setNewCode] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState('percentage')
  const [newValue, setNewValue] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('100')

  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editMaxUses, setEditMaxUses] = useState('')

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function fetchCoupons() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('platform_coupons').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCoupons(data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.rpc('superadmin_create_coupon', {
      p_code: newCode.toUpperCase().trim(),
      p_description: newDesc.trim() || 'Descuento promocional',
      p_discount_type: newType,
      p_discount_value: parseFloat(newValue),
      p_max_uses: parseInt(newMaxUses) || 100
    })
    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }
    await fetchCoupons()
    setView('list')
    setNewCode('')
    setNewDesc('')
    setNewValue('')
    setNewMaxUses('100')
    setSaving(false)
  }

  function startEdit(c: Coupon) {
    setEditingCoupon(c)
    setEditDesc(c.description)
    setEditValue(c.discount_value.toString())
    setEditMaxUses(c.max_uses.toString())
    setView('edit')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCoupon) return
    setSaving(true)
    const { error } = await supabase.rpc('superadmin_update_coupon', {
      p_coupon_id: editingCoupon.id,
      p_description: editDesc,
      p_discount_value: parseFloat(editValue),
      p_max_uses: parseInt(editMaxUses)
    })
    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }
    await fetchCoupons()
    setView('list')
    setEditingCoupon(null)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.rpc('superadmin_toggle_coupon', { p_coupon_id: id, p_is_active: !current })
    if (error) return alert('Error: ' + error.message)
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`¿Eliminar permanentemente el cupón "${code}"?`)) return
    const { error } = await supabase.rpc('superadmin_delete_coupon', { p_coupon_id: id })
    if (error) return alert('Error: ' + error.message)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const activeCoupons = coupons.filter(c => c.is_active).length
  const totalUses = coupons.reduce((sum, c) => sum + c.used_count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Cupones de Descuento
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Códigos promocionales para adquisición y fidelización de comercios.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchCoupons} className="btn-neu btn-ghost" title="Recargar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {view === 'list' ? (
            <button
              onClick={() => setView('new')}
              className="btn-neu btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} strokeWidth={2} />
              <span>Crear Cupón</span>
            </button>
          ) : (
            <button
              onClick={() => setView('list')}
              className="btn-neu btn-ghost"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Volver a Cupones</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="neu-card" style={{ padding: 12, border: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* ── DEDICATED VIEW: CREATE NEW COUPON ── */}
      {view === 'new' && (
        <div className="neu-card animate-scale-in" style={{ padding: 26, maxWidth: 600, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Crear Cupón de Descuento
            </h2>
          </div>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Código del Cupón *
              </label>
              <input
                type="text"
                className="input-neu"
                placeholder="PROMO2026, BIENVENIDA50..."
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                required
                style={{ width: '100%', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Descripción
              </label>
              <input
                type="text"
                className="input-neu"
                placeholder="Descuento de apertura..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Tipo de Descuento
                </label>
                <select
                  className="input-neu"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Valor *
                </label>
                <input
                  type="number"
                  className="input-neu"
                  placeholder={newType === 'percentage' ? 'Ej: 20' : 'Ej: 50000'}
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Límite Máximo de Usos
              </label>
              <input
                type="number"
                className="input-neu"
                value={newMaxUses}
                onChange={e => setNewMaxUses(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
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
                disabled={saving}
                className="btn-neu btn-primary"
                style={{ padding: '8px 24px', fontWeight: 700 }}
              >
                {saving ? 'Guardando...' : 'Crear Cupón'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DEDICATED VIEW: EDIT COUPON ── */}
      {view === 'edit' && editingCoupon && (
        <div className="neu-card animate-scale-in" style={{ padding: 26, maxWidth: 600, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Editar Cupón: {editingCoupon.code}
            </h2>
          </div>

          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Descripción
              </label>
              <input
                type="text"
                className="input-neu"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Valor del Descuento
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Máximo de Usos
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={editMaxUses}
                  onChange={e => setEditMaxUses(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>
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
                disabled={saving}
                className="btn-neu btn-primary"
                style={{ padding: '8px 24px', fontWeight: 700 }}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DEDICATED VIEW: LIST OF COUPONS ── */}
      {view === 'list' && (
        <>
          {/* Stats Ribbon */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div className="neu-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Cupones</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{coupons.length}</div>
            </div>

            <div className="neu-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activos</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeCoupons}</div>
            </div>

            <div className="neu-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Usos</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalUses}</div>
            </div>
          </div>

          {loading ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <div>Cargando cupones...</div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Tag size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay cupones creados</h3>
              <button onClick={() => setView('new')} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                Crear primer cupón
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Descripción</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Descuento</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Usos</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {c.code}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {c.description}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {c.used_count} / {c.max_uses}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: 'var(--bg-deep)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)'
                        }}>
                          {c.is_active ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => startEdit(c)}
                            className="btn-neu btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleActive(c.id, c.is_active)}
                            className="btn-neu btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          >
                            {c.is_active ? 'Pausar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.code)}
                            className="btn-neu btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  )
}
