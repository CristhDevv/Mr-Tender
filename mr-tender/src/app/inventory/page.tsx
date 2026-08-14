'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface DBInventory {
  id: string
  quantity: number
  avg_cost: number
  products?: {
    name: string
    sku: string
    product_type: string
    min_stock: number
    max_stock: number
    categories?: { name: string } | null
  } | null
  warehouses?: {
    name: string
  } | null
}

type TabKey = 'stock' | 'movements' | 'adjustments' | 'transfers'

export default function InventoryPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabKey>('stock')
  const [search, setSearch] = useState('')
  const [inventory, setInventory] = useState<DBInventory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInventory() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id

        const { data, error } = await supabase
          .from('inventory')
          .select(`
            id, quantity, avg_cost,
            products (name, sku, product_type, min_stock, max_stock, categories (name)),
            warehouses (name)
          `)
          .eq('tenant_id', tenant_id)

        if (error) throw error
        if (data) setInventory(data as any)
      } catch (err) {
        console.error('Error loading inventory:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInventory()
  }, [])

  const filtered = inventory.filter(i => {
    const name = i.products?.name || ''
    const sku = i.products?.sku || ''
    return name.toLowerCase().includes(search.toLowerCase()) || sku.toLowerCase().includes(search.toLowerCase())
  })

  const lowStock = inventory.filter(i => {
    const min = i.products?.min_stock || 0
    return i.quantity <= min && i.quantity > 0
  }).length

  const outOfStock = inventory.filter(i => i.quantity === 0).length
  const totalValue = inventory.reduce((s, i) => s + Number(i.quantity) * Number(i.avg_cost), 0)

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'stock', label: '📦 Stock actual' },
    { key: 'movements', label: '📋 Movimientos (Kardex)' },
    { key: 'adjustments', label: '🔧 Ajustes' },
    { key: 'transfers', label: '🔄 Transferencias' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando inventarios...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Inventario</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Control de stock multi-almacén</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>🔧 Ajuste</button>
          <button className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>🔄 Transferencia</button>
          <button className="btn-neu btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>📋 Conteo físico</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Valor del inventario', value: formatCurrency(totalValue), icon: '💰', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
          { label: 'Productos en stock', value: inventory.filter(i => i.quantity > 0).length, icon: '📦', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
          { label: 'Stock bajo', value: lowStock, icon: '⚠️', color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
          { label: 'Sin stock', value: outOfStock, icon: '❌', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon-wrap" style={{ background: s.bg }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '4px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', width: 'fit-content', boxShadow: 'var(--neu-pressed)' }}>
        {TABS.map(t => (
          <button key={t.key} className="btn-neu" onClick={() => setTab(t.key)}
            style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', background: tab === t.key ? 'var(--bg)' : 'transparent', boxShadow: tab === t.key ? 'var(--neu-raised)' : 'none', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      {tab === 'stock' && (
        <>
          <div className="input-group">
            <span className="input-icon">🔍</span>
            <input className="input-neu" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="neu-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-neu">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Almacén</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'center' }}>Mín/Máx</th>
                    <th style={{ textAlign: 'right' }}>Costo prom</th>
                    <th style={{ textAlign: 'right' }}>Valor Total</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const sku = item.products?.sku || 'S/N'
                    const name = item.products?.name || 'Producto sin nombre'
                    const warehouse = item.warehouses?.name || 'Almacén principal'
                    const min = item.products?.min_stock || 0
                    const max = item.products?.max_stock || 0
                    const isLow = item.quantity <= min && item.quantity > 0
                    const isOut = item.quantity === 0
                    return (
                      <tr key={item.id}>
                        <td><code style={{ fontSize: '0.78rem', background: 'var(--bg-deep)', padding: '2px 7px', borderRadius: 6, color: 'var(--text-secondary)' }}>{sku}</code></td>
                        <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span></td>
                        <td><span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{warehouse}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: isOut ? 'var(--accent-coral)' : isLow ? 'var(--accent-amber)' : 'var(--accent-green)' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{min} / {max || '∞'}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.avg_cost)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.quantity * item.avg_cost)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${isOut ? 'badge-coral' : isLow ? 'badge-amber' : 'badge-green'}`}>
                            {isOut ? 'Sin stock' : isLow ? 'Stock bajo' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No hay registros de inventario
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab !== 'stock' && (
        <div className="neu-card" style={{ padding: '52px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚧</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Próximamente</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Esta sección se conectará a Supabase con datos reales.</div>
        </div>
      )}
    </div>
  )
}
