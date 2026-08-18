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
  Tag,
  Download,
  FileSpreadsheet,
  Printer,
  X
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
  const [tenantId, setTenantId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  // Modals
  const [showImportModal, setShowImportModal] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)

  // Import State
  const [importing, setImporting] = useState(false)
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [importSuccess, setImportSuccess] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tid = user.user_metadata?.tenant_id
      setTenantId(tid)

      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .limit(1)

      if (wh?.[0]) setWarehouseId(wh[0].id)

      const { data, error } = await supabase
        .from('products')
        .select(`
          id, sku, name, product_type, sale_price, cost_price, is_active,
          categories (name),
          inventory (quantity)
        `)
        .eq('tenant_id', tid)
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

  // Handle CSV file upload & parsing
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '')
      if (lines.length <= 1) return

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (cols.length >= 2 && cols[0]) {
          rows.push({
            name: cols[0],
            sale_price: parseFloat(cols[1]) || 0,
            cost_price: parseFloat(cols[2]) || (parseFloat(cols[1]) * 0.75) || 0,
            sku: cols[3] || 'SKU-' + Math.floor(100000 + Math.random() * 900000),
            stock: parseFloat(cols[4]) || 10
          })
        }
      }
      setParsedRows(rows)
    }
    reader.readAsText(file)
  }

  function downloadCsvTemplate() {
    const csvContent = 'Nombre,PrecioVenta,Costo,CodigoSKU,StockInicial\nArroz Diana 500g,2800,2100,7701234567890,24\nLeche Alqueria 1L,4500,3600,7709876543210,12\nAceite Premier 1L,9500,7800,7705556667770,8\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_productos_mrtender.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function executeBulkImport() {
    if (parsedRows.length === 0 || !tenantId) return
    setImporting(true)
    setImportSuccess('')

    try {
      for (const row of parsedRows) {
        const { data: newP, error: pErr } = await supabase
          .from('products')
          .insert([{
            tenant_id: tenantId,
            name: row.name,
            sku: row.sku,
            barcode: row.sku,
            sale_price: row.sale_price,
            cost_price: row.cost_price,
            min_stock: 3,
            max_stock: 100,
            is_active: true
          }])
          .select()
          .single()

        if (!pErr && newP && warehouseId) {
          await supabase.from('inventory').insert([{
            tenant_id: tenantId,
            warehouse_id: warehouseId,
            product_id: newP.id,
            quantity: row.stock,
            avg_cost: row.cost_price
          }])
        }
      }

      setImportSuccess(`¡Se importaron ${parsedRows.length} productos con éxito!`)
      setParsedRows([])
      await loadProducts()
      setTimeout(() => {
        setShowImportModal(false)
        setImportSuccess('')
      }, 1800)
    } catch (err: any) {
      console.error('Error importing:', err)
      alert('Error durante la importación: ' + err.message)
    } finally {
      setImporting(false)
    }
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
          <button onClick={() => setShowTagsModal(true)} className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={14} strokeWidth={2} />
            <span>Etiquetas</span>
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} strokeWidth={2} />
            <span>Importar Excel/CSV</span>
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

      {/* Search & Category Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="input-group">
          <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
          <input className="input-neu" placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.85rem' }} />
        </div>
        
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} className="btn-neu" onClick={() => setSelectedCategory(c)}
              style={{ padding: '6px 12px', fontSize: '0.75rem', background: selectedCategory === c ? 'var(--accent-blue)' : 'var(--bg)', color: selectedCategory === c ? '#fff' : 'var(--text-secondary)', boxShadow: selectedCategory === c ? '4px 4px 10px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products Responsive List */}
      <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(product => {
          const stock = getStock(product)
          const margin = product.sale_price > 0 ? ((product.sale_price - product.cost_price) / product.sale_price * 100).toFixed(1) : '0'
          const catName = product.categories?.name || 'General'

          return (
            <div key={product.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0 }}>
                  <Package size={18} strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                    <span>SKU: {product.sku || 'N/A'}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--accent-blue)' }}>{catName}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatCurrency(product.sale_price)}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)' }}>Margen {margin}%</div>
                </div>

                <div style={{ textAlign: 'right', minWidth: 60 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: stock <= 5 ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                    {stock} u
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Stock</div>
                </div>

                <div>
                  <span className={`badge ${product.is_active ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.68rem', padding: '4px 8px' }}>
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <Package size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '0.85rem' }}>No se encontraron productos</div>
          </div>
        )}
      </div>

      {/* ── MODAL: BULK CSV IMPORT ── */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 460, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--accent-green)' }} />
                <span>Importar Productos Masivamente</span>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowImportModal(false)} style={{ padding: '2px 6px' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Carga tu catálogo completo desde un archivo Excel guardado como CSV.
            </p>

            <button onClick={downloadCsvTemplate} className="btn-neu" style={{ width: '100%', padding: '9px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
              <Download size={14} />
              <span>Descargar Plantilla Excel/CSV de Ejemplo</span>
            </button>

            <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center', marginBottom: 14, background: 'var(--bg-deep)' }}>
              <input type="file" accept=".csv, .txt" onChange={handleCsvFile} style={{ display: 'block', margin: '0 auto', fontSize: '0.8rem' }} />
            </div>

            {parsedRows.length > 0 && (
              <div style={{ background: 'var(--accent-blue-lt)', padding: 10, borderRadius: 8, fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 14 }}>
                ✓ {parsedRows.length} productos detectados listos para importar
              </div>
            )}

            {importSuccess && (
              <div style={{ background: 'var(--accent-green-lt)', color: 'var(--accent-green)', padding: 10, borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, marginBottom: 14 }}>
                {importSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-neu" onClick={() => setShowImportModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button className="btn-neu btn-primary" disabled={parsedRows.length === 0 || importing} onClick={executeBulkImport} style={{ flex: 1, padding: 10 }}>
                {importing ? 'Importando...' : `Importar (${parsedRows.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BARCODE PRICE TAGS PRINTABLE ── */}
      {showTagsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                <Tag size={18} style={{ color: 'var(--accent-blue)' }} />
                <span>Generador de Etiquetas de Precios</span>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowTagsModal(false)} style={{ padding: '2px 6px' }}>✕</button>
            </div>

            {/* Printable Sticker Sheet */}
            <div id="price-tags-sheet" style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              {products.slice(0, 16).map(p => (
                <div key={p.id} style={{ border: '1px dashed #94A3B8', padding: 8, borderRadius: 6, textAlign: 'center', background: '#fff' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
                    {formatCurrency(p.sale_price)}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#64748B', fontFamily: 'monospace' }}>
                    {p.sku || 'SIN-CODIGO'}
                  </div>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=45x45&data=${p.sku || p.name}`} alt="QR" style={{ width: 35, height: 35, margin: '4px auto 0' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexShrink: 0 }}>
              <button className="btn-neu" onClick={() => setShowTagsModal(false)} style={{ flex: 1, padding: 10 }}>Cerrar</button>
              <button className="btn-neu btn-primary" onClick={() => window.print()} style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Printer size={15} />
                <span>Imprimir Etiquetas</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
