'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CameraScanner from '@/components/CameraScanner'
import { findMasterProduct } from '@/lib/catalog/colombia-products'
import { Building2 } from 'lucide-react'

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
    categoryId: '',
    warehouseId: '',
    description: '',
    initialStock: '0'
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foundBadge, setFoundBadge] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [tenantInfo, setTenantInfo] = useState<{ tenant_id: string; warehouse_id: string } | null>(null)

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tenant_id = user.user_metadata?.tenant_id

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

      // Auto-create default branch & warehouse if they don't exist (self-healing)
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
          console.error('Error auto-creating default configuration:', e)
        }
      }

      // Auto-create category 'General' if none exist
      if (!catData || catData.length === 0) {
        try {
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({ tenant_id, name: 'General', slug: 'general' })
            .select('id, name')
            .single()
          
          if (!catErr && newCat) {
            setCategories([newCat])
            initialCategoryId = newCat.id
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
      setFoundBadge(`✨ Autocompletado desde Catálogo Colombiano: "${master.name}"`)
      setForm(f => ({
        ...f,
        name: master.name,
        cost: master.suggestedCost.toString(),
        price: master.suggestedPrice.toString()
      }))

      // Auto-match or create category
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
          sale_price: Number(form.price),
          cost_price: Number(form.cost),
          category_id: form.categoryId || null,
          description: form.description || null,
          product_type: 'product',
          track_inventory: true
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr

      // Record initial inventory in selected warehouse if stock > 0
      const stockQty = Number(form.initialStock)
      if (stockQty > 0 && targetWarehouseId && newProd) {
        const { error: invErr } = await supabase
          .from('inventory')
          .insert({
            tenant_id: tenantInfo.tenant_id,
            warehouse_id: targetWarehouseId,
            product_id: newProd.id,
            quantity: stockQty,
            avg_cost: Number(form.cost)
          })
        if (invErr) throw invErr

        // Record stock movement (Kardex)
        await supabase
          .from('stock_movements')
          .insert({
            tenant_id: tenantInfo.tenant_id,
            warehouse_id: targetWarehouseId,
            product_id: newProd.id,
            movement_type: 'initial',
            quantity: stockQty,
            unit_cost: Number(form.cost),
            total_cost: stockQty * Number(form.cost),
            balance_after: stockQty
          })
      }

      setSaved(true)
      setTimeout(() => router.push('/products'), 1000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al guardar el producto')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <button className="btn-neu btn-ghost" onClick={() => router.back()} style={{ padding: '8px 14px', fontSize: '0.85rem', marginBottom: 14 }}>← Volver</button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Nuevo Producto</h1>
      </div>

      <form onSubmit={handleSave} className="neu-card" style={{ padding: '28px' }}>
        
        {/* Found badge notification */}
        {foundBadge && (
          <div style={{ marginBottom: 18, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            {foundBadge}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          
          {/* SKU / Barcode with Camera Scanner Button */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Código de Barras / SKU (Escanea o digita)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-neu"
                placeholder="Ej: 7702001001018"
                value={form.sku}
                onChange={e => handleCodeLookup(e.target.value)}
                style={{ flex: 1, fontWeight: 700 }}
              />
              <button
                type="button"
                className="btn-neu btn-primary"
                onClick={() => setShowScanner(true)}
                style={{ padding: '10px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                📷 Escanear con cámara
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
              💡 Al escanear productos colombianos conocidos (Chocolatina Jet, Poker, Coca-Cola, etc.) los datos se autocompletarán.
            </div>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Nombre del producto *</label>
            <input className="input-neu" placeholder="Ej: Coca-Cola 2L" value={form.name} onChange={e => set('name')(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Categoría</label>
            <select className="input-neu" value={form.categoryId} onChange={e => set('categoryId')(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              {categories.length === 0 && <option value="">Sin categorías</option>}
            </select>
          </div>

          {/* Mandatory Warehouse Selection */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Bodega de Almacenamiento *
            </label>
            <select
              className="input-neu"
              value={form.warehouseId}
              onChange={e => set('warehouseId')(e.target.value)}
              required
              style={{ fontWeight: 700 }}
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  📦 {w.name} {w.is_main ? '(Principal)' : ''}
                </option>
              ))}
              {warehouses.length === 0 && <option value="">Cargando bodegas...</option>}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Precio de venta *</label>
            <input className="input-neu" type="number" step="100" placeholder="0" value={form.price} onChange={e => set('price')(e.target.value)} required style={{ fontWeight: 700 }} />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Costo de compra *</label>
            <input className="input-neu" type="number" step="100" placeholder="0" value={form.cost} onChange={e => set('cost')(e.target.value)} required />
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Inventario inicial (Unidades en la bodega seleccionada)
            </label>
            <input className="input-neu" type="number" placeholder="0" value={form.initialStock} onChange={e => set('initialStock')(e.target.value)} />
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Descripción (Opcional)</label>
            <input className="input-neu" placeholder="Descripción opcional" value={form.description} onChange={e => set('description')(e.target.value)} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-neu" onClick={() => router.back()}>Cancelar</button>
          <button type="submit" className="btn-neu btn-primary" disabled={loading} style={{ padding: '12px 28px' }}>
            {saved ? '✓ Guardado' : loading ? '⏳ Guardando...' : '💾 Guardar producto'}
          </button>
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
