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
  X,
  Edit2,
  Trash2,
  Boxes,
  Check,
  TrendingUp
} from 'lucide-react'

interface DBProduct {
  id: string
  sku: string
  name: string
  product_type: string
  sale_price: number
  cost_price: number
  is_active: boolean
  category_id?: string | null
  categories?: { name: string } | null
  inventory?: { id?: string; quantity: number; warehouse_id?: string }[]
}

export default function ProductsPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [products, setProducts] = useState<DBProduct[]>([])
  const [categories, setCategories] = useState<string[]>(['Todos'])
  const [categoryList, setCategoryList] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  // Modals
  const [showImportModal, setShowImportModal] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showQuickStockModal, setShowQuickStockModal] = useState(false)

  // Edit / Create Product State
  const [editingProduct, setEditingProduct] = useState<DBProduct | null>(null)
  const [savingProduct, setSavingProduct] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    cost_price: '0',
    sale_price: '0',
    stock: '0',
    is_active: true
  })

  // Quick Stock Adjustment State
  const [stockProduct, setStockProduct] = useState<DBProduct | null>(null)
  const [stockDelta, setStockDelta] = useState('1')
  const [stockActionType, setStockActionType] = useState<'add' | 'remove' | 'set'>('add')
  const [savingStock, setSavingStock] = useState(false)

  // Import State
  const [importing, setImporting] = useState(false)
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [importSuccess, setImportSuccess] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [whRes, catsRes, prodsRes] = await Promise.all([
        supabase.from('warehouses').select('id').eq('tenant_id', tid).eq('is_active', true).limit(1),
        supabase.from('categories').select('id, name').eq('tenant_id', tid),
        supabase.from('products').select(`
          id, sku, name, product_type, sale_price, cost_price, is_active, category_id,
          categories (name),
          inventory (id, quantity, warehouse_id)
        `).eq('tenant_id', tid).order('name', { ascending: true })
      ])

      if (whRes.data?.[0]) setWarehouseId(whRes.data[0].id)
      if (catsRes.data) {
        setCategoryList(catsRes.data)
        const cats = ['Todos', ...Array.from(new Set(catsRes.data.map(c => c.name)))]
        setCategories(cats)
      }

      if (prodsRes.data) {
        setProducts(prodsRes.data as any)
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

  // Open Edit Product Modal
  function handleOpenEdit(p: DBProduct) {
    setEditingProduct(p)
    setProductForm({
      name: p.name,
      sku: p.sku || '',
      category_id: p.category_id || '',
      cost_price: String(p.cost_price || 0),
      sale_price: String(p.sale_price || 0),
      stock: String(getStock(p)),
      is_active: p.is_active
    })
    setShowEditModal(true)
  }

  // Save Product (Create or Update)
  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || savingProduct) return
    if (!productForm.name.trim()) return alert('El nombre es obligatorio')

    setSavingProduct(true)
    try {
      const saleP = parseFloat(productForm.sale_price) || 0
      const costP = parseFloat(productForm.cost_price) || 0
      const stockQty = parseFloat(productForm.stock) || 0

      if (editingProduct) {
        // Update product
        const { error: prodErr } = await supabase
          .from('products')
          .update({
            name: productForm.name.trim(),
            sku: productForm.sku.trim() || null,
            category_id: productForm.category_id || null,
            cost_price: costP,
            sale_price: saleP,
            is_active: productForm.is_active
          })
          .eq('id', editingProduct.id)

        if (prodErr) throw prodErr

        // Update inventory record if warehouse is present
        if (warehouseId) {
          const invRecord = editingProduct.inventory?.[0]
          if (invRecord?.id) {
            await supabase.from('inventory').update({ quantity: stockQty, avg_cost: costP }).eq('id', invRecord.id)
          } else {
            await supabase.from('inventory').insert([{ tenant_id: tenantId, product_id: editingProduct.id, warehouse_id: warehouseId, quantity: stockQty, avg_cost: costP }])
          }
        }

        setShowEditModal(false)
        await loadProducts()
      }
    } catch (err: any) {
      alert('Error al guardar producto: ' + err.message)
    } finally {
      setSavingProduct(false)
    }
  }

  // Delete Product
  async function handleDeleteProduct(p: DBProduct) {
    if (!confirm(`¿Eliminar definitivamente "${p.name}"?`)) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', p.id)
      if (error) throw error
      setProducts(prev => prev.filter(item => item.id !== p.id))
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  // Quick Stock Adjustment
  function handleOpenQuickStock(p: DBProduct) {
    setStockProduct(p)
    setStockDelta('1')
    setStockActionType('add')
    setShowQuickStockModal(true)
  }

  async function handleApplyQuickStock(e: React.FormEvent) {
    e.preventDefault()
    if (!stockProduct || !tenantId || !warehouseId || savingStock) return
    setSavingStock(true)

    try {
      const current = getStock(stockProduct)
      const delta = parseFloat(stockDelta) || 0
      let newQty = current

      if (stockActionType === 'add') newQty = current + delta
      else if (stockActionType === 'remove') newQty = Math.max(0, current - delta)
      else if (stockActionType === 'set') newQty = delta

      const invRecord = stockProduct.inventory?.[0]
      if (invRecord?.id) {
        const { error } = await supabase.from('inventory').update({ quantity: newQty }).eq('id', invRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventory').insert([{
          tenant_id: tenantId,
          product_id: stockProduct.id,
          warehouse_id: warehouseId,
          quantity: newQty,
          avg_cost: stockProduct.cost_price || 0
        }])
        if (error) throw error
      }

      setShowQuickStockModal(false)
      await loadProducts()
    } catch (err: any) {
      alert('Error al actualizar stock: ' + err.message)
    } finally {
      setSavingStock(false)
    }
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
            sale_price: row.sale_price,
            cost_price: row.cost_price,
            product_type: 'single',
            is_active: true
          }])
          .select('id')
          .single()

        if (pErr) continue

        if (warehouseId && newP) {
          await supabase.from('inventory').insert([{
            tenant_id: tenantId,
            product_id: newP.id,
            warehouse_id: warehouseId,
            quantity: row.stock,
            avg_cost: row.cost_price
          }])
        }
      }

      setImportSuccess(`¡${parsedRows.length} productos importados correctamente!`)
      setTimeout(() => {
        setShowImportModal(false)
        loadProducts()
      }, 1200)
    } catch (err: any) {
      alert('Error en importación: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Cargando catálogo...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Catálogo de Productos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2, margin: 0 }}>{products.length} productos registrados</p>
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
              style={{ padding: '6px 12px', fontSize: '0.75rem', background: selectedCategory === c ? 'var(--accent-blue)' : 'var(--bg)', color: selectedCategory === c ? '#fff' : 'var(--text-secondary)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products Interactive List with Actions */}
      <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(product => {
          const stock = getStock(product)
          const margin = product.sale_price > 0 ? ((product.sale_price - product.cost_price) / product.sale_price * 100).toFixed(1) : '0'
          const catName = product.categories?.name || 'General'

          return (
            <div
              key={product.id}
              className="neu-flat"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                transition: 'background 0.15s ease'
              }}
            >
              {/* Product Info (Clickable) */}
              <div
                onClick={() => handleOpenEdit(product)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1, cursor: 'pointer' }}
                title="Haz clic para editar este producto"
              >
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

              {/* Price, Margin & Stock */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatCurrency(product.sale_price)}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)' }}>Margen {margin}%</div>
                </div>

                <div style={{ textAlign: 'right', minWidth: 55 }}>
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

                {/* Explicit Action Buttons */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderLeft: '1px solid var(--border-color)', paddingLeft: 10 }}>
                  <button
                    onClick={() => handleOpenQuickStock(product)}
                    className="btn-neu btn-ghost"
                    style={{ padding: '6px 8px', fontSize: '0.72rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Ajustar stock rápido"
                  >
                    <Boxes size={14} />
                    <span>Stock</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(product)}
                    className="btn-neu btn-ghost"
                    style={{ padding: '6px 8px', fontSize: '0.72rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Editar producto"
                  >
                    <Edit2 size={14} />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(product)}
                    className="btn-neu btn-ghost"
                    style={{ padding: '6px 8px', fontSize: '0.72rem', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Eliminar producto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <Package size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '0.85rem' }}>No se encontraron productos en el catálogo</div>
          </div>
        )}
      </div>

      {/* ── MODAL: EDIT PRODUCT ── */}
      {showEditModal && editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 520, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Editar Producto
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre del Producto *</label>
                <input
                  type="text"
                  className="input-neu"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Código SKU / Barras</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={productForm.sku}
                    onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="770123..."
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Categoría</label>
                  <select
                    className="input-neu"
                    value={productForm.category_id}
                    onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-deep)', cursor: 'pointer' }}
                  >
                    <option value="">General</option>
                    {categoryList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Costo Compra ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={productForm.cost_price}
                    onChange={e => setProductForm({ ...productForm, cost_price: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Venta ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={productForm.sale_price}
                    onChange={e => setProductForm({ ...productForm, sale_price: e.target.value })}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Stock Actual (Uds)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={productForm.stock}
                    onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="prod_active"
                  checked={productForm.is_active}
                  onChange={e => setProductForm({ ...productForm, is_active: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="prod_active" style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Producto activo para venta en POS
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingProduct} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={15} strokeWidth={2.5} />
                  <span>{savingProduct ? 'Guardando...' : 'Actualizar Producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: QUICK STOCK ADJUSTMENT ── */}
      {showQuickStockModal && stockProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Boxes size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Ajustar Stock
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowQuickStockModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Producto: <strong>{stockProduct.name}</strong> (Stock actual: <strong>{getStock(stockProduct)} uds</strong>)
            </p>

            <form onSubmit={handleApplyQuickStock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tipo de Operación</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { id: 'add', label: '+ Añadir' },
                    { id: 'remove', label: '- Restar / Merma' },
                    { id: 'set', label: '= Fijar Exacto' }
                  ].map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setStockActionType(op.id as any)}
                      className={`btn-neu ${stockActionType === op.id ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cantidad de Unidades</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-neu"
                  value={stockDelta}
                  onChange={e => setStockDelta(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowQuickStockModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingStock} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
                  {savingStock ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPORT EXCEL / CSV ── */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 540, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Importación Masiva de Productos
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowImportModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Carga tu catálogo completo desde un archivo CSV o Excel exportado. Descarga la plantilla estándar para asegurar las columnas correctas:
            </p>

            <button onClick={downloadCsvTemplate} className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6, margin: '8px 0 14px' }}>
              <Download size={14} />
              <span>Descargar Plantilla CSV</span>
            </button>

            <input type="file" accept=".csv" onChange={handleCsvFile} style={{ display: 'block', marginBottom: 12, fontSize: '0.8rem' }} />

            {parsedRows.length > 0 && (
              <div className="neu-flat" style={{ padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem', marginBottom: 14 }}>
                <strong>{parsedRows.length} productos detectados listos para importar.</strong>
              </div>
            )}

            {importSuccess && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.8rem', marginBottom: 14 }}>
                {importSuccess}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-neu btn-ghost" onClick={() => setShowImportModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                Cerrar
              </button>
              {parsedRows.length > 0 && (
                <button className="btn-neu btn-primary" onClick={executeBulkImport} disabled={importing} style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
                  {importing ? 'Importando...' : 'Iniciar Importación'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRINT TAGS ── */}
      {showTagsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 500, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Impresión de Etiquetas de Gondola
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowTagsModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Se generará una hoja lista para imprimir con el nombre, código de barras y precio de venta de los {filtered.length} productos filtrados.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn-neu btn-ghost" onClick={() => setShowTagsModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                Cancelar
              </button>
              <button className="btn-neu btn-primary" onClick={() => window.print()} style={{ padding: '8px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={14} />
                <span>Imprimir Etiquetas</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
