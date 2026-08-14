'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando productos...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Catálogo de Productos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 3 }}>{products.length} productos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>⬆ Importar</button>
          <Link href="/products/new" className="btn-neu btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>+ Nuevo producto</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total productos', value: products.length, icon: '📦', color: 'var(--accent-blue)' },
          { label: 'Activos', value: products.filter(p => p.is_active).length, icon: '✅', color: 'var(--accent-green)' },
          { label: 'Stock bajo', value: products.filter(p => getStock(p) <= 5 && getStock(p) > 0).length, icon: '⚠️', color: 'var(--accent-amber)' },
          { label: 'Sin stock', value: products.filter(p => getStock(p) === 0).length, icon: '❌', color: 'var(--accent-coral)' },
        ].map(s => (
          <div key={s.label} className="neu-card-sm" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="input-group" style={{ flex: 1, minWidth: 220 }}>
          <span className="input-icon">🔍</span>
          <input className="input-neu" placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map(c => (
            <button key={c} className="btn-neu" onClick={() => setSelectedCategory(c)}
              style={{ padding: '9px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', background: selectedCategory === c ? 'var(--accent-blue)' : 'var(--bg)', color: selectedCategory === c ? '#fff' : 'var(--text-secondary)', boxShadow: selectedCategory === c ? '4px 4px 10px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="neu-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-neu">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th style={{ textAlign: 'right' }}>Precio venta</th>
                <th style={{ textAlign: 'right' }}>Costo</th>
                <th style={{ textAlign: 'right' }}>Margen</th>
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => {
                const stock = getStock(product)
                const margin = product.sale_price > 0 ? ((product.sale_price - product.cost_price) / product.sale_price * 100).toFixed(1) : '0'
                const catName = product.categories?.name || 'General'
                return (
                  <tr key={product.id}>
                    <td><code style={{ fontSize: '0.78rem', background: 'var(--bg-deep)', padding: '2px 7px', borderRadius: 6, color: 'var(--text-secondary)' }}>{product.sku || 'S/N'}</code></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</span></td>
                    <td><span className="badge badge-blue">{catName}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(product.sale_price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(product.cost_price)}</td>
                    <td style={{ textAlign: 'right' }}><span className="badge badge-green">{margin}%</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${stock === 0 ? 'badge-coral' : stock <= 5 ? 'badge-amber' : 'badge-gray'}`}>{stock}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${product.is_active ? 'badge-green' : 'badge-gray'}`}>{product.is_active ? 'Activo' : 'Inactivo'}</span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No se encontraron productos en el catálogo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
