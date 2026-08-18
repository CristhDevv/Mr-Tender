'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Plus,
  Search,
  Tag
} from 'lucide-react'

interface DBProduct {
  id: string
  sku: string
  name: string
  product_type: string
  sale_price: number
  cost_price: number
  is_active: boolean
  categories?: { name: string } | null
  inventory?: { quantity: number }[]
}

export default function ProductsPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [products, setProducts] = useState<DBProduct[]>([])
  const [categories, setCategories] = useState<string[]>(['Todos'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id

        const { data, error } = await supabase
          .from('products')
          .select(`
            id, sku, name, product_type, sale_price, cost_price, is_active,
            categories (name),
            inventory (quantity)
          `)
          .eq('tenant_id', tenant_id)
          .order('name', { ascending: true })

        if (error) throw error

        if (data) {
          setProducts(data as any)
          const cats = ['Todos', ...Array.from(new Set(data.map((p: any) => p.categories?.name || 'General')))]
          setCategories(cats)
        }
      } catch (err) {
        console.error('Error loading products:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const filtered = products.filter(p => {
    const catName = p.categories?.name || 'General'
    const matchCat = selectedCategory === 'Todos' || catName === selectedCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const getStock = (p: DBProduct) => {
    if (!p.inventory || p.inventory.length === 0) return 0
    return p.inventory.reduce((acc, curr) => acc + Number(curr.quantity), 0)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando productos...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Catálogo de Productos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>{products.length} productos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} strokeWidth={2} />
            <span>Importar</span>
          </button>
          <Link href="/products/new" className="btn-neu btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo producto</span>
          </Link>
        </div>
      </div>

      {/* Monochromatic KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { label: 'Total productos', value: products.length, Icon: Package, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
          { label: 'Activos', value: products.filter(p => p.is_active).length, Icon: CheckCircle2, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
          { label: 'Stock bajo', value: products.filter(p => getStock(p) <= 5 && getStock(p) > 0).length, Icon: AlertTriangle, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
          { label: 'Sin stock', value: products.filter(p => getStock(p) === 0).length, Icon: XCircle, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
        ].map(s => {
          const StatIcon = s.Icon
          return (
            <div key={s.label} className="neu-card-sm" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="kpi-icon-wrap" style={{ background: s.bg, width: 32, height: 32, flexShrink: 0 }}>
                <StatIcon size={16} strokeWidth={2} style={{ color: s.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search & Category Pills (Wrapping without horizontal scroll) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="input-group">
          <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
          <input className="input-neu" placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.85rem' }} />
        </div>
        
        {/* Categories Wrapping Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} className="btn-neu" onClick={() => setSelectedCategory(c)}
              style={{ padding: '6px 12px', fontSize: '0.75rem', background: selectedCategory === c ? 'var(--accent-blue)' : 'var(--bg)', color: selectedCategory === c ? '#fff' : 'var(--text-secondary)', boxShadow: selectedCategory === c ? '4px 4px 10px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products Responsive List / Cards (No horizontal scroll) */}
      <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(product => {
          const stock = getStock(product)
          const margin = product.sale_price > 0 ? ((product.sale_price - product.cost_price) / product.sale_price * 100).toFixed(1) : '0'
          const catName = product.categories?.name || 'General'

          return (
            <div key={product.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span>SKU: {product.sku || 'S/N'}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Tag size={11} /> {catName}</span>
                  </div>
                </div>
                
                {/* Stock Badge */}
                <div style={{ flexShrink: 0 }}>
                  <span className={`badge ${stock === 0 ? 'badge-coral' : stock <= 5 ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                    {stock} uds
                  </span>
                </div>
              </div>

              {/* Price & Margins */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-deep)', paddingTop: 6, fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Costo: <span>{formatCurrency(product.cost_price)}</span>
                  <span style={{ marginLeft: 6, color: 'var(--accent-green)', fontWeight: 600 }}>({margin}% margen)</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Precio:</span>
                  <strong style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{formatCurrency(product.sale_price)}</strong>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <Package size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '0.85rem' }}>No se encontraron productos</div>
          </div>
        )}
      </div>

    </div>
  )
}
