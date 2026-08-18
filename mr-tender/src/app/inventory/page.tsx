'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign,
  Package,
  AlertTriangle,
  XCircle,
  Wrench,
  ArrowLeftRight,
  ClipboardCheck,
  Search,
  Building2,
  Boxes,
  CheckCircle2
} from 'lucide-react'

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

  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'stock', label: 'Stock actual', Icon: Package },
    { key: 'movements', label: 'Kardex', Icon: Boxes },
    { key: 'adjustments', label: 'Ajustes', Icon: Wrench },
    { key: 'transfers', label: 'Transferencias', Icon: ArrowLeftRight },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando inventarios...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Responsive Actions Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Inventario</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Control de stock multi-almacén</p>
        </div>

        {/* Action Buttons Row (Responsive Grid on Mobile) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          <button className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Wrench size={15} strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
            <span>Ajuste</span>
          </button>
          <button className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ArrowLeftRight size={15} strokeWidth={2} style={{ color: 'var(--accent-purple)' }} />
            <span>Transferencia</span>
          </button>
          <button className="btn-neu btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ClipboardCheck size={15} strokeWidth={2.2} />
            <span>Conteo físico</span>
          </button>
        </div>
      </div>

      {/* Monochromatic KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Valor inventario', value: formatCurrency(totalValue), Icon: DollarSign, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
          { label: 'En stock', value: inventory.filter(i => i.quantity > 0).length, Icon: Package, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
          { label: 'Stock bajo', value: lowStock, Icon: AlertTriangle, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
          { label: 'Sin stock', value: outOfStock, Icon: XCircle, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
        ].map(s => {
          const StatIcon = s.Icon
          return (
            <div key={s.label} className="kpi-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <div className="kpi-icon-wrap" style={{ background: s.bg, width: 32, height: 32, flexShrink: 0 }}>
                <StatIcon size={16} strokeWidth={2} style={{ color: s.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Responsive Segmented Tabs (Wrap without horizontal scroll) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--neu-pressed)' }}>
        {TABS.map(t => {
          const TabIcon = t.Icon
          const isActive = tab === t.key
          return (
            <button key={t.key} className="btn-neu" onClick={() => setTab(t.key)}
              style={{ flex: '1 1 auto', minWidth: 100, padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: isActive ? 'var(--bg)' : 'transparent', boxShadow: isActive ? 'var(--neu-raised)' : 'none', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isActive ? 700 : 500 }}>
              <TabIcon size={14} strokeWidth={2} style={{ color: isActive ? 'var(--accent-blue)' : 'inherit' }} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Stock Tab View */}
      {tab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="input-group">
            <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
            <input className="input-neu" placeholder="Buscar por producto o SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.85rem' }} />
          </div>

          {/* High-density responsive items list (No horizontal scroll) */}
          <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(item => {
              const sku = item.products?.sku || 'S/N'
              const name = item.products?.name || 'Producto sin nombre'
              const warehouse = item.warehouses?.name || 'Almacén principal'
              const min = item.products?.min_stock || 0
              const max = item.products?.max_stock || 0
              const isLow = item.quantity <= min && item.quantity > 0
              const isOut = item.quantity === 0

              return (
                <div key={item.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span>SKU: {sku}</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={11} /> {warehouse}</span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div style={{ flexShrink: 0 }}>
                      {isOut ? (
                        <span className="badge badge-coral" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>Sin stock</span>
                      ) : isLow ? (
                        <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>Stock bajo</span>
                      ) : (
                        <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>En stock</span>
                      )}
                    </div>
                  </div>

                  {/* Stock and Value line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-deep)', paddingTop: 6, fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Stock: <strong style={{ color: isOut ? 'var(--accent-coral)' : isLow ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{item.quantity} uds</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>(Mín: {min})</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Total:</span>
                      <strong style={{ color: 'var(--accent-blue)', fontSize: '0.82rem' }}>{formatCurrency(Number(item.quantity) * Number(item.avg_cost))}</strong>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <Boxes size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                <div style={{ fontSize: '0.85rem' }}>No se encontraron productos en el inventario</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Movements (Kardex) Tab */}
      {tab === 'movements' && (
        <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Boxes size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--accent-blue)' }} />
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Kardex de Movimientos</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>Historial automatizado de entradas, salidas y transferencias</div>
        </div>
      )}

      {/* Adjustments Tab */}
      {tab === 'adjustments' && (
        <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Wrench size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--accent-blue)' }} />
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Ajustes de Inventario</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>Registra mermas, vencimientos o correcciones manuales</div>
        </div>
      )}

      {/* Transfers Tab */}
      {tab === 'transfers' && (
        <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ArrowLeftRight size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--accent-purple)' }} />
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Transferencias Entre Almacenes</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>Mueve inventario entre bodegas y puntos de venta</div>
        </div>
      )}

    </div>
  )
}
