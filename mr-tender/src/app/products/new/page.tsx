'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CameraScanner from '@/components/CameraScanner'
import { findMasterProduct } from '@/lib/catalog/colombia-products'
import { Building2, Upload, Image as ImageIcon, X, ArrowLeft, Camera, Sparkles, Check, DollarSign, Package, Tag, Layers } from 'lucide-react'
import { uploadProductImage } from '@/lib/image-upload'

interface Category {
  id: string
  name: string
}

interface Warehouse {
  id: string
  name: string
  is_main: boolean
}

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    wholesale_price: '',
    wholesale_min_qty: '',
    categoryId: '',
    warehouseId: '',
    description: '',
    initialStock: '0',
    minStock: '5',
    imageUrl: ''
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [foundBadge, setFoundBadge] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [tenantInfo, setTenantInfo] = useState<{ tenant_id: string; warehouse_id: string } | null>(null)

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tenant_id = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id

      // Load categories
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('tenant_id', tenant_id)
      
      let initialCategoryId = ''
      if (catData && catData.length > 0) {
        setCategories(catData)
        initialCategoryId = catData[0].id
        setForm(f => ({ ...f, categoryId: catData[0].id }))
      }

      // Load all warehouses
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, name, is_main')
        .eq('tenant_id', tenant_id)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true })
      
      let warehouse_id = ''
      if (whData && whData.length > 0) {
        setWarehouses(whData)
        const mainWh = whData.find(w => w.is_main) || whData[0]
        warehouse_id = mainWh.id
        setForm(f => ({ ...f, warehouseId: mainWh.id }))
      }

      // Auto-create default branch & warehouse if they don't exist
      if (!warehouse_id) {
        try {
          let { data: brs } = await supabase
            .from('branches')
            .select('id')
            .eq('tenant_id', tenant_id)
            .limit(1)
          
          let branch_id = brs?.[0]?.id || null
          if (!branch_id) {
            const { data: newBr, error: brErr } = await supabase
              .from('branches')
              .insert({ tenant_id, name: 'Sucursal Principal', is_main: true })
              .select('id')
              .single()
            if (!brErr && newBr) {
              branch_id = newBr.id
            }
          }

          if (branch_id) {
            const { data: newWh, error: whErr } = await supabase
              .from('warehouses')
              .insert({
                tenant_id,
                branch_id,
                name: 'Almacén Principal',
                code: 'ALM-001',
                is_main: true
              })
              .select('id, name, is_main')
              .single()
            if (!whErr && newWh) {
              warehouse_id = newWh.id
              setWarehouses([newWh])
              setForm(f => ({ ...f, warehouseId: newWh.id }))
            }
          }
        } catch (e) {
          console.error('Error auto-creating default warehouse:', e)
        }
      }

      // If no categories exist, create General category
      if (!initialCategoryId) {
        try {
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({ tenant_id, name: 'General', slug: 'general' })
            .select('id, name')
            .single()
          if (!catErr && newCat) {
            setCategories([newCat])
            setForm(f => ({ ...f, categoryId: newCat.id }))
          }
        } catch (e) {
          console.error('Error auto-creating default category:', e)
        }
      }

      setTenantInfo({ tenant_id, warehouse_id })
    }
    loadConfig()
  }, [])

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  // Lookup in Colombia Master Catalog
  async function handleCodeLookup(code: string) {
    const cleanCode = code.trim()
    setForm(f => ({ ...f, sku: cleanCode }))
    if (!cleanCode) return

    const master = findMasterProduct(cleanCode)
    if (master) {
      setFoundBadge(` Autocompletado: "${master.name}"`)
      setForm(f => ({
        ...f,
        name: master.name,
        cost: master.suggestedCost.toString(),
        price: master.suggestedPrice.toString(),
        wholesale_price: master.wholesalePrice ? master.wholesalePrice.toString() : f.wholesale_price,
        wholesale_min_qty: master.wholesaleMinQty ? master.wholesaleMinQty.toString() : f.wholesale_min_qty
      }))

      if (tenantInfo?.tenant_id) {
        const existingCat = categories.find(c => c.name.toLowerCase() === master.category.toLowerCase())
        if (existingCat) {
          setForm(f => ({ ...f, categoryId: existingCat.id }))
        } else {
          try {
            const slug = master.category.toLowerCase().replace(/[^a-z0-9]/g, '-')
            const { data: newCat } = await supabase
              .from('categories')
              .insert({ tenant_id: tenantInfo.tenant_id, name: master.category, slug })
              .select('id, name')
              .single()
            if (newCat) {
              setCategories(prev => [...prev, newCat])
              setForm(f => ({ ...f, categoryId: newCat.id }))
            }
          } catch (e) {
            console.error('Error auto-creating category:', e)
          }
        }
      }
    } else {
      setFoundBadge('')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantInfo) return
    const targetWarehouseId = form.warehouseId || tenantInfo.warehouse_id
    if (!targetWarehouseId) {
      setError('Debes seleccionar la bodega donde se guardará el producto.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: newProd, error: insertErr } = await supabase
        .from('products')
        .insert({
          tenant_id: tenantInfo.tenant_id,
          name: form.name,
          sku: form.sku || null,
          sale_price: Number(form.price) || 0,
          cost_price: Number(form.cost) || 0,
          purchase_price: Number(form.cost) || 0,
          wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
          wholesale_min_qty: form.wholesale_min_qty ? Number(form.wholesale_min_qty) : null,
          category_id: form.categoryId || null,
          description: form.description || null,
          image_url: form.imageUrl || null,
          min_stock: Number(form.minStock) || 0,
          product_type: 'product',
          track_inventory: true
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr

      // Record initial inventory in selected warehouse if stock > 0
      const stockQty = Number(form.initialStock)
      if (targetWarehouseId && newProd) {
        const { error: invErr } = await supabase
          .from('inventory')
          .insert({
            tenant_id: tenantInfo.tenant_id,
            warehouse_id: targetWarehouseId,
            product_id: newProd.id,
            quantity: stockQty > 0 ? stockQty : 0,
            avg_cost: Number(form.cost) || 0
          })
        if (invErr) throw invErr

        // Record stock movement (Kardex)
        if (stockQty > 0) {
          await supabase
            .from('stock_movements')
            .insert({
              tenant_id: tenantInfo.tenant_id,
              warehouse_id: targetWarehouseId,
              product_id: newProd.id,
              movement_type: 'initial_stock',
              quantity: stockQty,
              unit_cost: Number(form.cost) || 0,
              total_cost: stockQty * (Number(form.cost) || 0),
              balance_after: stockQty,
              notes: 'Ingreso inicial al crear producto'
            })
        }
      }

      setSaved(true)
      setTimeout(() => router.push('/products'), 800)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al guardar el producto')
      setLoading(false)
    }
  }

  // Margin calculation
  const saleNum = parseFloat(form.price) || 0
  const costNum = parseFloat(form.cost) || 0
  const profit = saleNum - costNum
  const marginPercent = saleNum > 0 ? ((profit / saleNum) * 100).toFixed(1) : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 1280, margin: '0 auto' }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', marginBottom: 2 }}>
            <Link href="/products" style={{ color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={14} />
              <span>Volver a Productos</span>
            </Link>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            Registrar Nuevo Producto
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-neu"
            onClick={() => router.back()}
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => {
              const formEl = document.getElementById('new-product-form') as HTMLFormElement
              if (formEl) formEl.requestSubmit()
            }}
            disabled={loading}
            className="btn-neu btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saved ? ' Guardado' : loading ? 'Guardando...' : ' Guardar Producto'}
          </button>
        </div>
      </div>

      {/* Found badge notification */}
      {foundBadge && (
        <div style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} />
          <span>{foundBadge}</span>
        </div>
      )}

      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700 }}>
           {error}
        </div>
      )}

      {/* Wide 2-Column Responsive Layout */}
      <form id="new-product-form" onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Datos Generales, Código e Imagen */}
        <div className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
            <Tag size={16} color="#00B19D" />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Información del Producto
            </h2>
          </div>

          {/* Nombre del Producto */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nombre del Producto *
            </label>
            <input
              className="input-neu"
              placeholder="Ej: Pan Francés Tradicional, Croissant, Coca-Cola 2L..."
              value={form.name}
              onChange={e => set('name')(e.target.value)}
              required
              style={{ fontSize: '0.88rem', fontWeight: 700 }}
            />
          </div>

          {/* SKU / Código de barras & Botón Cámara */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Código de Barras / SKU (Escanea o digita)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-neu"
                placeholder="Ej: 7702001001018"
                value={form.sku}
                onChange={e => handleCodeLookup(e.target.value)}
                style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}
              />
              <button
                type="button"
                className="btn-neu"
                onClick={() => setShowScanner(true)}
                style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, color: '#008F7E', background: '#E6F7F5', border: '1px solid #99F6E4' }}
              >
                <Camera size={14} />
                <span>Escanear</span>
              </button>
            </div>
          </div>

          {/* Categoría & Descripción */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Categoría
              </label>
              <select
                className="input-neu"
                value={form.categoryId}
                onChange={e => set('categoryId')(e.target.value)}
                style={{ fontSize: '0.84rem', background: '#FFFFFF' }}
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {categories.length === 0 && <option value="">Sin categorías</option>}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Descripción (Opcional)
              </label>
              <input
                className="input-neu"
                placeholder="Detalle o características del producto..."
                value={form.description}
                onChange={e => set('description')(e.target.value)}
                style={{ fontSize: '0.84rem' }}
              />
            </div>
          </div>

          {/* Foto / Imagen del Producto */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Foto del Producto (Opcional)
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                {form.imageUrl ? (
                  <>
                    <img src={form.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={24} style={{ opacity: 0.35, color: '#64748B' }} />
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  className="btn-neu"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    alignSelf: 'flex-start',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1'
                  }}
                >
                  <Upload size={13} style={{ color: '#00B19D' }} />
                  <span>{uploadingImage ? 'Subiendo...' : 'Subir imagen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setUploadingImage(true)
                        try {
                          const url = await uploadProductImage(file, tenantInfo?.tenant_id || '', supabase)
                          setForm(f => ({ ...f, imageUrl: url }))
                        } catch (err) {
                          console.error(err)
                        } finally {
                          setUploadingImage(false)
                        }
                      }
                    }}
                  />
                </label>
                <input
                  className="input-neu"
                  placeholder="O pega URL de imagen (https://...)"
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  style={{ fontSize: '0.76rem', height: 30 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Precios, Costos, Margen & Existencias */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Card: Precios & Rentabilidad */}
          <div className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={16} color="#059669" />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Precios & Rentabilidad
                </h2>
              </div>
              {saleNum > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: profit >= 0 ? '#ECFDF5' : '#FEE2E2',
                  color: profit >= 0 ? '#059669' : '#DC2626',
                  border: profit >= 0 ? '1px solid #A7F3D0' : '1px solid #FECACA'
                }}>
                  Margen: {marginPercent}% (${profit > 0 ? profit.toLocaleString('es-CO') : 0})
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Precio de Venta al Público *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="100"
                  min="0"
                  placeholder="0"
                  value={form.price}
                  onChange={e => set('price')(e.target.value)}
                  required
                  style={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Costo de Compra / Producción *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="100"
                  min="0"
                  placeholder="0"
                  value={form.cost}
                  onChange={e => set('cost')(e.target.value)}
                  required
                  style={{ fontWeight: 800, fontSize: '0.95rem', color: '#008F7E' }}
                />
              </div>
            </div>

            {/* Precios por Mayor Opcionales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Precio por Mayor (Opcional)
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="100"
                  placeholder="Ej: 2500"
                  value={form.wholesale_price}
                  onChange={e => set('wholesale_price')(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Cant. Mínima Mayoreo
                </label>
                <input
                  className="input-neu"
                  type="number"
                  placeholder="Ej: 6"
                  value={form.wholesale_min_qty}
                  onChange={e => set('wholesale_min_qty')(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Card: Inventario & Bodega */}
          <div className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
              <Package size={16} color="#714AD9" />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Control de Stock & Almacenamiento
              </h2>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Bodega de Almacenamiento *
              </label>
              <select
                className="input-neu"
                value={form.warehouseId}
                onChange={e => set('warehouseId')(e.target.value)}
                required
                style={{ fontWeight: 700, fontSize: '0.85rem', background: '#FFFFFF' }}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.is_main ? '(Principal)' : ''}
                  </option>
                ))}
                {warehouses.length === 0 && <option value="">Cargando bodegas...</option>}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Stock Inicial (Unidades)
                </label>
                <input
                  className="input-neu"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.initialStock}
                  onChange={e => set('initialStock')(e.target.value)}
                  style={{ fontWeight: 800, fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Alerta de Stock Mínimo
                </label>
                <input
                  className="input-neu"
                  type="number"
                  min="0"
                  placeholder="5"
                  value={form.minStock}
                  onChange={e => set('minStock')(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          continuous={false}
          onScan={(code) => handleCodeLookup(code)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
