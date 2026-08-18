'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import CameraScanner from '@/components/CameraScanner'
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
  Wifi
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
  unit_type?: string // 'unit' | 'kg' | 'lb' | 'g'
  category_id?: string
  warehouse_id?: string
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

export default function POSClient() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [transferRef, setTransferRef] = useState('')
  const [step, setStep] = useState<'cart' | 'payment' | 'done'>('cart')
  const [loading, setLoading] = useState(false)
  const [saleNumber, setSaleNumber] = useState('')
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [businessName, setBusinessName] = useState('MI TIENDA')
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  // Weighed product modal
  const [weighingProduct, setWeighingProduct] = useState<Product | null>(null)
  const [weightValue, setWeightValue] = useState('0.5')

  // Customers state
  const [customerList, setCustomerList] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

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

    // Check existing offline sales in localStorage
    const savedQueue = localStorage.getItem('mr_tender_offline_sales')
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        setPendingSyncCount(parsed.length)
      } catch {}
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync offline sales when back online
  async function syncPendingSales() {
    const savedQueue = localStorage.getItem('mr_tender_offline_sales')
    if (!savedQueue) return
    try {
      const queue = JSON.parse(savedQueue)
      if (queue.length === 0) return

      for (const item of queue) {
        await supabase.rpc('process_sale', { p_sale_data: item.payload })
      }
      localStorage.removeItem('mr_tender_offline_sales')
      setPendingSyncCount(0)
      playSound('success')
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
          .select('business_name')
          .eq('tenant_id', tenant_id)
          .limit(1)

        if (tSettings?.[0]?.business_name) {
          setBusinessName(tSettings[0].business_name)
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

        // Get active cash register session
        const { data: registers } = await supabase
          .from('cash_registers')
          .select('id, current_session_id')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
          .limit(1)
        
        const register_id = registers?.[0]?.id || null
        const session_id = registers?.[0]?.current_session_id || null

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

        // Get products with stock
        const { data: prodData } = await supabase
          .from('products')
          .select(`
            id, name, sale_price, cost_price, sku, barcode, category_id,
            categories (name),
            inventory (quantity, warehouse_id)
          `)
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
        
        if (prodData) {
          const loadedProducts: Product[] = prodData.map((p: any) => {
            const whStock = p.inventory?.find((inv: any) => inv.warehouse_id === warehouse_id)
            const stock = whStock ? Number(whStock.quantity) : 0
            const catName = p.categories?.name || 'General'

            // Detect weighed product by name (fruver, quesos, carnes)
            const isWeighed = /kg|kilo|libra|\blb\b|gramo|\bgr\b|queso|carne|pollo|fruta|verdura/i.test(p.name)

            return {
              id: p.id,
              name: p.name,
              price: Number(p.sale_price),
              cost: Number(p.cost_price),
              sku: p.sku || p.barcode || '',
              stock,
              category: catName,
              unit_type: isWeighed ? 'lb' : 'unit',
              category_id: p.category_id,
              warehouse_id
            }
          })
          setProducts(loadedProducts)

          const cats = ['Todos', ...Array.from(new Set(loadedProducts.map(p => p.category)))]
          setCategories(cats)

          // Save local backup for offline mode
          localStorage.setItem('mr_tender_cached_products', JSON.stringify(loadedProducts))
        }
      } catch (err: any) {
        console.error('Error loading POS data:', err)
        setError('Error al cargar datos del POS')

        // Try restoring offline cache
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

  // Handle Touch Numpad operations
  function handleNumpadKey(key: string) {
    playSound('tap')
    if (key === 'C') {
      setReceivedAmount('')
    } else if (key === 'back') {
      setReceivedAmount(prev => prev.slice(0, -1))
    } else if (key === 'exact') {
      setReceivedAmount(String(total))
    } else if (key === '00') {
      if (!receivedAmount || receivedAmount === '0') return
      setReceivedAmount(prev => prev + '00')
    } else {
      // number digit
      setReceivedAmount(prev => {
        if (prev === '0') return key
        return (prev + key).slice(0, 9)
      })
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
      return
    }

    const master = findMasterProduct(cleanCode)
    if (master) {
      alert(`Producto detectado: "${master.name}". No está en tu inventario local aún. Puedes registrarlo con la cámara en 'Nuevo Producto'.`)
    }
  }

  async function processSale() {
    if (!sessionInfo) return
    setError('')

    // Validate Fiao method
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

    // Validate Transfer reference
    if (paymentMethod === 'transfer') {
      if (!transferRef.trim()) {
        setError('Ingresa el número de comprobante Nequi/Daviplata')
        playSound('error')
        return
      }
    }

    setLoading(true)

    const salePayload = {
      tenant_id: sessionInfo.tenant_id,
      seller_id: sessionInfo.user_id,
      register_id: sessionInfo.register_id,
      session_id: sessionInfo.session_id,
      branch_id: sessionInfo.branch_id,
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      subtotal,
      discount_amount: discountAmt,
      tax_amount: total * 0.19,
      tip_amount: 0,
      total,
      change_amount: change,
      points_redeemed: 0,
      items: cart.map(item => ({
        product_id: item.id,
        variant_id: null,
        product_name: item.name,
        product_sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        original_price: item.price,
        discount_percentage: item.discount,
        discount_amount: item.lineTotal * (item.discount / 100),
        tax_rate: 19.00,
        tax_amount: item.lineTotal * 0.19,
        subtotal: item.lineTotal / 1.19,
        total: item.lineTotal,
        cost_price: item.cost,
        warehouse_id: sessionInfo.warehouse_id
      })),
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
        // Handle Offline Sale Storage
        const localNumber = 'OFF-' + Math.floor(100000 + Math.random() * 900000)
        const savedQueue = JSON.parse(localStorage.getItem('mr_tender_offline_sales') || '[]')
        savedQueue.push({ payload: salePayload, created_at: new Date().toISOString() })
        localStorage.setItem('mr_tender_offline_sales', JSON.stringify(savedQueue))
        setPendingSyncCount(savedQueue.length)

        setSaleNumber(localNumber)
        playSound('success')
        setStep('done')
        return
      }

      const { data, error: rpcErr } = await supabase.rpc('process_sale', { p_sale_data: salePayload })
      if (rpcErr) throw rpcErr
      if (data && data.success === false) throw new Error(data.error)

      setSaleNumber(data.number)
      playSound('success')
      
      // If payment was Fiao, update customer credit_used
      if (paymentMethod === 'fiao' && selectedCustomer) {
        const newCreditUsed = Number(selectedCustomer.credit_used || 0) + total
        await supabase
          .from('customers')
          .update({
            credit_used: newCreditUsed,
            total_purchases: Number(selectedCustomer.total_purchases || 0) + total,
            total_orders: Number(selectedCustomer.total_orders || 0) + 1,
            last_purchase_at: new Date().toISOString()
          })
          .eq('id', selectedCustomer.id)

        setCustomerList(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, credit_used: newCreditUsed } : c))
        setSelectedCustomer(prev => prev ? { ...prev, credit_used: newCreditUsed } : null)
      }

      // Update local stock
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
            <div style={{ fontWeight: 800, fontSize: '0.85rem', marginTop: 4, color: '#1E293B' }}>Factura POS Nº: {saleNumber}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}><span>IVA Incluido (19%):</span><span>{formatCurrency(total * 0.19)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', marginTop: 2 }}><span>TOTAL:</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(total)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginTop: 1 }}>
              <span>Pago:</span>
              <span style={{ fontWeight: 800 }}>{paymentMethod === 'cash' ? 'EFECTIVO' : paymentMethod === 'fiao' ? 'FIAO (CRÉDITO)' : paymentMethod === 'transfer' ? 'NEQUI' : 'TARJETA'}</span>
            </div>
            {change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 800 }}><span>Cambio:</span><span>{formatCurrency(change)}</span></div>}
          </div>

          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=CUFE-DIAN-${saleNumber}`} alt="QR DIAN" style={{ width: 60, height: 60, margin: '0 auto 2px' }} />
            <div style={{ fontSize: '0.55rem', color: '#94A3B8', wordBreak: 'break-all' }}>
              CUFE: c89f2a01490b8e7c102a99182bc837d7a1290317
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: 2, color: '#475569' }}>
              ¡Gracias por su compra en {businessName}!
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

      {/* ── STEP 1: CART & PRODUCT SEARCH ── */}
      {step === 'cart' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, height: '100%', overflow: 'hidden' }}>

          {/* LEFT: Products Search Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
            
            {/* Search, Scanner & Offline Badge */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
                <input className="input-neu" placeholder="Buscar por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{ fontSize: '0.85rem' }} />
              </div>
              <button className="btn-neu btn-primary" onClick={() => setShowScanner(true)} style={{ padding: '8px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={16} strokeWidth={2} />
                <span>Escanear</span>
              </button>

              {!isOnline && (
                <span className="badge badge-amber" title="Modo Offline Activo" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
                  <WifiOff size={13} />
                  <span>Offline</span>
                </span>
              )}
            </div>

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
                  if (product.unit_type !== 'unit') {
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
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <Search size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: '0.82rem' }}>{search.trim() === '' ? 'Escribe o escanea un producto para buscar' : 'No se encontraron coincidencias'}</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Minimalist High-Density Cart */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="neu-card">
            {/* Cart header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bg-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <ShoppingCart size={16} strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
                <span>Carrito ({cart.reduce((s, i) => s + (i.unit_type === 'unit' ? i.quantity : 1), 0)})</span>
              </div>
              {cart.length > 0 && (
                <button className="btn-neu btn-ghost" onClick={() => setCart([])} style={{ padding: '3px 8px', fontSize: '0.72rem', color: 'var(--accent-coral)' }}>Limpiar</button>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: '0.82rem' }}>Escanea o busca productos para añadirlos</div>
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
                        <button className="btn-neu btn-icon-sm" onClick={() => updateQty(item.id, item.quantity - (item.unit_type !== 'unit' ? 0.25 : 1))} style={{ width: 22, height: 22, minWidth: 22, padding: 0, fontSize: '0.8rem', fontWeight: 800 }}>−</button>
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
              <button className="btn-neu btn-primary" disabled={cart.length === 0} onClick={() => { setReceivedAmount(String(total)); setStep('payment'); playSound('tap'); }} style={{ width: '100%', padding: '12px', fontSize: '0.9rem', justifyContent: 'center' }}>
                Cobrar {formatCurrency(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: INSTANT FULL-SCREEN TOUCH NUMPAD CHECKOUT (ZERO SCROLL) ── */}
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

          {/* Quick Selectors Row (Cliente + Método en 2 columnas compactas) */}
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
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Método</label>
              <select className="input-neu" value={paymentMethod} onChange={e => {
                setPaymentMethod(e.target.value)
                setError('')
              }} style={{ fontSize: '0.78rem', fontWeight: 700, width: '100%', padding: '6px 8px' }}>
                <option value="cash">💵 Efectivo</option>
                <option value="transfer">📱 Nequi</option>
                <option value="fiao">📝 Fiar</option>
                <option value="card_debit">💳 Débito</option>
                <option value="card_credit">💳 Crédito</option>
              </select>
            </div>
          </div>

          {/* Body: Integrated Touch Keypad for Cash or Transfer/Fiao panels */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, overflow: 'hidden' }}>
            
            {/* CASH: Display + Touch Numpad */}
            {paymentMethod === 'cash' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                {/* Cash Received Display & Change */}
                <div style={{ background: 'var(--bg-deep)', padding: '8px 12px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Efectivo Recibido</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {receivedAmount ? formatCurrency(Number(receivedAmount)) : '$0'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cambio / Vueltos</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: change >= 0 && Number(receivedAmount) >= total ? 'var(--accent-green)' : 'var(--text-muted)' }}>
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
                    <button key={amt} type="button" className="btn-neu" onClick={() => { setReceivedAmount(String(amt)); playSound('tap'); }} style={{ padding: '6px 2px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>
                      ${amt / 1000}k
                    </button>
                  ))}
                </div>

                {/* Integrated 3x4 Touch Numpad Grid (No OS keyboard popup) */}
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

            {/* NEQUI / DAVIPLATA */}
            {paymentMethod === 'transfer' && (
              <div style={{ background: 'var(--accent-purple-lt)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Smartphone size={16} /> Nequi / Daviplata
                  </span>
                  <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--accent-purple)' }}>{formatCurrency(total)}</span>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, margin: '0 auto' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=Nequi-${total}`} alt="QR" style={{ width: 85, height: 85 }} />
                  <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>Escanea para pagar</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nº de Comprobante / Aprobación *</label>
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
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Datáfono / Datafono POS</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pasa la tarjeta en el datáfono por <strong>{formatCurrency(total)}</strong></div>
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
            <button className="btn-neu btn-success" onClick={processSale} disabled={loading || (paymentMethod === 'cash' && Number(receivedAmount) < total && receivedAmount !== '') || (paymentMethod === 'fiao' && !selectedCustomer) || (paymentMethod === 'transfer' && !transferRef.trim())}
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800, justifyContent: 'center' }}>
              {loading ? 'Procesando...' : paymentMethod === 'fiao' ? `Confirmar Fiao (${formatCurrency(total)})` : paymentMethod === 'transfer' ? `Confirmar Nequi (${formatCurrency(total)})` : 'Confirmar pago'}
            </button>
          </div>

        </div>
      )}

      {/* ── MODAL: WEIGHED PRODUCT PICKER (KG / LB / G) ── */}
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

            {/* Quick weight chips */}
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

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          onScan={(code) => handleCameraScan(code)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
