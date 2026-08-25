'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Footprints,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MessageSquare,
  Clock,
  DollarSign,
  Package,
  Layers,
  TrendingUp,
  Percent,
  Check,
  X,
  FileText,
  ShieldCheck,
  QrCode,
  Tag,
  ShoppingBag,
  Sparkle,
  Grid,
  Filter,
  Eye
} from 'lucide-react'

interface ApparelProduct {
  id: string
  tenant_id: string
  sku_master: string
  name: string
  brand: string
  category: string
  gender: string
  season: string
  base_cost: number
  base_price: number
  has_variants: boolean
  created_at: string
  variants?: ApparelVariant[]
}

interface ApparelVariant {
  id: string
  product_id: string
  tenant_id: string
  sku_variant: string
  barcode?: string | null
  size: string
  color_name: string
  color_hex?: string | null
  stock: number
  price_override?: number | null
  created_at: string
}

interface ApparelFittingRoom {
  id: string
  tenant_id: string
  room_number: string
  customer_name?: string | null
  pieces_in_room: number
  assigned_advisor?: string | null
  status: 'available' | 'occupied' | 'cleaning'
  occupied_since?: string | null
  created_at: string
}

interface ApparelLookbook {
  id: string
  tenant_id: string
  title: string
  description?: string | null
  discount_percent: number
  items_json: {
    item_name: string
    price: number
  }[]
  total_price: number
  is_active: boolean
  created_at: string
}

