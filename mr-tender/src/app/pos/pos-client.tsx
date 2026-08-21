'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import CameraScanner from '@/components/CameraScanner'
import AudioPosHUD from '@/components/AudioPosHUD'
import RefundModal from '@/components/RefundModal'
import { findMasterProduct } from '@/lib/catalog/colombia-products'
import {
  Search,
  Camera,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  MessageSquare,
  Printer,
  Send,
  User,
  Check,
  ArrowLeft,
  Delete,
  Scale,
  WifiOff,
  Wifi,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  RotateCcw,
  Mic,
  Sparkles
} from 'lucide-react'

// Web Audio sound generator for tactile feedback
function playSound(type: 'beep' | 'success' | 'tap' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    if (type === 'tap') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.04)
    } else if (type === 'beep') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99] // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
        gain.gain.setValueAtTime(0.09, ctx.currentTime + i * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.12)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + i * 0.08)
        osc.stop(ctx.currentTime + i * 0.08 + 0.12)
      })
    } else if (type === 'error') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.18)
    }
  } catch {}
}

interface Product {
  id: string
  name: string
  price: number
  sku: string
  stock: number
  category: string
  cost: number
  unit_type?: string
  tax_rate?: number
  category_id?: string
  warehouse_id?: string
  is_pharmacy?: boolean
  generic_name?: string
  concentration?: string
  laboratory?: string
  unit_price?: number
  blister_price?: number | null
  box_price?: number | null
  units_per_box?: number
  units_per_blister?: number
  prescription_type?: 'otc' | 'rx' | 'controlled'
}

interface CartItem extends Product {
  quantity: number
  discount: number
  lineTotal: number
}

interface Customer {
  id: string
  full_name: string
  phone: string | null
  credit_limit: number
  credit_used: number
  total_purchases?: number
  total_orders?: number
}

interface HeldCart {
  id: string
  label: string
  time: string
  cart: CartItem[]
  discount: number
  customer: Customer | null
  total: number
}

