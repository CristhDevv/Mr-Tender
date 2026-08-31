'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Check, Tag, Package, Boxes, Sparkles, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { findMasterProduct } from '@/lib/catalog/colombia-products'

interface Product {
  id?: string
  name: string
  price: number
  cost?: number
  sku?: string
  barcode?: string
  stock?: number
  category?: string
  wholesale_price?: number | null
  wholesale_min_qty?: number | null
  description?: string
}

interface PriceCheckerModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onAddToCart?: (product: Product, quantity?: number) => void
}

export default function PriceCheckerModal({
  isOpen,
  onClose,
  products,
  onAddToCart
}: PriceCheckerModalProps) {
  const [query, setQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedProduct(null)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSearchChange = (val: string) => {
    setQuery(val)
    const clean = val.trim().toLowerCase()
    if (!clean) {
      setSelectedProduct(null)
      return
    }

    // Exact barcode match first
    const exact = products.find(p => p.barcode === val.trim() || p.sku === val.trim())
    if (exact) {
      setSelectedProduct(exact)
      return
    }

    // Master Colombia catalog lookup
    const master = findMasterProduct(val.trim())
    if (master) {
      setSelectedProduct({
        name: master.name,
        price: master.suggestedPrice,
        cost: master.suggestedCost,
        barcode: master.barcode,
        category: master.category,
        wholesale_price: master.wholesalePrice,
        wholesale_min_qty: master.wholesaleMinQty,
        stock: 0
      })
      return
    }

    // Partial search in inventory
    const partial = products.find(p =>
      p.name.toLowerCase().includes(clean) ||
      (p.barcode && p.barcode.includes(clean)) ||
      (p.sku && p.sku.toLowerCase().includes(clean))
    )
    if (partial) {
      setSelectedProduct(partial)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && selectedProduct && onAddToCart) {
      onAddToCart(selectedProduct, 1)
      onClose()
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
          maxWidth: 620,
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.1))'
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
              <Tag size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Verificador de Precios <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--text-muted)' }}>F10</span>
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Escanea el código de barras o escribe el nombre del producto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={20} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Escanear código de barras (ej. 7702007001014) o buscar..."
            style={{
              width: '100%',
              padding: '14px 16px 14px 44px',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 14,
              border: '2px solid var(--accent-blue, #2563eb)',
              outline: 'none',
              background: 'var(--bg-primary, #f8fafc)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Display Result Box */}
        {selectedProduct ? (
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(37,99,235,0.04) 0%, rgba(37,99,235,0.01) 100%)',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-blue, #2563eb)', letterSpacing: '0.05em' }}>
                    {selectedProduct.category || 'General'}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                    {selectedProduct.name}
                  </h3>
                </div>
                {selectedProduct.barcode && (
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6, color: 'var(--text-muted)' }}>
                    {selectedProduct.barcode}
                  </span>
                )}
              </div>
            </div>

            {/* Price Main Display */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: selectedProduct.wholesale_price ? '1fr 1fr' : '1fr',
                gap: 12,
                background: 'var(--bg-card, #ffffff)',
                padding: 16,
                borderRadius: 14,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Precio Unitario
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-green, #16a34a)', letterSpacing: '-0.03em', marginTop: 2 }}>
                  {formatCurrency(selectedProduct.price)}
                </div>
              </div>

              {selectedProduct.wholesale_price && (
                <div style={{ borderLeft: '1px dashed var(--border-color, #e2e8f0)', paddingLeft: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue, #2563eb)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={13} />
                    Precio Mayoreo ({selectedProduct.wholesale_min_qty || 3}+ uds)
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-blue, #2563eb)', letterSpacing: '-0.03em', marginTop: 2 }}>
                    {formatCurrency(selectedProduct.wholesale_price)}
                  </div>
                </div>
              )}
            </div>

            {/* Stock and Availability Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                <Boxes size={16} style={{ color: 'var(--accent-blue)' }} />
                <span>Existencias en Bodega: <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.stock ?? 'Disponible'}</strong></span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                IVA incluido
              </span>
            </div>

            {/* Actions */}
            {onAddToCart && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(selectedProduct, 1)
                    onClose()
                  }}
                  className="btn-neu btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 12
                  }}
                >
                  <span>Agregar al Ticket Actual (Enter)</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              border: '2px dashed var(--border-color, #e2e8f0)',
              borderRadius: 16,
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10
            }}
          >
            <Package size={40} strokeWidth={1.5} style={{ opacity: 0.6 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                Listo para verificar precio
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Pasa el producto por el lector láser o usa el teclado
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={onClose}
            className="btn-neu"
            style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: 10 }}
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
