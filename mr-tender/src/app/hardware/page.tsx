'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateQuotePdf, HardwareQuotePdfData } from '@/lib/pdf-generator'
import {
  Wrench,
  FileText,
  Calculator,
  MapPin,
  Clock,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Printer,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Box,
  Truck,
  RotateCcw,
  Edit2,
  X
} from 'lucide-react'

interface HardwareQuote {
  id: string
  tenant_id: string
  quote_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  project_name?: string
  status: 'draft' | 'sent' | 'approved' | 'converted' | 'expired' | 'rejected'
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  valid_until?: string
  notes?: string
  created_at: string
  items?: HardwareQuoteItem[]
}

interface HardwareQuoteItem {
  id?: string
  quote_id?: string
  product_id?: string
  product_name: string
  sku?: string
  unit_name: string
  quantity: number
  unit_price: number
  discount_percent: number
  total_price: number
  location_info?: string
}

interface HardwareConversion {
  id: string
  tenant_id: string
  product_id?: string
  product_name: string
  base_unit: string
  fraction_unit: string
  conversion_factor: number
  fraction_sale_price: number
  fraction_cost_price?: number
  notes?: string
  created_at?: string
}

interface HardwareRental {
  id: string
  tenant_id: string
  tool_name: string
  serial_number?: string
  customer_name: string
  customer_phone?: string
  customer_doc_id?: string
  rental_start_date: string
  rental_end_date: string
  return_date?: string
  deposit_amount: number
  rental_fee: number
  status: 'active' | 'returned' | 'overdue' | 'damaged'
  condition_notes?: string
  created_at?: string
}

interface ProductCatalogItem {
  id: string
  name: string
  sku?: string
  sale_price: number
  unit_id?: string
  metadata?: any
}

