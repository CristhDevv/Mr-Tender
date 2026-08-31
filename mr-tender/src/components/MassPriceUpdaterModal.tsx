'use client'
import React, { useState } from 'react'
import {
  TrendingUp,
  Percent,
  DollarSign,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Boxes
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  sale_price: number
  cost_price: number
  categories?: { name: string } | null
  category_id?: string | null
}

interface MassPriceUpdaterModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  categories: { id: string; name: string }[]
  onApplyUpdates: (updates: Array<{ id: string; sale_price: number }>) => Promise<void>
}

export default function MassPriceUpdaterModal({
  isOpen,
  onClose,
  products,
  categories,
  onApplyUpdates
}: MassPriceUpdaterModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [updateMode, setUpdateMode] = useState<'percent' | 'fixed' | 'margin'>('percent')
  const [valueInput, setValueInput] = useState<string>('5')
  const [roundToHundreds, setRoundToHundreds] = useState<boolean>(true)
  const [applying, setApplying] = useState<boolean>(false)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  if (!isOpen) return null

  // Filter products by selected category
  const targetProducts = products.filter(p => {
    if (selectedCategory === 'all') return true
    return p.category_id === selectedCategory || p.categories?.name === selectedCategory
  })

  // Calculate preview of updated prices
  const val = parseFloat(valueInput) || 0
  const previewList = targetProducts.map(p => {
    const currentPrice = Number(p.sale_price || 0)
    const cost = Number(p.cost_price || 0)
    let newPrice = currentPrice

    if (updateMode === 'percent') {
      newPrice = currentPrice * (1 + val / 100)
    } else if (updateMode === 'fixed') {
      newPrice = Math.max(0, currentPrice + val)
    } else if (updateMode === 'margin') {
      // Desired gross margin percentage: Price = Cost / (1 - margin/100)
      if (val < 100 && cost > 0) {
        newPrice = cost / (1 - val / 100)
      } else {
        newPrice = currentPrice
      }
    }

    if (roundToHundreds) {
      newPrice = Math.round(newPrice / 100) * 100
    } else {
      newPrice = Math.round(newPrice)
    }

    const diff = newPrice - currentPrice

    return {
      id: p.id,
      name: p.name,
      category: p.categories?.name || 'General',
      currentPrice,
      newPrice,
      diff
    }
  })

  const changedItems = previewList.filter(item => item.diff !== 0)

  const handleApply = async () => {
    if (changedItems.length === 0) {
      alert('No hay cambios en los precios a aplicar.')
      return
    }
    const confirmMsg = `¿Estás seguro de actualizar masivamente los precios de ${changedItems.length} producto(s)?`
    if (!confirm(confirmMsg)) return

    setApplying(true)
    try {
      const payload = changedItems.map(item => ({
        id: item.id,
        sale_price: item.newPrice
      }))
      await onApplyUpdates(payload)
      setSuccessCount(changedItems.length)
      setTimeout(() => {
        setSuccessCount(null)
        onClose()
      }, 1500)
    } catch (err: any) {
      alert('Error al aplicar cambios: ' + err.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--accent-blue, #2563eb), #60a5fa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <TrendingUp size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Actualizador Masivo de Precios
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Ajusta precios por porcentaje, valor fijo o margen en toda la tienda o por categoría
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        {successCount !== null ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: '50%', background: 'rgba(22,163,74,0.12)', color: 'var(--accent-green, #16a34a)' }}>
              <CheckCircle2 size={44} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              ¡{successCount} Productos Actualizados con Éxito!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Los nuevos precios de venta ya están vigentes en el POS y catálogo.
            </p>
          </div>
        ) : (
          <>
            {/* Control Panel */}
            <div
              style={{
                background: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Category Filter */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Filtrar por Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-card, #ffffff)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="all">Todas las Categorías ({products.length} productos)</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adjustment Mode */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Tipo de Ajuste Masivo
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => { setUpdateMode('percent'); setValueInput('5'); }}
                      className="btn-neu"
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: updateMode === 'percent' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                        color: updateMode === 'percent' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      % Porcentaje
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUpdateMode('fixed'); setValueInput('500'); }}
                      className="btn-neu"
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: updateMode === 'fixed' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                        color: updateMode === 'fixed' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      $ Monto Fijo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUpdateMode('margin'); setValueInput('30'); }}
                      className="btn-neu"
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: updateMode === 'margin' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                        color: updateMode === 'margin' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      % Margen Deseado
                    </button>
                  </div>
                </div>
              </div>

              {/* Value Input & Rounding */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {updateMode === 'percent'
                      ? 'Porcentaje a aplicar (+ / - %)'
                      : updateMode === 'fixed'
                      ? 'Monto a sumar / restar ($ COP)'
                      : 'Margen de Ganancia deseado (%)'}
                  </label>
                  <input
                    type="number"
                    value={valueInput}
                    onChange={e => setValueInput(e.target.value)}
                    step={updateMode === 'fixed' ? '100' : '0.5'}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-card, #ffffff)',
                      color: 'var(--accent-blue, #2563eb)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                  <input
                    id="round-hundreds"
                    type="checkbox"
                    checked={roundToHundreds}
                    onChange={e => setRoundToHundreds(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent-blue, #2563eb)', cursor: 'pointer' }}
                  />
                  <label htmlFor="round-hundreds" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Redondear a centenas ($100 COP)
                  </label>
                </div>
              </div>
            </div>

            {/* Live Preview Table */}
            <div style={{ flex: 1, minHeight: 200, maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 12, marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color, #e2e8f0)', zIndex: 2 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>Producto</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>Categoría</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Precio Actual</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Nuevo Precio</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {previewList.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{item.category}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(item.currentPrice)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formatCurrency(item.newPrice)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.diff > 0 ? 'var(--accent-green)' : item.diff < 0 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>
                        {item.diff > 0 ? `+${formatCurrency(item.diff)}` : item.diff < 0 ? `-${formatCurrency(Math.abs(item.diff))}` : '$0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer and Submit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Se modificarán <strong style={{ color: 'var(--accent-blue)' }}>{changedItems.length}</strong> productos seleccionados
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || changedItems.length === 0}
                  className="btn-neu btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={16} />
                  <span>{applying ? 'Guardando...' : `Aplicar Cambios a ${changedItems.length} Productos`}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