export default function POSClient() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [isFirstNumpadKey, setIsFirstNumpadKey] = useState(true)
  const [transferRef, setTransferRef] = useState('')
  const [step, setStep] = useState<'cart' | 'payment' | 'done'>('cart')
  const [loading, setLoading] = useState(false)
  const [saleNumber, setSaleNumber] = useState('')
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [showVoiceHUD, setShowVoiceHUD] = useState(false)
  const [businessName, setBusinessName] = useState('MI TIENDA')
  const [merchantPhone, setMerchantPhone] = useState('3001234567')
  const [defaultTaxRate, setDefaultTaxRate] = useState(19)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  // Held Carts (Multi-ticket)
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([])
  const [showHeldModal, setShowHeldModal] = useState(false)

  // Pharmacy & Weighing product selection
  const [weighingProduct, setWeighingProduct] = useState<Product | null>(null)
  const [selectedFractionProduct, setSelectedFractionProduct] = useState<Product | null>(null)
  const [weightValue, setWeightValue] = useState('0.5')
  const [scaleConnected, setScaleConnected] = useState<boolean>(false)

  // Express product creation modal from POS
  const [showExpressModal, setShowExpressModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [expressForm, setExpressForm] = useState({ name: '', sku: '', price: '', cost: '', stock: '10' })
  const [creatingExpress, setCreatingExpress] = useState(false)

  // Customers state
  const [customerList, setCustomerList] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Global Keyboard Shortcuts (Key V or Ctrl+Space for Voice POS)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'v' || e.key === 'V') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault()
        setShowVoiceHUD(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Audio-POS Voice Handlers
  const handleVoiceAddItems = useCallback((items: Array<{ product: any; quantity: number }>) => {
    items.forEach(({ product, quantity }) => {
      setCart(prevCart => {
        const existingIdx = prevCart.findIndex(i => i.id === product.id)
        if (existingIdx >= 0) {
          const updated = [...prevCart]
          const newQty = updated[existingIdx].quantity + quantity
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            lineTotal: (newQty * updated[existingIdx].price) - updated[existingIdx].discount
          }
          return updated
        } else {
          return [
            ...prevCart,
            {
              ...product,
              quantity,
              discount: 0,
              lineTotal: quantity * Number(product.price || 0)
            }
          ]
        }
      })
    })
    playSound('beep')
  }, [])

  const handleVoiceSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    playSound('tap')
  }, [])

  const handleVoiceSetPaymentMethod = useCallback((method: string) => {
    setPaymentMethod(method)
    playSound('tap')
  }, [])

  const handleVoiceSetReceivedAmount = useCallback((amount: number) => {
    setReceivedAmount(amount.toString())
    playSound('tap')
  }, [])

  const handleVoiceClearCart = useCallback(() => {
    setCart([])
    setSelectedCustomer(null)
    setDiscount(0)
    playSound('tap')
  }, [])

  // State loaded from DB
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(['Todos'])
  const [sessionInfo, setSessionInfo] = useState<{
    tenant_id: string
    user_id: string
    branch_id: string
    warehouse_id: string
    session_id: string | null
    register_id: string | null
  } | null>(null)

  // Offline detection and background queue sync
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => { setIsOnline(true); syncPendingSales(); }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const savedQueue = localStorage.getItem('mr_tender_offline_sales')
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        setPendingSyncCount(parsed.length)
      } catch {}
    }

    const savedHeld = localStorage.getItem('mr_tender_held_carts')
    if (savedHeld) {
      try {
        setHeldCarts(JSON.parse(savedHeld))
      } catch {}
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function syncPendingSales() {
    const savedQueueStr = localStorage.getItem('mr_tender_offline_sales')
    if (!savedQueueStr) return
    try {
      let queue: Array<{ offline_id?: string; payload: any; created_at: string }> = JSON.parse(savedQueueStr)
      if (!Array.isArray(queue) || queue.length === 0) return

      const remaining: typeof queue = []
      for (const item of queue) {
        try {
          const { data, error } = await supabase.rpc('process_sale', { p_sale_data: item.payload })
          if (error || (data && data.success === false)) {
            if (data?.already_synced) {
              continue // Dropped safely since it was already registered in DB
            }
            remaining.push(item)
          }
        } catch {
          remaining.push(item)
        }
      }

      if (remaining.length === 0) {
        localStorage.removeItem('mr_tender_offline_sales')
        setPendingSyncCount(0)
        playSound('success')
      } else {
        localStorage.setItem('mr_tender_offline_sales', JSON.stringify(remaining))
        setPendingSyncCount(remaining.length)
      }
    } catch (e) {
      console.error('Error syncing offline sales:', e)
    }
  }

  // Fetch session data, products and customers
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id
        const user_id = user.id

        // Get tenant settings
        const { data: tSettings } = await supabase
          .from('tenant_settings')
          .select('business_name, whatsapp, phone, tax_rate, tax_name')
          .eq('tenant_id', tenant_id)
          .limit(1)

        let currentTaxRate = 19
        if (tSettings?.[0]) {
          if (tSettings[0].business_name) setBusinessName(tSettings[0].business_name)
          setMerchantPhone(tSettings[0].whatsapp || tSettings[0].phone || '3001234567')
          if (tSettings[0].tax_rate !== null && tSettings[0].tax_rate !== undefined) {
            currentTaxRate = Number(tSettings[0].tax_rate)
            setDefaultTaxRate(currentTaxRate)
          }
        }

        // Get branch
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
          .limit(1)
        
        const branch_id = branches?.[0]?.id || null

        // Get warehouse
        const { data: warehouses } = await supabase
          .from('warehouses')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
          .limit(1)
        
        const warehouse_id = warehouses?.[0]?.id || null

        // Get active cash register and open session
        const [regRes, sessRes] = await Promise.all([
          supabase
            .from('cash_registers')
            .select('id, current_session_id')
            .eq('tenant_id', tenant_id)
            .eq('is_active', true)
            .limit(1),
          supabase
            .from('cash_sessions')
            .select('id, register_id')
            .eq('tenant_id', tenant_id)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)
        ])

        const register_id = regRes.data?.[0]?.id || sessRes.data?.[0]?.register_id || null
        const session_id = sessRes.data?.[0]?.id || regRes.data?.[0]?.current_session_id || null

        setSessionInfo({
          tenant_id,
          user_id,
          branch_id,
          warehouse_id,
          session_id,
          register_id
        })

        // Fetch customers list
        const { data: custData } = await supabase
          .from('customers')
          .select('id, full_name, phone, credit_limit, credit_used, total_purchases, total_orders')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
          .order('full_name', { ascending: true })

        if (custData) {
          setCustomerList(custData as any)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const cId = params.get('customer')
            if (cId) {
              const found = custData.find((c: any) => c.id === cId)
              if (found) setSelectedCustomer(found as any)
            }
          }
        }

        // Get products with stock and pharmacy medicines
        const [prodRes, medRes] = await Promise.all([
          supabase
            .from('products')
            .select(`
              id, name, sale_price, cost_price, sku, barcode, category_id, tax_rate,
              categories (name),
              inventory (quantity, warehouse_id)
            `)
            .eq('tenant_id', tenant_id)
            .eq('is_active', true),
          supabase
            .from('pharmacy_medicines')
            .select(`
              *,
              pharmacy_lots (current_quantity, expiration_date, status)
            `)
            .eq('tenant_id', tenant_id)
            .eq('is_active', true)
        ])

        const loadedProducts: Product[] = []

        if (prodRes.data) {
          prodRes.data.forEach((p: any) => {
            const whStock = p.inventory?.find((inv: any) => inv.warehouse_id === warehouse_id)
            const stock = whStock ? Number(whStock.quantity) : 0
            const catName = p.categories?.name || 'General'
            const isWeighed = /kg|kilo|libra|\blb\b|gramo|\bgr\b|queso|carne|pollo|fruta|verdura/i.test(p.name)

            loadedProducts.push({
              id: p.id,
              name: p.name,
              price: Number(p.sale_price),
              cost: Number(p.cost_price),
              sku: p.sku || p.barcode || '',
              stock,
              category: catName,
              unit_type: isWeighed ? 'lb' : 'unit',
              tax_rate: p.tax_rate !== null && p.tax_rate !== undefined ? Number(p.tax_rate) : currentTaxRate,
              category_id: p.category_id,
              warehouse_id
            })
          })
        }

        if (medRes.data) {
          medRes.data.forEach((m: any) => {
            const lots = m.pharmacy_lots || []
            const activeLots = lots.filter((l: any) => l.status !== 'expired' && l.status !== 'quarantine')
            const realStock = activeLots.length > 0
              ? activeLots.reduce((acc: number, l: any) => acc + Number(l.current_quantity || 0), 0)
              : 0

            loadedProducts.push({
              id: m.id,
              name: `${m.trade_name} (${m.generic_name} ${m.concentration || ''})`,
              price: Number(m.unit_price || m.box_price || 0),
              cost: Number(m.unit_price * 0.6 || 0),
              sku: m.invima_registration || '',
              stock: realStock,
              category: 'Farmacia 💊',
              unit_type: 'unit',
              warehouse_id,
              is_pharmacy: true,
              generic_name: m.generic_name,
              concentration: m.concentration,
              laboratory: m.laboratory,
              unit_price: Number(m.unit_price || 0),
              blister_price: m.blister_price ? Number(m.blister_price) : null,
              box_price: m.box_price ? Number(m.box_price) : null,
              units_per_box: Number(m.units_per_box || 1),
              units_per_blister: Number(m.units_per_blister || 1),
              prescription_type: m.prescription_type || (m.is_controlled ? 'controlled' : m.requires_prescription ? 'rx' : 'otc')
            })
          })
        }

        setProducts(loadedProducts)
        const cats = ['Todos', ...Array.from(new Set(loadedProducts.map(p => p.category)))]
        setCategories(cats)
        localStorage.setItem('mr_tender_cached_products', JSON.stringify(loadedProducts))
      } catch (err: any) {
        console.error('Error loading POS data:', err)
        setError('Error al cargar datos del POS')

        const cached = localStorage.getItem('mr_tender_cached_products')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setProducts(parsed)
            setCategories(['Todos', ...Array.from(new Set(parsed.map((p: any) => p.category))) as string[]])
          } catch {}
        }
      }
    }

    loadData()
  }, [])

  const filtered = search.trim() === '' ? [] : products.filter(p => {
    const matchCat = category === 'Todos' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const addToCart = useCallback((product: Product, quantity = 1) => {
    playSound('beep')
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        const newQty = existing.quantity + quantity
        return prev.map(i => i.id === product.id
          ? { ...i, quantity: newQty, lineTotal: newQty * i.price * (1 - i.discount / 100) }
          : i
        )
      }
      return [...prev, { ...product, quantity, discount: 0, lineTotal: quantity * product.price }]
    })
  }, [])

  const updateQty = (id: string, qty: number) => {
    playSound('tap')
    if (qty <= 0) { removeFromCart(id); return }
    const rounded = Math.round(qty * 1000) / 1000
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: rounded, lineTotal: rounded * i.price * (1 - i.discount / 100) } : i))
  }

  const removeFromCart = (id: string) => {
    playSound('tap')
    setCart(prev => prev.filter(i => i.id !== id))
  }

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0)
  const discountAmt = subtotal * (discount / 100)
  const total = subtotal - discountAmt
  const change = paymentMethod === 'cash' ? Math.max(0, (Number(receivedAmount) || 0) - total) : 0

  // Hold / Pause Current Cart
  function holdCurrentCart() {
    if (cart.length === 0) return
    playSound('tap')
    const newHeld: HeldCart = {
      id: 'HELD-' + Date.now(),
      label: selectedCustomer ? selectedCustomer.full_name : `Ticket ${heldCarts.length + 1}`,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      discount,
      customer: selectedCustomer,
      total
    }
    const updated = [newHeld, ...heldCarts]
    setHeldCarts(updated)
    localStorage.setItem('mr_tender_held_carts', JSON.stringify(updated))
    setCart([])
    setDiscount(0)
    setSelectedCustomer(null)
  }

  function resumeHeldCart(held: HeldCart) {
    playSound('tap')
    setCart(held.cart)
    setDiscount(held.discount)
    setSelectedCustomer(held.customer)
    const updated = heldCarts.filter(h => h.id !== held.id)
    setHeldCarts(updated)
    localStorage.setItem('mr_tender_held_carts', JSON.stringify(updated))
    setShowHeldModal(false)
  }

  function deleteHeldCart(id: string) {
    playSound('tap')
    const updated = heldCarts.filter(h => h.id !== id)
    setHeldCarts(updated)
    localStorage.setItem('mr_tender_held_carts', JSON.stringify(updated))
  }

  // Handle Touch Numpad (Instant overwrite on first keypress)
  function handleNumpadKey(key: string) {
    playSound('tap')
    if (key === 'C') {
      setReceivedAmount('')
      setIsFirstNumpadKey(false)
    } else if (key === 'back') {
      setReceivedAmount(prev => prev.slice(0, -1))
      setIsFirstNumpadKey(false)
    } else if (key === 'exact') {
      setReceivedAmount(String(total))
      setIsFirstNumpadKey(true)
    } else if (key === '00') {
      if (isFirstNumpadKey) {
        setReceivedAmount('')
        setIsFirstNumpadKey(false)
        return
      }
      if (!receivedAmount || receivedAmount === '0') return
      setReceivedAmount(prev => (prev + '00').slice(0, 9))
    } else {
      // Numerical digit ('0' - '9')
      if (isFirstNumpadKey) {
        setReceivedAmount(key)
        setIsFirstNumpadKey(false)
      } else {
        setReceivedAmount(prev => {
          if (!prev || prev === '0') return key
          return (prev + key).slice(0, 9)
        })
      }
    }
  }

  // Handle Barcode scan in POS
  function handleCameraScan(code: string) {
    const cleanCode = code.trim()
    setSearch(cleanCode)

    const foundInInventory = products.find(p => p.sku === cleanCode || p.name.toLowerCase().includes(cleanCode.toLowerCase()))
    if (foundInInventory) {
      if (foundInInventory.unit_type !== 'unit') {
        setWeighingProduct(foundInInventory)
      } else {
        addToCart(foundInInventory)
      }
      return { found: true, name: foundInInventory.name, price: foundInInventory.price, sku: foundInInventory.sku }
    }

    const master = findMasterProduct(cleanCode)
    setExpressForm({
      name: master ? master.name : '',
      sku: cleanCode,
      price: master ? String(master.suggestedPrice) : '',
      cost: master ? String(master.suggestedCost) : '',
      stock: '10'
    })
    setShowScanner(false)
    setShowExpressModal(true)
    return {
      found: false,
      name: master ? master.name : `Producto nuevo (${cleanCode})`,
      price: master ? master.suggestedPrice : 0,
      sku: cleanCode,
      isExpress: true
    }
  }

  // Create Express Product
  async function handleCreateExpressProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!expressForm.name.trim() || !expressForm.price || !sessionInfo) return
    setCreatingExpress(true)
    try {
      const price = parseFloat(expressForm.price) || 0
      const cost = parseFloat(expressForm.cost) || price * 0.75
      const stock = parseFloat(expressForm.stock) || 1

      // 1. Insert product
      const { data: newProd, error: pErr } = await supabase
        .from('products')
        .insert([{
          tenant_id: sessionInfo.tenant_id,
          name: expressForm.name.trim(),
          sku: expressForm.sku.trim() || 'EX-' + Date.now().toString().slice(-6),
          barcode: expressForm.sku.trim() || null,
          sale_price: price,
          cost_price: cost,
          min_stock: 3,
          max_stock: 50,
          tax_rate: defaultTaxRate,
          is_active: true
        }])
        .select()
        .single()

      if (pErr) throw pErr

      // 2. Insert inventory
      if (sessionInfo.warehouse_id && newProd) {
        await supabase
          .from('inventory')
          .insert([{
            tenant_id: sessionInfo.tenant_id,
            warehouse_id: sessionInfo.warehouse_id,
            product_id: newProd.id,
            quantity: stock,
            avg_cost: cost
          }])
      }

      const created: Product = {
        id: newProd.id,
        name: newProd.name,
        price,
        cost,
        sku: newProd.sku || '',
        stock,
        category: 'General',
        unit_type: 'unit',
        tax_rate: defaultTaxRate,
        warehouse_id: sessionInfo.warehouse_id
      }

      setProducts(prev => [created, ...prev])
      addToCart(created)
      setShowExpressModal(false)
      setSearch('')
    } catch (err: any) {
      console.error('Error creating express product:', err)
      alert(err.message || 'No se pudo registrar el producto')
    } finally {
      setCreatingExpress(false)
    }
  }

  async function processSale() {
    if (!sessionInfo) return
    setError('')

    // Block sale if cash register (caja) is closed
    if (!sessionInfo.session_id) {
      setError('La caja esta cerrada. Abre un turno de caja en la seccion Caja y Turnos antes de realizar ventas.')
      playSound('error')
      return
    }

    if (paymentMethod === 'fiao') {
      if (!selectedCustomer) {
        setError('Debes seleccionar un cliente para fiar la compra')
        playSound('error')
        return
      }
      const limit = Number(selectedCustomer.credit_limit || 0)
      const used = Number(selectedCustomer.credit_used || 0)
      const available = limit - used

      if (total > available) {
        setError(`Cupo insuficiente. Disponible: ${formatCurrency(available)} (Cupo: ${formatCurrency(limit)})`)
        playSound('error')
        return
      }
    }

    if (paymentMethod === 'transfer') {
      if (!transferRef.trim()) {
        setError('Ingresa el nÃºmero de comprobante Nequi/Daviplata')
        playSound('error')
        return
      }
    }

    setLoading(true)

    const itemsPayload = cart.map(item => {
      const rate = item.tax_rate !== undefined ? Number(item.tax_rate) : defaultTaxRate
      const lineTotal = item.lineTotal
      const itemNetSubtotal = rate > 0 ? (lineTotal / (1 + rate / 100)) : lineTotal
      const itemTaxAmount = lineTotal - itemNetSubtotal
      const itemDiscountAmt = (item.quantity * item.price) * (item.discount / 100)

      return {
        product_id: item.id,
        variant_id: null,
        product_name: item.name,
        product_sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        original_price: item.price,
        discount_percentage: item.discount,
        discount_amount: itemDiscountAmt,
        tax_rate: rate,
        tax_amount: itemTaxAmount,
        subtotal: itemNetSubtotal,
        total: lineTotal,
        cost_price: item.cost,
        warehouse_id: sessionInfo.warehouse_id
      }
    })

    const calculatedTaxAmount = itemsPayload.reduce((sum, it) => sum + it.tax_amount, 0)
    const calculatedSubtotal = (total - calculatedTaxAmount) + discountAmt

    const offlineId = 'OFF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)

    const salePayload = {
      tenant_id: sessionInfo.tenant_id,
      seller_id: sessionInfo.user_id,
      register_id: sessionInfo.register_id,
      session_id: sessionInfo.session_id,
      branch_id: sessionInfo.branch_id,
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      subtotal: calculatedSubtotal,
      discount_amount: discountAmt,
      tax_amount: calculatedTaxAmount,
      tip_amount: 0,
      total,
      change_amount: change,
      points_redeemed: 0,
      offline_id: offlineId,
      items: itemsPayload,
      payments: [
        {
          payment_method: paymentMethod,
          amount: total,
          received_amount: paymentMethod === 'cash' ? (Number(receivedAmount) || total) : total,
          change_amount: change,
          reference: paymentMethod === 'transfer' ? transferRef.trim() : null
        }
      ]
    }

    try {
      if (!navigator.onLine) {
        const savedQueue = JSON.parse(localStorage.getItem('mr_tender_offline_sales') || '[]')
        savedQueue.push({ offline_id: offlineId, payload: salePayload, created_at: new Date().toISOString() })
        localStorage.setItem('mr_tender_offline_sales', JSON.stringify(savedQueue))
        setPendingSyncCount(savedQueue.length)

        setSaleNumber(offlineId)
        playSound('success')
        setStep('done')
        return
      }

      const { data, error: rpcErr } = await supabase.rpc('process_sale', { p_sale_data: salePayload })
      if (rpcErr) throw rpcErr
      if (data && data.success === false) throw new Error(data.error)

      setSaleNumber(data.number)
      playSound('success')
      
      if (paymentMethod === 'fiao' && selectedCustomer) {
        const newCreditUsed = Number(selectedCustomer.credit_used || 0) + total
        setCustomerList(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, credit_used: newCreditUsed } : c))
        setSelectedCustomer(prev => prev ? { ...prev, credit_used: newCreditUsed } : null)
      }

      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(ci => ci.id === p.id)
        return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p
      }))

      setStep('done')
    } catch (err: any) {
      console.error('Error processing sale:', err)
      setError(err.message || 'Error al procesar la venta')
      playSound('error')
    } finally {
      setLoading(false)
    }
  }

  function sendTicketWhatsApp() {
    let rawPhone = selectedCustomer?.phone?.replace(/\D/g, '') || ''
    const itemsText = cart.map(i => `• ${i.quantity}x ${i.name} (${formatCurrency(i.lineTotal)})`).join('\n')
    const message = `*FACTURA POS / TICKET DE COMPRA*
*${businessName}*
Folio: ${saleNumber}
Fecha: ${new Date().toLocaleString('es-CO')}

${itemsText}

TOTAL: ${formatCurrency(total)}
Pago: ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'fiao' ? 'Fiao (Crédito)' : 'Nequi / Daviplata'}
${change > 0 ? `Cambio: ${formatCurrency(change)}` : ''}

¡Muchas gracias por tu compra!`

    if (rawPhone) {
      if (!rawPhone.startsWith('57') && rawPhone.length === 10) rawPhone = '57' + rawPhone
      window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }
  }

  function newSale() {
    setCart([])
    setDiscount(0)
    setPaymentMethod('cash')
    setReceivedAmount('')
    setTransferRef('')
    setSelectedCustomer(null)
    setStep('cart')
  }

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 14 }}>
        
        {/* Printable Ticket Receipt */}
        <div id="pos-ticket" className="neu-card animate-scale-in" style={{ background: '#fff', color: '#0F172A', padding: '20px 16px', borderRadius: 16, width: '100%', maxWidth: 360, margin: '0 auto 16px', fontFamily: 'monospace', fontSize: '0.8rem', border: '1px solid #CBD5E1', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 10, borderBottom: '1px dashed #94A3B8', paddingBottom: 8 }}>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{businessName}</div>
            <div style={{ fontSize: '0.68rem', color: '#475569' }}>NIT: 901.234.567-1 - Reg. DIAN</div>
            <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Res. DIAN 18760000001 (SETP-1 al SETP-5000)</div>
            <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>{new Date().toLocaleString('es-CO')}</div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', marginTop: 4, color: '#1E293B' }}>Factura POS NÂº: {saleNumber}</div>
          </div>

          {selectedCustomer && (
            <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6, fontSize: '0.75rem' }}>
              <div><strong>Cliente:</strong> {selectedCustomer.full_name}</div>
              {selectedCustomer.phone && <div><strong>Tel:</strong> {selectedCustomer.phone}</div>}
            </div>
          )}

          <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 4, marginBottom: 4, fontSize: '0.72rem' }}>
              <span>Cant/Producto</span>
              <span style={{ textAlign: 'right' }}>P.Unit</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 3, fontSize: '0.75rem' }}>
                <div>{item.quantity} {item.unit_type === 'unit' ? 'x' : item.unit_type} {item.name}</div>
                <div style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</div>
                <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--accent-coral)' }}>
                <span>Descuento ({discount}%):</span>
                <span>-{formatCurrency(discountAmt)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}>
              <span>IVA Estimado Incluido:</span>
              <span>{formatCurrency(cart.reduce((sum, item) => {
                const r = item.tax_rate !== undefined ? Number(item.tax_rate) : defaultTaxRate
                const base = r > 0 ? (item.lineTotal / (1 + r / 100)) : item.lineTotal
                return sum + (item.lineTotal - base)
              }, 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', marginTop: 2 }}><span>TOTAL:</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(total)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginTop: 1 }}>
              <span>Pago:</span>
              <span style={{ fontWeight: 800 }}>{paymentMethod === 'cash' ? 'EFECTIVO' : paymentMethod === 'fiao' ? 'FIAO (CRÉDITO)' : paymentMethod === 'transfer' ? 'NEQUI / TRANSFERENCIA' : 'TARJETA'}</span>
            </div>
            {change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 800 }}><span>Cambio:</span><span>{formatCurrency(change)}</span></div>}
          </div>

          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=CUFE-DIAN-${saleNumber}`} alt="QR DIAN" style={{ width: 60, height: 60, margin: '0 auto 2px' }} />
            <div style={{ fontSize: '0.55rem', color: '#94A3B8', wordBreak: 'break-all' }}>
              CUFE: c89f2a01490b8e7c102a99182bc837d7a1290317
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: 2, color: '#475569' }}>
              Â¡Gracias por su compra en {businessName}!
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 360, width: '100%', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-neu" onClick={() => window.print()} style={{ flex: 1, padding: '10px', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={15} strokeWidth={2} />
              <span>Imprimir</span>
            </button>
            <button className="btn-neu" onClick={sendTicketWhatsApp} style={{ flex: 1, padding: '10px', fontSize: '0.82rem', background: '#25D366', color: '#fff', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={15} strokeWidth={2} />
              <span>WhatsApp</span>
            </button>
          </div>
          <button className="btn-neu btn-primary" onClick={newSale} style={{ padding: '12px', fontSize: '0.9rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Nueva venta</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>

      {/* Caja Cerrada Banner */}
      {sessionInfo && !sessionInfo.session_id && (
        <div style={{ background: '#FEE2E2', borderBottom: '2px solid #FECACA', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: '1.1rem' }}>&#128274;</span>
          <span style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.88rem' }}>
            Caja cerrada &mdash; Debes abrir un turno en <strong>Caja y Turnos</strong> antes de realizar ventas.
          </span>
        </div>
      )}

      {/* â”€â”€ STEP 1: CART & PRODUCT SEARCH â”€â”€ */}
      {step === 'cart' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, height: '100%', overflow: 'hidden' }}>

          {/* LEFT: Products Search Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
            
            {/* Search, Scanner, Voice POS, Express & Held Carts Badge */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
                <input className="input-neu" placeholder="Buscar producto o código..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{ fontSize: '0.85rem' }} />
              </div>
              
              <button
                className="btn-neu"
                onClick={() => setShowVoiceHUD(prev => !prev)}
                title="Audio-POS por Voz Natural (Presiona V)"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 800,
                  background: showVoiceHUD ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  color: '#fff',
                  boxShadow: showVoiceHUD ? '0 0 14px rgba(239, 68, 68, 0.5)' : '0 2px 8px rgba(59, 130, 246, 0.3)'
                }}
              >
                <Mic size={15} strokeWidth={2.5} />
                <span>Voz AI</span>
              </button>

              <button className="btn-neu btn-primary" onClick={() => setShowScanner(true)} title="Escanear código de barras" style={{ padding: '8px 10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Camera size={15} strokeWidth={2} />
                <span>Escanear</span>
              </button>

              <button className="btn-neu" onClick={() => { setExpressForm({ name: search, sku: '', price: '', cost: '', stock: '10' }); setShowExpressModal(true); }} title="Crear producto rápido" style={{ padding: '8px 10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <PlusCircle size={15} style={{ color: 'var(--accent-blue)' }} />
                <span>Crear</span>
              </button>

              {heldCarts.length > 0 && (
                <button className="btn-neu" onClick={() => setShowHeldModal(true)} title="Ver carritos en espera" style={{ padding: '8px 10px', fontSize: '0.78rem', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PlayCircle size={15} />
                  <span>{heldCarts.length}</span>
                </button>
              )}

              {!isOnline && (
                <span className="badge badge-amber" title="Modo Offline" style={{ padding: '6px', fontSize: '0.7rem' }}>
                  <WifiOff size={13} />
                </span>
              )}
            </div>

            {/* Smart Generic Suggestions Banner */}
            {search.trim() !== '' && (() => {
              const q = search.toLowerCase()
              const matchedMed = products.find(p => p.is_pharmacy && p.generic_name && (p.name.toLowerCase().includes(q) || p.generic_name.toLowerCase().includes(q)))
              if (!matchedMed?.generic_name) return null
              const alternatives = products.filter(p => p.is_pharmacy && p.generic_name?.toLowerCase() === matchedMed.generic_name?.toLowerCase())
              if (alternatives.length <= 1) return null

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(139,114,190,0.08)', borderRadius: 10, border: '1px solid rgba(139,114,190,0.25)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-purple)' }}>💡 Alternativas con {matchedMed.generic_name}:</span>
                  {alternatives.map(alt => (
                    <button
                      key={alt.id}
                      onClick={() => {
                        if (alt.is_pharmacy && (alt.blister_price || alt.box_price)) {
                          setSelectedFractionProduct(alt)
                        } else {
                          addToCart(alt)
                        }
                      }}
                      className="btn-neu"
                      style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#fff', color: 'var(--text-primary)', fontWeight: 700 }}
                    >
                      {alt.laboratory || alt.name.split(' ')[0]}: {formatCurrency(alt.price)}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Categories */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {categories.map(c => (
                <button key={c} className="btn-neu" onClick={() => setCategory(c)}
                  style={{ padding: '5px 10px', fontSize: '0.72rem', background: category === c ? 'var(--accent-blue)' : 'var(--bg)', color: category === c ? '#fff' : 'var(--text-secondary)', boxShadow: category === c ? '4px 4px 10px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Product grid results */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, alignContent: 'start', paddingRight: 4 }}>
              {filtered.map(product => (
                <button key={product.id} className="pos-product-btn" onClick={() => {
                  if (product.is_pharmacy && (product.blister_price || product.box_price)) {
                    setSelectedFractionProduct(product)
                  } else if (product.unit_type !== 'unit') {
                    setWeighingProduct(product)
                  } else {
                    addToCart(product)
                  }
                }} style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
                  
                  {product.unit_type !== 'unit' && (
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', fontSize: '0.62rem', fontWeight: 800, padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Scale size={10} /> {product.unit_type}
                    </span>
                  )}

                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px' }}>
                    <Package size={18} strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 2 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(product.price)}</span>
                    <span style={{ fontSize: '0.62rem', color: product.stock <= 5 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>{product.stock} u</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
                  <Search size={28} strokeWidth={1.5} style={{ margin: '0 auto 6px', color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: '0.8rem' }}>{search.trim() === '' ? 'Escribe o escanea un producto para buscar' : 'No se encontraron coincidencias'}</div>
                  {search.trim() !== '' && (
                    <button className="btn-neu btn-primary" onClick={() => { setExpressForm({ name: search, sku: '', price: '', cost: '', stock: '10' }); setShowExpressModal(true); }} style={{ margin: '10px auto 0', padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <PlusCircle size={14} />
                      <span>Registrar "{search}" ahora</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Minimalist High-Density Cart */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="neu-card">
            {/* Cart header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bg-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                <ShoppingCart size={15} strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
                <span>Carrito ({cart.reduce((s, i) => s + (i.unit_type === 'unit' ? i.quantity : 1), 0)})</span>
              </div>
              
              <div style={{ display: 'flex', gap: 6 }}>
                {cart.length > 0 && (
                  <>
                    <button className="btn-neu" onClick={holdCurrentCart} title="Poner en espera para atender a otro cliente" style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-amber)' }}>
                      <PauseCircle size={13} />
                      <span>En espera</span>
                    </button>
                    <button className="btn-neu btn-ghost" onClick={() => setCart([])} style={{ padding: '3px 8px', fontSize: '0.72rem', color: 'var(--accent-coral)' }}>Limpiar</button>
                  </>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 16px', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: '0.82rem' }}>Escanea o busca productos para aÃ±adirlos</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cart.map(item => (
                    <div key={item.id} className="neu-flat" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {formatCurrency(item.price)} {item.unit_type !== 'unit' ? `x ${item.unit_type}` : 'c/u'}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                        <button className="btn-neu btn-icon-sm" onClick={() => updateQty(item.id, item.quantity - (item.unit_type !== 'unit' ? 0.25 : 1))} style={{ width: 22, height: 22, minWidth: 22, padding: 0, fontSize: '0.8rem', fontWeight: 800 }}>-</button>
                        <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                          {item.quantity}{item.unit_type !== 'unit' ? item.unit_type : ''}
                        </span>
                        <button className="btn-neu btn-icon-sm btn-primary" onClick={() => updateQty(item.id, item.quantity + (item.unit_type !== 'unit' ? 0.25 : 1))} style={{ width: 22, height: 22, minWidth: 22, padding: 0, fontSize: '0.8rem', fontWeight: 800 }}>+</button>
                      </div>

                      {/* Line Total */}
                      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-blue)' }}>{formatCurrency(item.lineTotal)}</div>
                      </div>

                      <button onClick={() => removeFromCart(item.id)} style={{ padding: '2px', color: 'var(--accent-coral)', background: 'none', border: 'none', cursor: 'pointer' }} title="Quitar">
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Input */}
            {cart.length > 0 && (
              <div style={{ padding: '6px 14px', borderTop: '1px solid var(--bg-deep)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Descuento %</span>
                  <input className="input-neu" type="number" min={0} max={100} value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" style={{ padding: '4px 8px', fontSize: '0.8rem' }} />
                </div>
              </div>
            )}

            {/* Totals & Checkout Button */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bg-deep)', background: 'var(--bg-deep)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--accent-coral)' }}>
                    <span>Descuento ({discount}%)</span><span>-{formatCurrency(discountAmt)}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  <span>Total</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(total)}</span>
                </div>
              </div>
              <button className="btn-neu btn-primary" disabled={cart.length === 0 || !sessionInfo?.session_id} onClick={() => { setReceivedAmount(String(total)); setIsFirstNumpadKey(true); setStep('payment'); playSound('tap'); }} style={{ width: '100%', padding: '12px', fontSize: '0.9rem', justifyContent: 'center' }}>
                Cobrar {formatCurrency(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ STEP 2: INSTANT FULL-SCREEN TOUCH NUMPAD CHECKOUT (ZERO SCROLL) â”€â”€ */}
      {step === 'payment' && (
        <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px', boxSizing: 'border-box' }}>
          
          {/* Top Row: Back & Total Display */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexShrink: 0 }}>
            <button className="btn-neu btn-ghost" onClick={() => setStep('cart')} style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={14} />
              <span>Volver</span>
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total a Cobrar</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-blue)', lineHeight: 1 }}>{formatCurrency(total)}</div>
            </div>
          </div>

          {/* Quick Selectors Row (Cliente + MÃ©todo) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8, marginBottom: 8, flexShrink: 0 }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Cliente</label>
              <select className="input-neu" value={selectedCustomer?.id || ''} onChange={e => {
                const found = customerList.find(c => c.id === e.target.value)
                setSelectedCustomer(found || null)
                setError('')
              }} style={{ fontSize: '0.78rem', width: '100%', padding: '6px 8px' }}>
                <option value="">-- General --</option>
                {customerList.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} (${c.credit_used})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>MÃ©todo</label>
              <select className="input-neu" value={paymentMethod} onChange={e => {
                setPaymentMethod(e.target.value)
                setError('')
              }} style={{ fontSize: '0.78rem', fontWeight: 700, width: '100%', padding: '6px 8px' }}>
                <option value="cash">ðŸ’µ Efectivo</option>
                <option value="transfer">ðŸ“± Nequi</option>
                <option value="fiao">ðŸ“ Fiar</option>
                <option value="card_debit">ðŸ’³ DÃ©bito</option>
                <option value="card_credit">ðŸ’³ CrÃ©dito</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, overflow: 'hidden' }}>
            
            {/* CASH: Display + Touch Numpad */}
            {paymentMethod === 'cash' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                <div style={{ background: 'var(--bg-deep)', padding: '8px 10px', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Efectivo Recibido
                    </div>
                    <div style={{ fontSize: receivedAmount && receivedAmount.length > 7 ? '1rem' : '1.15rem', fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {receivedAmount ? formatCurrency(Number(receivedAmount)) : '$0'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 0 }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Cambio / Vueltos
                    </div>
                    <div style={{ fontSize: formatCurrency(change).length > 8 ? '1rem' : '1.15rem', fontWeight: 900, color: change >= 0 && Number(receivedAmount) >= total ? 'var(--accent-green)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatCurrency(change)}
                    </div>
                  </div>
                </div>

                {/* Fast Denomination Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, flexShrink: 0 }}>
                  <button type="button" className="btn-neu" onClick={() => handleNumpadKey('exact')} style={{ padding: '6px 2px', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', color: 'var(--accent-blue)' }}>
                    Exacto
                  </button>
                  {[5000, 10000, 20000, 50000].map(amt => (
                    <button key={amt} type="button" className="btn-neu" onClick={() => { setReceivedAmount(String(amt)); setIsFirstNumpadKey(true); playSound('tap'); }} style={{ padding: '6px 2px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>
                      ${amt / 1000}k
                    </button>
                  ))}
                </div>

                {/* Integrated 3x4 Touch Numpad Grid */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, minHeight: 0 }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleNumpadKey(k)}
                      className="btn-neu"
                      style={{ fontSize: k === 'back' ? '1rem' : '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      {k === 'back' ? <Delete size={18} /> : k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NEQUI / DAVIPLATA (Real Merchant Phone) */}
            {paymentMethod === 'transfer' && (
              <div style={{ background: 'var(--accent-purple-lt)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Smartphone size={16} /> Nequi: {merchantPhone}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--accent-purple)' }}>{formatCurrency(total)}</span>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, margin: '0 auto' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=Nequi-Pagar-${merchantPhone}-${total}`} alt="QR" style={{ width: 85, height: 85 }} />
                  <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>Pagar a {merchantPhone}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>NÂº de Comprobante / AprobaciÃ³n *</label>
                  <input className="input-neu" placeholder="Ej: 987654" value={transferRef} onChange={e => { setTransferRef(e.target.value); setError(''); }} autoFocus required style={{ fontWeight: 700, padding: '8px 10px', fontSize: '0.85rem', width: '100%' }} />
                </div>
              </div>
            )}

            {/* FIAO */}
            {paymentMethod === 'fiao' && (
              <div style={{ background: selectedCustomer ? 'var(--accent-blue-lt)' : 'var(--accent-coral-lt)', padding: '12px', borderRadius: 'var(--radius-md)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {selectedCustomer ? (
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-blue)' }}>Fiar a: {selectedCustomer.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                      Deuda actual: <strong>{formatCurrency(selectedCustomer.credit_used)}</strong><br />
                      Cupo disponible: <strong>{formatCurrency(selectedCustomer.credit_limit - selectedCustomer.credit_used)}</strong> de {formatCurrency(selectedCustomer.credit_limit)}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-coral)', fontWeight: 700 }}>
                    Selecciona un cliente en la parte superior para habilitar el fiao.
                  </div>
                )}
              </div>
            )}

            {/* CARDS */}
            {(paymentMethod === 'card_debit' || paymentMethod === 'card_credit') && (
              <div style={{ background: 'var(--bg-deep)', padding: '16px', borderRadius: 'var(--radius-md)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <CreditCard size={32} style={{ color: 'var(--accent-blue)' }} />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>DatÃ¡fono / Datafono POS</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pasa la tarjeta en el datÃ¡fono por <strong>{formatCurrency(total)}</strong></div>
              </div>
            )}

            {error && (
              <div style={{ background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                {error}
              </div>
            )}
          </div>

          {/* Confirm Button Always Pinned at Bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 6, flexShrink: 0 }}>
            <button className="btn-neu btn-success" onClick={processSale} disabled={loading || !sessionInfo?.session_id || (paymentMethod === 'cash' && Number(receivedAmount) < total && receivedAmount !== '') || (paymentMethod === 'fiao' && !selectedCustomer) || (paymentMethod === 'transfer' && !transferRef.trim())}
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800, justifyContent: 'center' }}>
              {loading ? 'Procesando...' : paymentMethod === 'fiao' ? `Confirmar Fiao (${formatCurrency(total)})` : paymentMethod === 'transfer' ? `Confirmar Nequi (${formatCurrency(total)})` : 'Confirmar pago'}
            </button>
          </div>

        </div>
      )}

      {/* â”€â”€ MODAL: HELD CARTS (Pausar Venta) â”€â”€ */}
      {showHeldModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                <PauseCircle size={18} style={{ color: 'var(--accent-amber)' }} />
                <span>Carritos en Espera ({heldCarts.length})</span>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowHeldModal(false)} style={{ padding: '2px 6px' }}>âœ•</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {heldCarts.map(held => (
                <div key={held.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>{held.label}</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{held.time} â€¢ {held.cart.length} productos</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>{formatCurrency(held.total)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-neu btn-ghost" onClick={() => deleteHeldCart(held.id)} style={{ padding: '6px 8px', color: 'var(--accent-coral)' }}>
                      <X size={14} />
                    </button>
                    <button className="btn-neu btn-primary" onClick={() => resumeHeldCart(held)} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      Retomar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: EXPRESS PRODUCT CREATION â”€â”€ */}
      {showExpressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateExpressProduct} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <PlusCircle size={20} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Registrar Producto Express</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre del Producto *</label>
                <input className="input-neu" placeholder="Ej: Arroz Diana 500g" value={expressForm.name} onChange={e => setExpressForm({ ...expressForm, name: e.target.value })} required autoFocus style={{ fontSize: '0.85rem' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Venta $ *</label>
                  <input className="input-neu" type="number" step="100" placeholder="2500" value={expressForm.price} onChange={e => setExpressForm({ ...expressForm, price: e.target.value })} required style={{ fontSize: '0.95rem', fontWeight: 800 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Costo $ (Opcional)</label>
                  <input className="input-neu" type="number" step="100" placeholder="1800" value={expressForm.cost} onChange={e => setExpressForm({ ...expressForm, cost: e.target.value })} style={{ fontSize: '0.85rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>CÃ³digo / EAN</label>
                  <input className="input-neu" placeholder="770..." value={expressForm.sku} onChange={e => setExpressForm({ ...expressForm, sku: e.target.value })} style={{ fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Stock Inicial</label>
                  <input className="input-neu" type="number" value={expressForm.stock} onChange={e => setExpressForm({ ...expressForm, stock: e.target.value })} style={{ fontSize: '0.85rem', fontWeight: 700 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-neu" onClick={() => setShowExpressModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={creatingExpress} style={{ flex: 1, padding: 10 }}>
                {creatingExpress ? 'Guardando...' : 'Guardar y Vender'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* â”€â”€ MODAL: WEIGHED PRODUCT PICKER â”€â”€ */}
      {weighingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 360, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Scale size={20} style={{ color: 'var(--accent-purple)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Venta por Peso / Granel</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              <strong>{weighingProduct.name}</strong> ({formatCurrency(weighingProduct.price)} x {weighingProduct.unit_type})
            </p>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Cantidad ({weighingProduct.unit_type})
              </label>
              <input
                className="input-neu"
                type="number"
                step="0.05"
                min="0.05"
                value={weightValue}
                onChange={e => setWeightValue(e.target.value)}
                autoFocus
                style={{ fontSize: '1.2rem', fontWeight: 900, textAlign: 'center', width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 8 }}>
              {['0.25', '0.5', '1', '2'].map(w => (
                <button key={w} type="button" className="btn-neu" onClick={() => setWeightValue(w)} style={{ padding: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {w} {weighingProduct.unit_type}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total a cobrar:</span>
              <strong style={{ fontSize: '1rem', color: 'var(--accent-blue)' }}>
                {formatCurrency(Number(weightValue || 0) * weighingProduct.price)}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-neu" onClick={() => setWeighingProduct(null)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="button" className="btn-neu btn-primary" onClick={() => {
                addToCart(weighingProduct, parseFloat(weightValue) || 1)
                setWeighingProduct(null)
              }} style={{ flex: 1, padding: 10 }}>
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PHARMACY FRACTION SELECTOR */}
      {selectedFractionProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  💊 {selectedFractionProduct.name.split('(')[0].trim()}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600 }}>
                  {selectedFractionProduct.generic_name} {selectedFractionProduct.concentration} • {selectedFractionProduct.laboratory || 'Genérico'}
                </div>
              </div>
              <button onClick={() => setSelectedFractionProduct(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Selecciona la presentación que desea el cliente:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Option 1: Unit / Pastilla */}
              <button
                onClick={() => {
                  addToCart({
                    ...selectedFractionProduct,
                    name: `${selectedFractionProduct.name.split('(')[0].trim()} (Unidad/Pastilla)`,
                    price: selectedFractionProduct.unit_price || selectedFractionProduct.price
                  })
                  setSelectedFractionProduct(null)
                }}
                className="btn-neu"
                style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🔘</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>1 Pastilla / Unidad Suelta</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Venta fraccionada</div>
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
                  {formatCurrency(selectedFractionProduct.unit_price || selectedFractionProduct.price)}
                </span>
              </button>

              {/* Option 2: Blíster */}
              {selectedFractionProduct.blister_price && (
                <button
                  onClick={() => {
                    addToCart({
                      ...selectedFractionProduct,
                      name: `${selectedFractionProduct.name.split('(')[0].trim()} (Blíster x${selectedFractionProduct.units_per_blister || 10})`,
                      price: selectedFractionProduct.blister_price!
                    })
                    setSelectedFractionProduct(null)
                  }}
                  className="btn-neu"
                  style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>💊</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>1 Blíster (x{selectedFractionProduct.units_per_blister || 10} uds)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tira completa</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                    {formatCurrency(selectedFractionProduct.blister_price)}
                  </span>
                </button>
              )}

              {/* Option 3: Caja Completa */}
              {selectedFractionProduct.box_price && (
                <button
                  onClick={() => {
                    addToCart({
                      ...selectedFractionProduct,
                      name: `${selectedFractionProduct.name.split('(')[0].trim()} (Caja x${selectedFractionProduct.units_per_box || 30})`,
                      price: selectedFractionProduct.box_price!
                    })
                    setSelectedFractionProduct(null)
                  }}
                  className="btn-neu"
                  style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>📦</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>1 Caja Completa (x{selectedFractionProduct.units_per_box || 30} uds)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empaque original</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent-purple)', fontSize: '0.95rem' }}>
                    {formatCurrency(selectedFractionProduct.box_price)}
                  </span>
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedFractionProduct(null)}
              className="btn-neu btn-ghost"
              style={{ width: '100%', padding: '10px', marginTop: 14, fontSize: '0.82rem' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          onScan={(code) => handleCameraScan(code)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Audio-POS Voice HUD */}
      <AudioPosHUD
        isOpen={showVoiceHUD}
        onClose={() => setShowVoiceHUD(false)}
        products={products}
        customers={customerList}
        onAddItems={handleVoiceAddItems}
        onSelectCustomer={handleVoiceSelectCustomer}
        onSetPaymentMethod={handleVoiceSetPaymentMethod}
        onSetReceivedAmount={handleVoiceSetReceivedAmount}
        onClearCart={handleVoiceClearCart}
      />
    </div>
  )
}