export default function ApparelPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'matrix' | 'fitting' | 'outfits' | 'clearance'>('matrix')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [products, setProducts] = useState<ApparelProduct[]>([])
  const [fittingRooms, setFittingRooms] = useState<ApparelFittingRoom[]>([])
  const [lookbooks, setLookbooks] = useState<ApparelLookbook[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterGender, setFilterGender] = useState('all')

  // Modals
  const [showProductModal, setShowProductModal] = useState(false)
  const [showFittingModal, setShowFittingModal] = useState<ApparelFittingRoom | null>(null)
  const [showLookbookModal, setShowLookbookModal] = useState(false)
  const [selectedProductDetails, setSelectedProductDetails] = useState<ApparelProduct | null>(null)

  // Forms
  const [productForm, setProductForm] = useState({
    sku_master: 'MODA-JEAN-001',
    name: 'Jean Mom Fit Clásico Tiro Alto',
    brand: 'Studio F / Denim Co.',
    category: 'Pantalones & Jeans',
    gender: 'Dama',
    season: 'Colección Verano 2026',
    base_cost: 45000,
    base_price: 110000,
    selectedSizes: ['6', '8', '10', '12'],
    selectedColors: [
      { name: 'Azul Índigo', hex: '#1E3A8A' },
      { name: 'Negro Profundo', hex: '#111827' },
      { name: 'Blanco Hueso', hex: '#F3F4F6' }
    ],
    initialStockPerVariant: 3
  })

  const [fittingForm, setFittingForm] = useState({
    customer_name: '',
    pieces_in_room: 3,
    assigned_advisor: 'Valentina (Asesora Piso)'
  })

  const [lookbookForm, setLookbookForm] = useState({
    title: 'Outfit Noche Casual Urbano',
    description: 'Jean Mom Fit + Blusa Satinada + Tenis Cuero Blanco',
    discount_percent: 15,
    items: [
      { item_name: 'Jean Mom Fit Tiro Alto', price: 110000 },
      { item_name: 'Blusa Satinada Manga Larga', price: 75000 },
      { item_name: 'Tenis Cuero Blanco Casual', price: 130000 }
    ]
  })

  useEffect(() => {
    loadApparelData()
  }, [])

  async function loadApparelData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [prodsRes, varsRes, roomsRes, looksRes] = await Promise.all([
        supabase.from('apparel_products').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('apparel_variants').select('*').eq('tenant_id', tid).order('size', { ascending: true }),
        supabase.from('apparel_fitting_rooms').select('*').eq('tenant_id', tid).order('room_number', { ascending: true }),
        supabase.from('apparel_lookbooks').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
      ])

      const allVars = varsRes.data || []
      const prodsWithVars: ApparelProduct[] = (prodsRes.data || []).map((p: any) => ({
        ...p,
        variants: allVars.filter((v: any) => v.product_id === p.id)
      }))

      setProducts(prodsWithVars)
      setFittingRooms(roomsRes.data || [])
      setLookbooks(looksRes.data || [])
    } catch (err) {
      console.error('Error loading apparel data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Product with Generated Matrix of Size x Color Variants
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!productForm.name.trim()) return alert('Ingresa el nombre del producto')

    setSubmitting(true)
    try {
      // 1. Create Master Product
      const payloadProd = {
        tenant_id: tenantId,
        sku_master: productForm.sku_master.trim().toUpperCase(),
        name: productForm.name.trim(),
        brand: productForm.brand.trim() || 'Genérica',
        category: productForm.category,
        gender: productForm.gender,
        season: productForm.season.trim(),
        base_cost: Number(productForm.base_cost),
        base_price: Number(productForm.base_price),
        has_variants: true
      }

      const { data: createdProd, error: pErr } = await supabase.from('apparel_products').insert(payloadProd).select().single()
      if (pErr) throw pErr

      // 2. Generate all Size x Color combinations in apparel_variants
      const variantsToInsert: any[] = []
      productForm.selectedColors.forEach(color => {
        productForm.selectedSizes.forEach(size => {
          const skuVar = `${createdProd.sku_master}-${color.name.slice(0, 3).toUpperCase()}-${size}`
          const barcode = `770${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`
          variantsToInsert.push({
            product_id: createdProd.id,
            tenant_id: tenantId,
            sku_variant: skuVar,
            barcode: barcode,
            size: size,
            color_name: color.name,
            color_hex: color.hex,
            stock: Number(productForm.initialStockPerVariant) || 0
          })
        })
      })

      if (variantsToInsert.length > 0) {
        const { error: vErr } = await supabase.from('apparel_variants').insert(variantsToInsert)
        if (vErr) throw vErr
      }

      setShowProductModal(false)
      await loadApparelData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar prenda y variantes')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick Stock Adjust for a Variant (+1 / -1)
  async function handleAdjustVariantStock(variantId: string, delta: number) {
    try {
      const targetVar = products.flatMap(p => p.variants || []).find(v => v.id === variantId)
      if (!targetVar) return
      const nextStock = Math.max(0, targetVar.stock + delta)

      const { error } = await supabase.from('apparel_variants').update({ stock: nextStock }).eq('id', variantId)
      if (error) throw error
      await loadApparelData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Occupy Fitting Room
  async function handleOccupyFittingRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!showFittingModal || !tenantId || submitting) return

    setSubmitting(true)
    try {
      const payload = {
        customer_name: fittingForm.customer_name.trim() || 'Cliente en Tienda',
        pieces_in_room: Number(fittingForm.pieces_in_room) || 1,
        assigned_advisor: fittingForm.assigned_advisor.trim() || null,
        status: 'occupied',
        occupied_since: new Date().toISOString()
      }

      const { error } = await supabase.from('apparel_fitting_rooms').update(payload).eq('id', showFittingModal.id)
      if (error) throw error

      setShowFittingModal(null)
      await loadApparelData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Release Fitting Room
  async function handleReleaseFittingRoom(roomId: string) {
    try {
      const { error } = await supabase.from('apparel_fitting_rooms').update({
        status: 'available',
        customer_name: null,
        pieces_in_room: 0,
        occupied_since: null
      }).eq('id', roomId)
      if (error) throw error
      await loadApparelData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Lookbook / Outfit
  async function handleCreateLookbook(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!lookbookForm.title.trim()) return alert('Ingresa el título del outfit')

    setSubmitting(true)
    try {
      const subtotal = lookbookForm.items.reduce((acc, it) => acc + Number(it.price), 0)
      const discount = (subtotal * Number(lookbookForm.discount_percent)) / 100
      const finalPrice = subtotal - discount

      const payload = {
        tenant_id: tenantId,
        title: lookbookForm.title.trim(),
        description: lookbookForm.description.trim() || null,
        discount_percent: Number(lookbookForm.discount_percent),
        items_json: lookbookForm.items,
        total_price: finalPrice,
        is_active: true
      }

      const { error } = await supabase.from('apparel_lookbooks').insert(payload)
      if (error) throw error

      setShowLookbookModal(false)
      await loadApparelData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar outfit')
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Lookbook Link
  function getWhatsAppLookbookUrl(look: ApparelLookbook) {
    const itemsList = look.items_json.map(it => `• ${it.item_name} (${formatCurrency(it.price)})`).join('\n')
    const msg = encodeURIComponent(
      `¡Hola! ✨ Te compartimos este Lookbook exclusivo de nuestra Boutique:\n\n👗 *${look.title}*\n${look.description || ''}\n\n*Prendas del Conjunto:*\n${itemsList}\n\n🏷️ *Precio Especial Outfit Completo (${look.discount_percent}% OFF): ${formatCurrency(Number(look.total_price))}*\n\n¡Visítanos en tienda o pídelo con envío a domicilio!`
    )
    return `https://wa.me/?text=${msg}`
  }

  // Seed Demo Data for Apparel
  async function handleSeedApparelDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Master Products
      const demoProducts = [
        {
          tenant_id: tenantId,
          sku_master: 'MODA-JEAN-001',
          name: 'Jean Mom Fit Clásico Tiro Alto',
          brand: 'Studio F / Denim Co.',
          category: 'Pantalones & Jeans',
          gender: 'Dama',
          season: 'Colección Verano 2026',
          base_cost: 48000,
          base_price: 115000,
          has_variants: true
        },
        {
          tenant_id: tenantId,
          sku_master: 'MODA-BLUS-002',
          name: 'Blusa Satinada Elegante Manga Larga',
          brand: 'Zara / Boutique',
          category: 'Camisas & Blusas',
          gender: 'Dama',
          season: 'Colección Verano 2026',
          base_cost: 32000,
          base_price: 78000,
          has_variants: true
        },
        {
          tenant_id: tenantId,
          sku_master: 'MODA-CALZ-003',
          name: 'Tenis Cuero Blanco Casual Streetwear',
          brand: 'Nike / StreetStyle',
          category: 'Calzado & Zapatos',
          gender: 'Unisex',
          season: 'Permanente / Básico',
          base_cost: 65000,
          base_price: 145000,
          has_variants: true
        }
      ]
      const { data: createdProds } = await supabase.from('apparel_products').insert(demoProducts).select()

      const p1 = createdProds?.[0]
      const p2 = createdProds?.[1]
      const p3 = createdProds?.[2]

      // 2. Variants for Product 1 (Jeans)
      if (p1) {
        const jeanVariants = [
          { product_id: p1.id, tenant_id: tenantId, sku_variant: 'MODA-JEAN-001-AZU-06', barcode: '77012345006', size: '6', color_name: 'Azul Índigo', color_hex: '#1E3A8A', stock: 4 },
          { product_id: p1.id, tenant_id: tenantId, sku_variant: 'MODA-JEAN-001-AZU-08', barcode: '77012345008', size: '8', color_name: 'Azul Índigo', color_hex: '#1E3A8A', stock: 6 },
          { product_id: p1.id, tenant_id: tenantId, sku_variant: 'MODA-JEAN-001-AZU-10', barcode: '77012345010', size: '10', color_name: 'Azul Índigo', color_hex: '#1E3A8A', stock: 5 },
          { product_id: p1.id, tenant_id: tenantId, sku_variant: 'MODA-JEAN-001-NEG-08', barcode: '77012345108', size: '8', color_name: 'Negro Profundo', color_hex: '#111827', stock: 3 },
          { product_id: p1.id, tenant_id: tenantId, sku_variant: 'MODA-JEAN-001-NEG-10', barcode: '77012345110', size: '10', color_name: 'Negro Profundo', color_hex: '#111827', stock: 1 }
        ]
        await supabase.from('apparel_variants').insert(jeanVariants)
      }

      // 3. Variants for Product 2 (Blusas)
      if (p2) {
        const blusaVariants = [
          { product_id: p2.id, tenant_id: tenantId, sku_variant: 'MODA-BLUS-002-BLA-S', barcode: '77023456001', size: 'S', color_name: 'Blanco Hueso', color_hex: '#F3F4F6', stock: 4 },
          { product_id: p2.id, tenant_id: tenantId, sku_variant: 'MODA-BLUS-002-BLA-M', barcode: '77023456002', size: 'M', color_name: 'Blanco Hueso', color_hex: '#F3F4F6', stock: 5 },
          { product_id: p2.id, tenant_id: tenantId, sku_variant: 'MODA-BLUS-002-ROS-M', barcode: '77023456003', size: 'M', color_name: 'Rosa Pastel', color_hex: '#F472B6', stock: 2 }
        ]
        await supabase.from('apparel_variants').insert(blusaVariants)
      }

      // 4. Variants for Product 3 (Calzado)
      if (p3) {
        const shoeVariants = [
          { product_id: p3.id, tenant_id: tenantId, sku_variant: 'MODA-CALZ-003-BLA-37', barcode: '77034567037', size: '37', color_name: 'Blanco Puro', color_hex: '#FFFFFF', stock: 3 },
          { product_id: p3.id, tenant_id: tenantId, sku_variant: 'MODA-CALZ-003-BLA-38', barcode: '77034567038', size: '38', color_name: 'Blanco Puro', color_hex: '#FFFFFF', stock: 4 },
          { product_id: p3.id, tenant_id: tenantId, sku_variant: 'MODA-CALZ-003-BLA-39', barcode: '77034567039', size: '39', color_name: 'Blanco Puro', color_hex: '#FFFFFF', stock: 2 }
        ]
        await supabase.from('apparel_variants').insert(shoeVariants)
      }

      // 5. Fitting Rooms
      const demoRooms = [
        { tenant_id: tenantId, room_number: 'Probador 1', customer_name: 'Camila Montoya', pieces_in_room: 3, assigned_advisor: 'Valentina (Asesora)', status: 'occupied', occupied_since: new Date().toISOString() },
        { tenant_id: tenantId, room_number: 'Probador 2', customer_name: null, pieces_in_room: 0, assigned_advisor: null, status: 'available' },
        { tenant_id: tenantId, room_number: 'Probador 3', customer_name: null, pieces_in_room: 0, assigned_advisor: null, status: 'available' },
        { tenant_id: tenantId, room_number: 'Probador VIP', customer_name: null, pieces_in_room: 0, assigned_advisor: null, status: 'available' }
      ]
      await supabase.from('apparel_fitting_rooms').insert(demoRooms)

      // 6. Lookbooks
      const demoLookbooks = [
        {
          tenant_id: tenantId,
          title: 'Outfit Glamour Casual 2026',
          description: 'Jean Mom Fit Tiro Alto + Blusa Satinada + Tenis Cuero Blanco',
          discount_percent: 15,
          items_json: [
            { item_name: 'Jean Mom Fit Tiro Alto', price: 115000 },
            { item_name: 'Blusa Satinada Elegante', price: 78000 },
            { item_name: 'Tenis Cuero Blanco Streetwear', price: 145000 }
          ],
          total_price: 287300,
          is_active: true
        }
      ]
      await supabase.from('apparel_lookbooks').insert(demoLookbooks)

      await loadApparelData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase()
    const matchQ = p.name.toLowerCase().includes(q) ||
      p.sku_master.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.season.toLowerCase().includes(q)
    const matchC = filterCategory === 'all' || p.category === filterCategory
    const matchG = filterGender === 'all' || p.gender === filterGender
    return matchQ && matchC && matchG
  })

  // KPIs
  const totalVariantsCount = products.flatMap(p => p.variants || []).length
  const totalStockUnits = products.flatMap(p => p.variants || []).reduce((acc, v) => acc + Number(v.stock), 0)
  const occupiedFittingRoomsCount = fittingRooms.filter(r => r.status === 'occupied').length
  const inventoryAssetValue = products.reduce((acc, p) => {
    const prodStock = (p.variants || []).reduce((sum, v) => sum + Number(v.stock), 0)
    return acc + (prodStock * Number(p.base_cost))
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>👗</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Boutique, Ropa & Calzado
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Matriz de tallas y colores, códigos de barras para escáner, control de probadores y lookbooks
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadApparelData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {products.length === 0 && (
            <button onClick={handleSeedApparelDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
              ✨ Cargar Datos Demo de Moda
            </button>
          )}
          {activeTab === 'matrix' && (
            <button onClick={() => setShowProductModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Prenda / Calzado</span>
            </button>
          )}
          {activeTab === 'outfits' && (
            <button onClick={() => setShowLookbookModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Lookbook / Outfit</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Referencias de Moda
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {products.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {totalVariantsCount} variantes (tallas/colores)
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Stock Total Unidades
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {totalStockUnits}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Prendas y pares disponibles
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Probadores en Uso
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {occupiedFittingRoomsCount} / {fittingRooms.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Clientes probándose prendas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Valor de Inventario (Costo)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {formatCurrency(inventoryAssetValue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Activo en bodega y mostrador
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('matrix')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'matrix' ? 800 : 500,
            background: activeTab === 'matrix' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'matrix' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Grid size={15} />
          <span>Matriz de Tallas & Colores ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fitting')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'fitting' ? 800 : 500,
            background: activeTab === 'fitting' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'fitting' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={15} />
          <span>Control de Probadores ({fittingRooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('outfits')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'outfits' ? 800 : 500,
            background: activeTab === 'outfits' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'outfits' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShoppingBag size={15} />
          <span>Lookbooks & Combos de Moda ({lookbooks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('clearance')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'clearance' ? 800 : 500,
            background: activeTab === 'clearance' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'clearance' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Percent size={15} />
          <span>Saldos de Temporada & Últimas Tallas</span>
        </button>
      </div>

      {/* ── TAB 1: MATRIZ DE TALLAS & COLORES ── */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar prenda por nombre, SKU, marca o temporada..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <select
              className="input-neu"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <option value="all">Todas las categorías</option>
              <option value="Pantalones & Jeans">Pantalones & Jeans</option>
              <option value="Camisas & Blusas">Camisas & Blusas</option>
              <option value="Vestidos & Faldas">Vestidos & Faldas</option>
              <option value="Calzado & Zapatos">Calzado & Zapatos</option>
              <option value="Chaquetas & Abrigos">Chaquetas & Abrigos</option>
              <option value="Accesorios">Accesorios</option>
            </select>

            <select
              className="input-neu"
              value={filterGender}
              onChange={e => setFilterGender(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <option value="all">Todos los géneros</option>
              <option value="Dama">Dama</option>
              <option value="Caballero">Caballero</option>
              <option value="Infantil / Niños">Infantil / Niños</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👗</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay prendas o calzado registrado</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Crea tu primera referencia para generar automáticamente la matriz de tallas y colores.
              </p>
              <button onClick={() => setShowProductModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primera prenda
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredProducts.map(prod => {
                const totalProdStock = (prod.variants || []).reduce((acc, v) => acc + Number(v.stock), 0)
                const uniqueSizes = Array.from(new Set((prod.variants || []).map(v => v.size)))
                const uniqueColors = Array.from(new Set((prod.variants || []).map(v => v.color_name)))

                return (
                  <div key={prod.id} className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, borderLeft: '4px solid var(--accent-purple)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {prod.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 4, background: 'var(--bg-deep)', color: 'var(--accent-purple)', fontWeight: 800 }}>
                            {prod.gender} • {prod.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          SKU: <strong style={{ fontFamily: 'monospace' }}>{prod.sku_master}</strong> • Marca: {prod.brand} • {prod.season}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                          {formatCurrency(Number(prod.base_price))}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Stock total: <strong>{totalProdStock} unidades</strong>
                        </div>
                      </div>
                    </div>

                    {/* Matrix Grid (Size x Color) */}
                    <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Matriz de Inventario en Tiempo Real
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                        {(prod.variants || []).map(v => (
                          <div
                            key={v.id}
                            style={{
                              background: 'var(--bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 8,
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color_hex || '#333', border: '1px solid #ccc' }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{v.color_name}</span>
                              </div>
                              <span style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--accent-purple)' }}>
                                Talla {v.size}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                              <span style={{ fontSize: '0.68rem', color: v.stock <= 1 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>
                                {v.stock <= 0 ? 'Sin Stock' : v.stock === 1 ? '¡Última!' : `${v.stock} unids`}
                              </span>

                              {/* Quick stock adjuster */}
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  onClick={() => handleAdjustVariantStock(v.id, -1)}
                                  disabled={v.stock <= 0}
                                  className="btn-neu"
                                  style={{ padding: '2px 6px', fontSize: '0.7rem', height: 20 }}
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleAdjustVariantStock(v.id, 1)}
                                  className="btn-neu btn-primary"
                                  style={{ padding: '2px 6px', fontSize: '0.7rem', height: 20 }}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {v.barcode && (
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'monospace', borderTop: '1px dashed var(--border-color)', paddingTop: 2, marginTop: 2 }}>
                                🏷️ {v.barcode}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CONTROL DE PROBADORES ── */}
      {activeTab === 'fitting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fittingRooms.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🚪</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>No hay probadores configurados</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {fittingRooms.map(room => {
                const isOccupied = room.status === 'occupied'
                const statusColor = isOccupied ? 'var(--accent-coral)' : 'var(--accent-green)'
                const statusText = isOccupied ? '🔴 Ocupado' : '🟢 Libre / Disponible'

                return (
                  <div key={room.id} className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{room.room_number}</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor }}>{statusText}</span>
                    </div>

                    {isOccupied ? (
                      <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                          <strong>{room.customer_name}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Prendas al Vestidor:</span>
                          <strong style={{ color: 'var(--accent-purple)' }}>{room.pieces_in_room} prendas</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Asesora Asignada:</span>
                          <span>{room.assigned_advisor || 'Piso'}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg-deep)', padding: 16, borderRadius: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        ✨ Listo para recibir al siguiente cliente
                      </div>
                    )}

                    {/* Action buttons */}
                    <div>
                      {isOccupied ? (
                        <button
                          onClick={() => handleReleaseFittingRoom(room.id)}
                          className="btn-neu btn-primary"
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.75rem' }}
                        >
                          Liberar Probador (Verificar {room.pieces_in_room} prendas)
                        </button>
                      ) : (
                        <button
                          onClick={() => { setShowFittingModal(room); setFittingForm({ customer_name: '', pieces_in_room: 3, assigned_advisor: 'Valentina' }) }}
                          className="btn-neu"
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-purple)', fontWeight: 800 }}
                        >
                          + Asignar a Cliente
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: LOOKBOOKS & OUTFITS ── */}
      {activeTab === 'outfits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lookbooks.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✨</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay lookbooks creados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Combina prendas para venta cruzada con descuento especial en combo.
              </p>
              <button onClick={() => setShowLookbookModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primer lookbook
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {lookbooks.map(look => {
                const subtotal = look.items_json.reduce((acc, it) => acc + Number(it.price), 0)

                return (
                  <div key={look.id} className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '4px solid var(--accent-purple)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{look.title}</strong>
                        {look.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{look.description}</div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-coral)', fontWeight: 800 }}>
                        {look.discount_percent}% OFF
                      </span>
                    </div>

                    {/* Items in Outfit */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 2 }}>Prendas del Conjunto:</div>
                      {look.items_json.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                          <span>• {it.item_name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(Number(it.price))}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: 4, marginTop: 4 }}>
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatCurrency(subtotal)}</span>
                        <strong style={{ color: 'var(--accent-green)', fontSize: '0.95rem' }}>{formatCurrency(Number(look.total_price))}</strong>
                      </div>
                    </div>

                    {/* WhatsApp share button */}
                    <a
                      href={getWhatsAppLookbookUrl(look)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#16A34A', color: '#fff', fontWeight: 700 }}
                    >
                      <MessageSquare size={14} />
                      <span>Compartir Lookbook por WhatsApp</span>
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SALDOS & ÚLTIMAS TALLAS ── */}
      {activeTab === 'clearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--accent-coral)' }}>
              🏷️ Detección Automática de Últimas Tallas / Saldos de Colección
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {products.flatMap(p => (p.variants || []).filter(v => v.stock === 1).map(v => ({ ...v, productName: p.name, basePrice: p.base_price }))).map(item => (
                <div key={item.id} style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{item.productName}</strong>
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-coral)', fontWeight: 800 }}>
                      ¡Última Unidad!
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Color: {item.color_name} • <strong>Talla: {item.size}</strong> • SKU: {item.sku_variant}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.8rem' }}>
                    <span>Precio: <strong>{formatCurrency(Number(item.basePrice))}</strong></span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>Rebaja sugerida: -20%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA PRENDA CON GENERADOR DE VARIANTES ── */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                👗 Registrar Prenda / Calzado con Variantes
              </h2>
              <button onClick={() => setShowProductModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>SKU Maestro *</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={productForm.sku_master}
                    onChange={e => setProductForm(f => ({ ...f, sku_master: e.target.value.toUpperCase() }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem', fontWeight: 800 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre de la Prenda *</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={productForm.name}
                    onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Categoría</label>
                  <select
                    className="input-neu"
                    value={productForm.category}
                    onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  >
                    <option value="Pantalones & Jeans">Pantalones & Jeans</option>
                    <option value="Camisas & Blusas">Camisas & Blusas</option>
                    <option value="Vestidos & Faldas">Vestidos & Faldas</option>
                    <option value="Calzado & Zapatos">Calzado & Zapatos</option>
                    <option value="Chaquetas & Abrigos">Chaquetas & Abrigos</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Género</label>
                  <select
                    className="input-neu"
                    value={productForm.gender}
                    onChange={e => setProductForm(f => ({ ...f, gender: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  >
                    <option value="Dama">Dama</option>
                    <option value="Caballero">Caballero</option>
                    <option value="Infantil / Niños">Infantil</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Marca</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={productForm.brand}
                    onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Costo Base ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={productForm.base_cost}
                    onChange={e => setProductForm(f => ({ ...f, base_cost: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Venta ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={productForm.base_price}
                    onChange={e => setProductForm(f => ({ ...f, base_price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Stock x Variante</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={productForm.initialStockPerVariant}
                    onChange={e => setProductForm(f => ({ ...f, initialStockPerVariant: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Matrix Generator Preview */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.72rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-purple)', marginBottom: 4 }}>
                  Generador de Variantes ({productForm.selectedSizes.length} tallas × {productForm.selectedColors.length} colores = {productForm.selectedSizes.length * productForm.selectedColors.length} variantes)
                </div>
                <div>Tallas: {productForm.selectedSizes.join(', ')}</div>
                <div>Colores: {productForm.selectedColors.map(c => c.name).join(', ')}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowProductModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Generando...' : 'Guardar y Generar Matriz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ASIGNAR PROBADOR ── */}
      {showFittingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🚪 Asignar {showFittingModal.room_number}
                </h2>
              </div>
              <button onClick={() => setShowFittingModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleOccupyFittingRoom} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre del Cliente</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Camila Montoya"
                  value={fittingForm.customer_name}
                  onChange={e => setFittingForm(f => ({ ...f, customer_name: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}># Prendas al Vestidor</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={fittingForm.pieces_in_room}
                    onChange={e => setFittingForm(f => ({ ...f, pieces_in_room: Number(e.target.value) }))}
                    min={1}
                    max={10}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Asesora de Piso</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={fittingForm.assigned_advisor}
                    onChange={e => setFittingForm(f => ({ ...f, assigned_advisor: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowFittingModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO LOOKBOOK ── */}
      {showLookbookModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 460, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ✨ Crear Lookbook / Outfit
              </h2>
              <button onClick={() => setShowLookbookModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateLookbook} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Título del Outfit *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Outfit Noche Casual Urbano"
                  value={lookbookForm.title}
                  onChange={e => setLookbookForm(f => ({ ...f, title: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Descripción / Estilo</label>
                <input
                  type="text"
                  className="input-neu"
                  value={lookbookForm.description}
                  onChange={e => setLookbookForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Descuento por Outfit (%)</label>
                <input
                  type="number"
                  className="input-neu"
                  value={lookbookForm.discount_percent}
                  onChange={e => setLookbookForm(f => ({ ...f, discount_percent: Number(e.target.value) }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowLookbookModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Outfit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