export default function HardwarePage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'quotes' | 'fractional' | 'locations' | 'rentals'>('quotes')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('Ferretería & Construcción')
  const [tenantPhone, setTenantPhone] = useState<string>('')

  // Data lists
  const [quotes, setQuotes] = useState<HardwareQuote[]>([])
  const [conversions, setConversions] = useState<HardwareConversion[]>([])
  const [rentals, setRentals] = useState<HardwareRental[]>([])
  const [products, setProducts] = useState<ProductCatalogItem[]>([])

  // Quotes filter & search
  const [searchQuote, setSearchQuote] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [showRentalModal, setShowRentalModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState<HardwareRental | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Quote Form State
  const [quoteForm, setQuoteForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    project_name: '',
    valid_days: 15,
    notes: '',
    items: [
      { product_name: '', sku: '', unit_name: 'UND', quantity: 1, unit_price: 0, discount_percent: 0, total_price: 0 }
    ] as HardwareQuoteItem[]
  })

  // Conversion Form State
  const [conversionForm, setConversionForm] = useState({
    product_name: '',
    base_unit: 'Rollo',
    fraction_unit: 'Metro',
    conversion_factor: 100,
    fraction_sale_price: 2500,
    fraction_cost_price: 1800,
    notes: ''
  })

  // Rental Form State
  const [rentalForm, setRentalForm] = useState({
    tool_name: '',
    serial_number: '',
    customer_name: '',
    customer_phone: '',
    customer_doc_id: '',
    days: 3,
    deposit_amount: 100000,
    rental_fee: 35000,
    condition_notes: 'Equipo verificado y en óptimo estado funcional'
  })

  // Material Calculators State
  const [calcType, setCalcType] = useState<'paint' | 'concrete' | 'pipes'>('paint')
  const [paintArea, setPaintArea] = useState<number>(50)
  const [paintHands, setPaintHands] = useState<number>(2)
  const [concreteArea, setConcreteArea] = useState<number>(20)
  const [concreteThickness, setConcreteThickness] = useState<number>(10) // cm
  const [pipeMeters, setPipeMeters] = useState<number>(45)
  const [pipeLength, setPipeLength] = useState<number>(6) // 6m or 3m

  // Location search & edit
  const [locationSearch, setLocationSearch] = useState('')
  const [editingLocationProd, setEditingLocationProd] = useState<ProductCatalogItem | null>(null)
  const [locAisle, setLocAisle] = useState('')
  const [locRack, setLocRack] = useState('')
  const [locBin, setLocBin] = useState('')

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const tid = user.user_metadata?.tenant_id
        if (!tid) return
        setTenantId(tid)

        // Load tenant settings
        const { data: tSettings } = await supabase
          .from('tenant_settings')
          .select('business_name, phone')
          .eq('tenant_id', tid)
          .limit(1)
        if (tSettings?.[0]) {
          if (tSettings[0].business_name) setTenantName(tSettings[0].business_name)
          if (tSettings[0].phone) setTenantPhone(tSettings[0].phone)
        }

        // Load products for quotes & locations
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, sku, sale_price, metadata')
          .eq('tenant_id', tid)
          .order('name', { ascending: true })
        setProducts(prods || [])

        // Load Quotes
        const { data: qData } = await supabase
          .from('hardware_quotes')
          .select('*, hardware_quote_items(*)')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setQuotes((qData as any) || [])

        // Load Conversions
        const { data: cData } = await supabase
          .from('hardware_conversions')
          .select('*')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setConversions(cData || [])

        // Load Tool Rentals
        const { data: rData } = await supabase
          .from('hardware_tool_rentals')
          .select('*')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setRentals((rData as any) || [])

      } catch (err) {
        console.error('Error loading hardware module data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Refresh helper
  async function refreshData() {
    if (!tenantId) return
    const { data: qData } = await supabase.from('hardware_quotes').select('*, hardware_quote_items(*)').eq('tenant_id', tenantId).order('created_at', { ascending: false })
    setQuotes((qData as any) || [])
    const { data: cData } = await supabase.from('hardware_conversions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
    setConversions(cData || [])
    const { data: rData } = await supabase.from('hardware_tool_rentals').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
    setRentals((rData as any) || [])
    const { data: prods } = await supabase.from('products').select('id, name, sku, sale_price, metadata').eq('tenant_id', tenantId).order('name', { ascending: true })
    setProducts(prods || [])
  }

  // Add Item to Quote
  const handleAddQuoteItem = () => {
    setQuoteForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { product_name: '', sku: '', unit_name: 'UND', quantity: 1, unit_price: 0, discount_percent: 0, total_price: 0 }
      ]
    }))
  }

  // Remove Item from Quote
  const handleRemoveQuoteItem = (index: number) => {
    if (quoteForm.items.length <= 1) return
    setQuoteForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Update Item in Quote
  const handleUpdateQuoteItem = (index: number, field: keyof HardwareQuoteItem, val: any) => {
    setQuoteForm(prev => {
      const items = [...prev.items]
      const current = { ...items[index], [field]: val }

      // Auto calculation
      const qty = Number(current.quantity) || 0
      const price = Number(current.unit_price) || 0
      const disc = Number(current.discount_percent) || 0
      const gross = qty * price
      current.total_price = Math.max(0, gross - (gross * (disc / 100)))

      items[index] = current
      return { ...prev, items }
    })
  }

  // Select Catalog Product into Quote Item
  const handleSelectProductForQuote = (index: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId)
    if (!prod) return
    setQuoteForm(prev => {
      const items = [...prev.items]
      items[index] = {
        ...items[index],
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku || '',
        unit_price: prod.sale_price,
        total_price: (Number(items[index].quantity) || 1) * prod.sale_price
      }
      return { ...prev, items }
    })
  }

  // Calculate Quote Totals
  const quoteSubtotal = quoteForm.items.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)), 0)
  const quoteTotal = quoteForm.items.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)
  const quoteDiscount = quoteSubtotal - quoteTotal

  // Save New Quote
  async function handleCreateQuote(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!quoteForm.customer_name.trim()) return alert('Por favor ingresa el nombre del cliente o contratista')
    if (quoteForm.items.some(it => !it.product_name.trim() || it.quantity <= 0)) {
      return alert('Verifica que todos los ítems tengan descripción y cantidad válida')
    }

    setSubmitting(true)
    try {
      const quoteNumber = `COT-${Date.now().toString().slice(-6)}`
      const validUntilDate = new Date()
      validUntilDate.setDate(validUntilDate.getDate() + Number(quoteForm.valid_days || 15))

      const quotePayload = {
        tenant_id: tenantId,
        quote_number: quoteNumber,
        customer_name: quoteForm.customer_name,
        customer_phone: quoteForm.customer_phone || null,
        customer_email: quoteForm.customer_email || null,
        project_name: quoteForm.project_name || null,
        status: 'draft',
        subtotal: quoteSubtotal,
        discount_amount: quoteDiscount,
        tax_amount: 0,
        total: quoteTotal,
        valid_until: validUntilDate.toISOString().split('T')[0],
        notes: quoteForm.notes || null
      }

      const { data: newQuote, error: qErr } = await supabase
        .from('hardware_quotes')
        .insert(quotePayload)
        .select()
        .single()

      if (qErr) throw qErr

      const itemsPayload = quoteForm.items.map(it => ({
        quote_id: newQuote.id,
        product_id: it.product_id || null,
        product_name: it.product_name,
        sku: it.sku || null,
        unit_name: it.unit_name || 'UND',
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount_percent: Number(it.discount_percent || 0),
        total_price: Number(it.total_price)
      }))

      const { error: itErr } = await supabase.from('hardware_quote_items').insert(itemsPayload)
      if (itErr) throw itErr

      setShowQuoteModal(false)
      setQuoteForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        project_name: '',
        valid_days: 15,
        notes: '',
        items: [{ product_name: '', sku: '', unit_name: 'UND', quantity: 1, unit_price: 0, discount_percent: 0, total_price: 0 }]
      })
      await refreshData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar la cotización')
    } finally {
      setSubmitting(false)
    }
  }

  // Change Quote Status
  async function handleUpdateQuoteStatus(quoteId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('hardware_quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', quoteId)
      if (error) throw error
      await refreshData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Delete Quote
  async function handleDeleteQuote(quoteId: string) {
    if (!confirm('¿Seguro que deseas eliminar esta cotización?')) return
    try {
      const { error } = await supabase.from('hardware_quotes').delete().eq('id', quoteId)
      if (error) throw error
      setQuotes(prev => prev.filter(q => q.id !== quoteId))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Export / Print PDF for Quote
  function handlePrintQuote(q: HardwareQuote) {
    const pdfData: HardwareQuotePdfData = {
      businessName: tenantName,
      merchantPhone: tenantPhone,
      quoteNumber: q.quote_number,
      customerName: q.customer_name,
      customerPhone: q.customer_phone,
      customerEmail: q.customer_email,
      projectName: q.project_name,
      date: formatDate(q.created_at),
      validUntil: q.valid_until ? formatDate(q.valid_until) : undefined,
      items: (q.items || []).map(it => ({
        name: it.product_name,
        sku: it.sku,
        unitName: it.unit_name,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        discountPercent: Number(it.discount_percent || 0),
        total: Number(it.total_price)
      })),
      subtotal: Number(q.subtotal),
      discountAmount: Number(q.discount_amount),
      taxAmount: Number(q.tax_amount),
      total: Number(q.total),
      notes: q.notes
    }
    generateQuotePdf(pdfData)
  }

  // Save Fractional Unit Conversion
  async function handleCreateConversion(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!conversionForm.product_name.trim()) return alert('Ingresa el nombre del material')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        product_name: conversionForm.product_name,
        base_unit: conversionForm.base_unit,
        fraction_unit: conversionForm.fraction_unit,
        conversion_factor: Number(conversionForm.conversion_factor),
        fraction_sale_price: Number(conversionForm.fraction_sale_price),
        fraction_cost_price: Number(conversionForm.fraction_cost_price || 0),
        notes: conversionForm.notes || null
      }
      const { error } = await supabase.from('hardware_conversions').insert(payload)
      if (error) throw error
      setShowConversionModal(false)
      setConversionForm({
        product_name: '',
        base_unit: 'Rollo',
        fraction_unit: 'Metro',
        conversion_factor: 100,
        fraction_sale_price: 2500,
        fraction_cost_price: 1800,
        notes: ''
      })
      await refreshData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar regla de conversión')
    } finally {
      setSubmitting(false)
    }
  }

  // Save Tool Rental
  async function handleCreateRental(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!rentalForm.tool_name.trim() || !rentalForm.customer_name.trim()) {
      return alert('Ingresa el nombre de la herramienta y el nombre del cliente')
    }

    setSubmitting(true)
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + Number(rentalForm.days || 3))

      const payload = {
        tenant_id: tenantId,
        tool_name: rentalForm.tool_name,
        serial_number: rentalForm.serial_number || null,
        customer_name: rentalForm.customer_name,
        customer_phone: rentalForm.customer_phone || null,
        customer_doc_id: rentalForm.customer_doc_id || null,
        rental_start_date: startDate.toISOString().split('T')[0],
        rental_end_date: endDate.toISOString().split('T')[0],
        deposit_amount: Number(rentalForm.deposit_amount),
        rental_fee: Number(rentalForm.rental_fee),
        status: 'active',
        condition_notes: rentalForm.condition_notes || null
      }

      const { error } = await supabase.from('hardware_tool_rentals').insert(payload)
      if (error) throw error

      setShowRentalModal(false)
      setRentalForm({
        tool_name: '',
        serial_number: '',
        customer_name: '',
        customer_phone: '',
        customer_doc_id: '',
        days: 3,
        deposit_amount: 100000,
        rental_fee: 35000,
        condition_notes: 'Equipo verificado y en óptimo estado funcional'
      })
      await refreshData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar alquiler')
    } finally {
      setSubmitting(false)
    }
  }

  // Process Return of Tool
  async function handleConfirmReturn(rentalId: string, notes: string) {
    try {
      const { error } = await supabase
        .from('hardware_tool_rentals')
        .update({
          status: 'returned',
          return_date: new Date().toISOString().split('T')[0],
          condition_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', rentalId)
      if (error) throw error
      setShowReturnModal(null)
      await refreshData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Save Product Location (Aisle / Rack / Bin)
  async function handleSaveLocation() {
    if (!editingLocationProd) return
    try {
      const currentMeta = editingLocationProd.metadata || {}
      const updatedMeta = {
        ...currentMeta,
        location: {
          aisle: locAisle,
          rack: locRack,
          bin: locBin
        }
      }

      const { error } = await supabase
        .from('products')
        .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
        .eq('id', editingLocationProd.id)

      if (error) throw error
      setEditingLocationProd(null)
      await refreshData()
    } catch (err: any) {
      alert('Error al guardar ubicación: ' + err.message)
    }
  }

  // Filtered Quotes
  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = !searchQuote ||
      q.quote_number.toLowerCase().includes(searchQuote.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(searchQuote.toLowerCase()) ||
      (q.project_name && q.project_name.toLowerCase().includes(searchQuote.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Filtered Products for Location
  const filteredLocationProds = products.filter(p =>
    !locationSearch ||
    p.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(locationSearch.toLowerCase())) ||
    (p.metadata?.location?.aisle && p.metadata.location.aisle.toLowerCase().includes(locationSearch.toLowerCase()))
  )

  // Calculations for Material Estimators
  // Paint calculation: 1 gallon ≈ 35-40 m² per coat
  const paintGallonsNeeded = Math.ceil((paintArea * paintHands) / 35)
  const paintBucketsNeeded = (paintGallonsNeeded / 5).toFixed(1)

  // Concrete calculation: 1 m³ slab = ~7 bags cement (50kg) + 0.55 m³ sand + 0.85 m³ gravel
  const slabVolumeM3 = (concreteArea * (concreteThickness / 100))
  const cementBagsNeeded = Math.ceil(slabVolumeM3 * 7.5)
  const sandM3Needed = (slabVolumeM3 * 0.55).toFixed(2)
  const gravelM3Needed = (slabVolumeM3 * 0.85).toFixed(2)

  // Pipe calculation: total meters / pipe length + 1 connector per joint
  const pipesCount = Math.ceil(pipeMeters / pipeLength)
  const pipeConnectors = Math.max(0, pipesCount - 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Ferretería & Construcción
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Cotizaciones a contratistas, venta fraccionada por metros/kilos, ubicaciones de bodega y alquiler de herramientas
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refreshData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {activeTab === 'quotes' && (
            <button onClick={() => setShowQuoteModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Cotización</span>
            </button>
          )}
          {activeTab === 'fractional' && (
            <button onClick={() => setShowConversionModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Regla de Fracción</span>
            </button>
          )}
          {activeTab === 'rentals' && (
            <button onClick={() => setShowRentalModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Prestar / Alquilar Herramienta</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Cotizaciones Activas
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {quotes.filter(q => q.status === 'draft' || q.status === 'sent' || q.status === 'approved').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {quotes.filter(q => q.status === 'converted').length} convertidas a venta
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Monto Cotizado Activo
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {formatCurrency(quotes.filter(q => q.status !== 'converted' && q.status !== 'rejected').reduce((acc, q) => acc + Number(q.total), 0))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Proformas vigentes de clientes
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Herramientas en Alquiler
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {rentals.filter(r => r.status === 'active' || r.status === 'overdue').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {rentals.filter(r => r.status === 'returned').length} devueltas correctamente
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Reglas de Fraccionamiento
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {conversions.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Metros, kilos y cortes configurados
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('quotes')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'quotes' ? 800 : 500,
            background: activeTab === 'quotes' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'quotes' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FileText size={15} />
          <span>Cotizaciones & Proformas ({quotes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fractional')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'fractional' ? 800 : 500,
            background: activeTab === 'fractional' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'fractional' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Calculator size={15} />
          <span>Venta Fraccionada & Calculadora</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'locations' ? 800 : 500,
            background: activeTab === 'locations' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'locations' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <MapPin size={15} />
          <span>Localizador de Bodega / Pasillos</span>
        </button>

        <button
          onClick={() => setActiveTab('rentals')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'rentals' ? 800 : 500,
            background: activeTab === 'rentals' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'rentals' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Wrench size={15} />
          <span>Alquiler de Herramientas ({rentals.filter(r => r.status === 'active').length})</span>
        </button>
      </div>

      {/* ── TAB 1: COTIZACIONES & PROFORMAS ── */}
      {activeTab === 'quotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  className="input-neu"
                  type="text"
                  placeholder="Buscar por N° cotización, cliente o proyecto..."
                  value={searchQuote}
                  onChange={e => setSearchQuote(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34, fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'draft', label: 'Borrador' },
                { id: 'sent', label: 'Enviada' },
                { id: 'approved', label: 'Aprobada' },
                { id: 'converted', label: 'Convertida' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className="btn-neu"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    background: statusFilter === st.id ? 'var(--bg-deep)' : 'var(--bg)',
                    fontWeight: statusFilter === st.id ? 700 : 500,
                    border: statusFilter === st.id ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quotes Table */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando cotizaciones...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📝</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay cotizaciones registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Crea cotizaciones y proformas de obra para entregar a contratistas y clientes de mostrador.
              </p>
              <button onClick={() => setShowQuoteModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primera cotización
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>N° Cotización</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Cliente / Proyecto</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Emisión / Vence</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map(q => {
                    const statusBadge: Record<string, { label: string; bg: string; color: string }> = {
                      draft: { label: 'Borrador', bg: 'var(--bg-deep)', color: 'var(--text-secondary)' },
                      sent: { label: 'Enviada', bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' },
                      approved: { label: 'Aprobada', bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' },
                      converted: { label: 'Venta Realizada', bg: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)' },
                      expired: { label: 'Vencida', bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-coral)' },
                      rejected: { label: 'Rechazada', bg: 'var(--border-color)', color: 'var(--text-muted)' },
                    }
                    const badge = statusBadge[q.status] || statusBadge.draft

                    return (
                      <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {q.quote_number}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{q.customer_name}</div>
                          {q.project_name && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📍 {q.project_name}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          <div>{formatDate(q.created_at)}</div>
                          {q.valid_until && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vence: {formatDate(q.valid_until)}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {formatCurrency(Number(q.total))}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handlePrintQuote(q)}
                              className="btn-neu btn-ghost"
                              title="Descargar / Imprimir Proforma PDF"
                              style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Printer size={14} />
                              <span>PDF</span>
                            </button>

                            {q.status !== 'converted' && (
                              <button
                                onClick={() => handleUpdateQuoteStatus(q.id, 'converted')}
                                className="btn-neu btn-primary"
                                title="Marcar como convertida a venta"
                                style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <CheckCircle2 size={13} />
                                <span>A Venta</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteQuote(q.id)}
                              className="btn-neu btn-ghost"
                              title="Eliminar cotización"
                              style={{ padding: '5px 8px', color: 'var(--accent-coral)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: VENTA FRACCIONADA & CALCULADORA ── */}
      {activeTab === 'fractional' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          
          {/* Conversions List */}
          <div className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📏 Reglas de Fraccionamiento
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Equivalencias de rollos, bultos y cajas a metros, kilos y unidades
                </p>
              </div>
              <button onClick={() => setShowConversionModal(true)} className="btn-neu btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                + Nueva Regla
              </button>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            {conversions.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No hay reglas de fraccionamiento guardadas aún.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {conversions.map(c => (
                  <div key={c.id} className="neu-card" style={{ padding: '12px 14px', background: 'var(--bg-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        1 {c.base_unit} = <strong>{c.conversion_factor} {c.fraction_unit}s</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                        {formatCurrency(Number(c.fraction_sale_price))} / {c.fraction_unit}
                      </div>
                      {c.fraction_cost_price && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Costo: {formatCurrency(Number(c.fraction_cost_price))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Material Estimator Calculators */}
          <div className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🧮 Calculadora Rápida para Mostrador
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Calcula instantáneamente materiales para asesorar al cliente
              </p>
            </div>

            {/* Calculator Selectors */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'paint', label: '🎨 Pintura', title: 'Pintura y Recubrimiento' },
                { id: 'concrete', label: '🧱 Concreto / Mortero', title: 'Cemento y Áridos' },
                { id: 'pipes', label: '🚰 Tubería & Conduit', title: 'Metros Lineales' }
              ].map(calc => (
                <button
                  key={calc.id}
                  onClick={() => setCalcType(calc.id as any)}
                  className="btn-neu"
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    fontSize: '0.75rem',
                    fontWeight: calcType === calc.id ? 700 : 500,
                    background: calcType === calc.id ? 'var(--accent-blue)' : 'var(--bg)',
                    color: calcType === calc.id ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {calc.label}
                </button>
              ))}
            </div>

            {/* Paint Calc */}
            {calcType === 'paint' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Área a pintar (m²)</label>
                    <input type="number" className="input-neu" value={paintArea} onChange={e => setPaintArea(Number(e.target.value))} style={{ width: '100%', fontSize: '0.82rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>N° de Manos / Capas</label>
                    <input type="number" className="input-neu" value={paintHands} onChange={e => setPaintHands(Number(e.target.value))} style={{ width: '100%', fontSize: '0.82rem' }} />
                  </div>
                </div>

                <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)', border: '1px solid var(--accent-blue-lt)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Material Estimado Sugerido</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                        {paintGallonsNeeded} Galones
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>o equivalente a <strong>{paintBucketsNeeded} Cuñetes (5 gal)</strong></div>
                    </div>
                    <span style={{ fontSize: '2rem' }}>🎨</span>
                  </div>
                </div>
              </div>
            )}

            {/* Concrete Calc */}
            {calcType === 'concrete' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Área de losa/piso (m²)</label>
                    <input type="number" className="input-neu" value={concreteArea} onChange={e => setConcreteArea(Number(e.target.value))} style={{ width: '100%', fontSize: '0.82rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Espesor (cm)</label>
                    <input type="number" className="input-neu" value={concreteThickness} onChange={e => setConcreteThickness(Number(e.target.value))} style={{ width: '100%', fontSize: '0.82rem' }} />
                  </div>
                </div>

                <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)', border: '1px solid var(--accent-blue-lt)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Volumen Total: {slabVolumeM3.toFixed(2)} m³
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{cementBagsNeeded} Bultos</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cemento 50kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{sandM3Needed} m³ Arena</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{gravelM3Needed} m³ Grava</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pipes Calc */}
            {calcType === 'pipes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Recorrido total (Metros)</label>
                    <input type="number" className="input-neu" value={pipeMeters} onChange={e => setPipeMeters(Number(e.target.value))} style={{ width: '100%', fontSize: '0.82rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Largo por tubo</label>
                    <select className="input-neu" value={pipeLength} onChange={e => setPipeLength(Number(e.target.value))} style={{ width: '100%', fontSize: '0.82rem' }}>
                      <option value={6}>Tubos de 6 metros</option>
                      <option value={3}>Tubos de 3 metros</option>
                    </select>
                  </div>
                </div>

                <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)', border: '1px solid var(--accent-blue-lt)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Despiece de Tubería</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{pipesCount} Tubos ({pipeLength}m)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>+ Mínimo <strong>{pipeConnectors} Uniones / Coples</strong></div>
                    </div>
                    <span style={{ fontSize: '2rem' }}>🚰</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: LOCALIZADOR DE BODEGA & PASILLOS ── */}
      {activeTab === 'locations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                className="input-neu"
                type="text"
                placeholder="Buscar producto, SKU o pasillo..."
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 34, fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Mostrando {filteredLocationProds.length} productos del catálogo
            </div>
          </div>

          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Producto</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Pasillo (Aisle)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Estantería (Rack)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Gaveta / Nivel</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Asignar</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocationProds.map(p => {
                  const loc = p.metadata?.location || {}
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {p.sku || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {loc.aisle ? (
                          <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(194, 109, 45, 0.1)', color: 'var(--accent-blue)', fontWeight: 700 }}>
                            Pasillo {loc.aisle}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {loc.rack ? `Estante ${loc.rack}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {loc.bin ? `Gaveta ${loc.bin}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setEditingLocationProd(p)
                            setLocAisle(loc.aisle || '')
                            setLocRack(loc.rack || '')
                            setLocBin(loc.bin || '')
                          }}
                          className="btn-neu btn-ghost"
                          style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit2 size={13} />
                          <span>Ubicación</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: ALQUILER DE HERRAMIENTAS ── */}
      {activeTab === 'rentals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rentals.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛠️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay alquileres registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Controla los préstamos de taladros, andamios, pulidoras y maquinaria menor con depósitos de garantía.
              </p>
              <button onClick={() => setShowRentalModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Registrar primer préstamo
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Herramienta / Serial</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Cliente / Contacto</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Salida / Retorno</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Depósito Garantía</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map(r => {
                    const isOverdue = r.status === 'active' && new Date(r.rental_end_date) < new Date()
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.tool_name}</div>
                          {r.serial_number && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>S/N: {r.serial_number}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.customer_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {r.customer_phone} {r.customer_doc_id ? `• CC: ${r.customer_doc_id}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          <div>Desde: {formatDate(r.rental_start_date)}</div>
                          <div style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--accent-coral)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                            Hasta: {formatDate(r.rental_end_date)} {isOverdue ? '(Vencido)' : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{formatCurrency(Number(r.deposit_amount))}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tarifa: {formatCurrency(Number(r.rental_fee))}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: r.status === 'returned' ? 'rgba(16, 185, 129, 0.1)' : isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(194, 109, 45, 0.1)',
                            color: r.status === 'returned' ? 'var(--accent-green)' : isOverdue ? 'var(--accent-coral)' : 'var(--accent-blue)'
                          }}>
                            {r.status === 'returned' ? '✓ Devuelto' : isOverdue ? '⚠️ Retrasado' : '⏳ En Préstamo'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {r.status === 'active' && (
                            <button
                              onClick={() => setShowReturnModal(r)}
                              className="btn-neu btn-primary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <RotateCcw size={13} />
                              <span>Registrar Devolución</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: NUEVA COTIZACIÓN ── */}
      {showQuoteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📝 Nueva Cotización / Proforma de Obra
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Elabora presupuestos para contratistas y maestros de obra
                </p>
              </div>
              <button onClick={() => setShowQuoteModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cliente / Contratista *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Maestro Carlos Pérez"
                    value={quoteForm.customer_name}
                    onChange={e => setQuoteForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3001234567"
                    value={quoteForm.customer_phone}
                    onChange={e => setQuoteForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre de la Obra / Proyecto</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Remodelación Casa 4"
                    value={quoteForm.project_name}
                    onChange={e => setQuoteForm(prev => ({ ...prev, project_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Días de Validez</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={quoteForm.valid_days}
                    onChange={e => setQuoteForm(prev => ({ ...prev, valid_days: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ítems & Materiales de la Cotización</label>
                  <button type="button" onClick={handleAddQuoteItem} className="btn-neu btn-ghost" style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                    + Agregar Fila
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '35vh', overflowY: 'auto' }}>
                  {quoteForm.items.map((item, idx) => (
                    <div key={idx} className="neu-card" style={{ padding: 8, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                      <div>
                        <input
                          type="text"
                          className="input-neu"
                          placeholder="Descripción material..."
                          value={item.product_name}
                          onChange={e => handleUpdateQuoteItem(idx, 'product_name', e.target.value)}
                          style={{ width: '100%', fontSize: '0.78rem', padding: '6px 8px' }}
                        />
                        {products.length > 0 && (
                          <select
                            className="input-neu"
                            onChange={e => handleSelectProductForQuote(idx, e.target.value)}
                            style={{ width: '100%', fontSize: '0.68rem', marginTop: 2, padding: '2px 4px' }}
                          >
                            <option value="">O seleccionar de catálogo...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.sale_price}</option>)}
                          </select>
                        )}
                      </div>

                      <select
                        className="input-neu"
                        value={item.unit_name}
                        onChange={e => handleUpdateQuoteItem(idx, 'unit_name', e.target.value)}
                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 4px' }}
                      >
                        {['UND', 'Metros', 'Kilos', 'Bultos', 'Cajas', 'Rollos', 'Varillas', 'Galones'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>

                      <input
                        type="number"
                        className="input-neu"
                        placeholder="Cant"
                        value={item.quantity}
                        onChange={e => handleUpdateQuoteItem(idx, 'quantity', Number(e.target.value))}
                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 4px' }}
                      />

                      <input
                        type="number"
                        className="input-neu"
                        placeholder="Precio"
                        value={item.unit_price}
                        onChange={e => handleUpdateQuoteItem(idx, 'unit_price', Number(e.target.value))}
                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 4px' }}
                      />

                      <div style={{ fontSize: '0.78rem', fontWeight: 800, textAlign: 'right', color: 'var(--text-primary)' }}>
                        {formatCurrency(item.total_price)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuoteItem(idx)}
                        className="btn-neu btn-ghost"
                        style={{ padding: 4, color: 'var(--accent-coral)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6, background: 'var(--bg-deep)', padding: 12, borderRadius: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Condiciones Comerciales / Notas</label>
                  <textarea
                    className="input-neu"
                    rows={2}
                    placeholder="Ej: Precios válidos por 15 días. No incluye transporte."
                    value={quoteForm.notes}
                    onChange={e => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Subtotal: <strong>{formatCurrency(quoteSubtotal)}</strong></div>
                  {quoteDiscount > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-coral)' }}>Descuento: -{formatCurrency(quoteDiscount)}</div>
                  )}
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                    Total: {formatCurrency(quoteTotal)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowQuoteModal(false)} className="btn-neu btn-ghost" style={{ padding: '9px 18px' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '9px 24px' }}>
                  {submitting ? 'Guardando...' : 'Generar Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA REGLA FRACCIONADA ── */}
      {showConversionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📏 Nueva Regla de Fraccionamiento
              </h2>
              <button onClick={() => setShowConversionModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateConversion} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Material o Producto *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Cable Eléctrico #12 Centelsa"
                  value={conversionForm.product_name}
                  onChange={e => setConversionForm(prev => ({ ...prev, product_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Unidad Origen (Base)</label>
                  <select
                    className="input-neu"
                    value={conversionForm.base_unit}
                    onChange={e => setConversionForm(prev => ({ ...prev, base_unit: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    {['Rollo', 'Bulto', 'Caja', 'Caneca', 'Tubo 6m'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Unidad Fraccionada (Venta)</label>
                  <select
                    className="input-neu"
                    value={conversionForm.fraction_unit}
                    onChange={e => setConversionForm(prev => ({ ...prev, fraction_unit: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    {['Metro', 'Kilo', 'Libra', 'Unidad', 'Docena', 'Litro'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Factor de Conversión</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={conversionForm.conversion_factor}
                    onChange={e => setConversionForm(prev => ({ ...prev, conversion_factor: Number(e.target.value) }))}
                    placeholder="Ej: 100"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>1 {conversionForm.base_unit} = {conversionForm.conversion_factor} {conversionForm.fraction_unit}s</span>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Venta por Fracción ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={conversionForm.fraction_sale_price}
                    onChange={e => setConversionForm(prev => ({ ...prev, fraction_sale_price: Number(e.target.value) }))}
                    placeholder="Ej: 2500"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowConversionModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO ALQUILER DE HERRAMIENTA ── */}
      {showRentalModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🛠️ Registrar Préstamo / Alquiler de Equipo
              </h2>
              <button onClick={() => setShowRentalModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateRental} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Herramienta / Equipo *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Taladro Percutor Bosch 800W"
                    value={rentalForm.tool_name}
                    onChange={e => setRentalForm(prev => ({ ...prev, tool_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Serial / Identificador</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="TAL-004"
                    value={rentalForm.serial_number}
                    onChange={e => setRentalForm(prev => ({ ...prev, serial_number: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Cliente *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Carlos Ruiz"
                    value={rentalForm.customer_name}
                    onChange={e => setRentalForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cédula / Documento</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="1012345678"
                    value={rentalForm.customer_doc_id}
                    onChange={e => setRentalForm(prev => ({ ...prev, customer_doc_id: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3001234567"
                    value={rentalForm.customer_phone}
                    onChange={e => setRentalForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Días pactados</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={rentalForm.days}
                    onChange={e => setRentalForm(prev => ({ ...prev, days: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Depósito ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={rentalForm.deposit_amount}
                    onChange={e => setRentalForm(prev => ({ ...prev, deposit_amount: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tarifa alquiler ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={rentalForm.rental_fee}
                    onChange={e => setRentalForm(prev => ({ ...prev, rental_fee: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowRentalModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Registrar Préstamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR DEVOLUCIÓN ── */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              🔄 Registrar Devolución de Herramienta
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Equipo: <strong>{showReturnModal.tool_name}</strong> | Cliente: <strong>{showReturnModal.customer_name}</strong>
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 700 }}>
              Devolver depósito de: {formatCurrency(Number(showReturnModal.deposit_amount))}
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Estado físico y notas de recepción</label>
              <textarea
                id="returnNotes"
                className="input-neu"
                rows={2}
                defaultValue="Herramienta entregada en perfecto estado funcional y limpia."
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setShowReturnModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
              <button
                type="button"
                onClick={() => {
                  const notes = (document.getElementById('returnNotes') as HTMLTextAreaElement)?.value || ''
                  handleConfirmReturn(showReturnModal.id, notes)
                }}
                className="btn-neu btn-primary"
                style={{ padding: '8px 20px' }}
              >
                Confirmar Devolución
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ASIGNAR UBICACIÓN DE BODEGA ── */}
      {editingLocationProd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              📍 Ubicación en Bodega
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Producto: <strong>{editingLocationProd.name}</strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Pasillo (Aisle)</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: 3B"
                  value={locAisle}
                  onChange={e => setLocAisle(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Estante (Rack)</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: R-04"
                  value={locRack}
                  onChange={e => setLocRack(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Gaveta / Nivel</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: N2"
                  value={locBin}
                  onChange={e => setLocBin(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" onClick={() => setEditingLocationProd(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
              <button type="button" onClick={handleSaveLocation} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                Guardar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
