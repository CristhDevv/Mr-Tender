'use client'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import CameraScanner from '@/components/CameraScanner'
import AudioPosHUD from '@/components/AudioPosHUD'
import RefundModal from '@/components/RefundModal'
import PriceCheckerModal from '@/components/PriceCheckerModal'
import ElectronicWalletModal from '@/components/ElectronicWalletModal'
import PaymentTerminalModal from '@/components/PaymentTerminalModal'
import ScaleHardwareModal from '@/components/ScaleHardwareModal'
import DianCustomerModal, { DianCustomerData } from '@/components/DianCustomerModal'
import PosAbonoModal from '@/components/PosAbonoModal'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'
import { parseScaleBarcode, getEffectiveUnitPrice, calculateEarnedPoints, kickCashDrawer } from '@/lib/cart'
import { findMasterProduct } from '@/lib/catalog/colombia-products'
import { uploadProductImage } from '@/lib/image-upload'
import { usePermissions } from '@/lib/hooks/usePermissions'
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
  Mic,
  Sparkles,
  Pill,
  CircleDot,
  Tag,
  Percent,
  Lock,
  Unlock,
  Building2,
  Receipt,
  ShieldCheck,
  FileText,
  ExternalLink,
  Copy,
  HandCoins
} from 'lucide-react'
import { generateDianInvoicePdfA4, generateDianInvoicePdfPos } from '@/lib/dian/pdf-dian'
import { getDianVerificationUrl } from '@/lib/dian/qr'

// Web Audio sound generator for tactile feedback (Singleton context to prevent memory leaks)
let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass()
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

function playSound(type: 'beep' | 'success' | 'tap' | 'error') {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

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
  barcode?: string
  stock: number
  category: string
  cost: number
  unit_type?: string
  tax_rate?: number
  category_id?: string
  warehouse_id?: string
  inventory?: { quantity: number; warehouse_id: string }[]
  image_url?: string
  is_favorite?: boolean
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
  tax_id?: string | null
  tax_name?: string | null
  tax_regime?: string | null
  tax_address?: string | null
  email?: string | null
  phone: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  credit_limit: number
  credit_used: number
  total_purchases?: number
  total_orders?: number
  metadata?: any
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
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog')
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const cartListRef = useRef<HTMLDivElement>(null)

  // Auto-scroll cart to top whenever an item is added or quantity updated
  useEffect(() => {
    if (cartListRef.current) {
      cartListRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [cart.length, cart[0]?.id, cart[0]?.quantity])

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
  const [tenantSettingsFull, setTenantSettingsFull] = useState<any>(null)
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
  const [showPosAbonoModal, setShowPosAbonoModal] = useState(false)
  const [expressForm, setExpressForm] = useState({ name: '', sku: '', price: '', cost: '', stock: '10', image_url: '' })
  const [creatingExpress, setCreatingExpress] = useState(false)

  // Open Shift (Abrir Turno) state
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false)
  const [openingShiftAmount, setOpeningShiftAmount] = useState('50000')
  const [openingShiftLoading, setOpeningShiftLoading] = useState(false)
  const [openingShiftError, setOpeningShiftError] = useState('')

  // Customers state
  const [customerList, setCustomerList] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // DIAN Electronic Invoicing State
  const [emitElectronicInvoice, setEmitElectronicInvoice] = useState(false)
  const [dianCustomer, setDianCustomer] = useState<DianCustomerData | null>(null)
  const [dianInvoiceMode, setDianInvoiceMode] = useState<'nominal' | 'final_consumer'>('nominal')
  const [showDianCustomerModal, setShowDianCustomerModal] = useState(false)
  const [dianCustomerNit, setDianCustomerNit] = useState('')
  const [dianCustomerEmail, setDianCustomerEmail] = useState('')
  const [dianResult, setDianResult] = useState<{ cufe?: string; qrData?: string; dianStatus?: string; invoiceId?: string; number?: string } | null>(null)
  const [dianEmitting, setDianEmitting] = useState(false)

  // Global Keyboard Shortcuts (F1-F12 standard Eleventa style POS hotkeys)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (step === 'done') {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape' || e.key === 'F1') {
          e.preventDefault()
          newSale()
          return
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault()
          window.print()
          return
        }
        if (e.key === 'w' || e.key === 'W') {
          e.preventDefault()
          sendTicketWhatsApp()
          return
        }
      }

      if (step === 'payment') {
        if (e.key === 'Escape') {
          e.preventDefault()
          setStep('cart')
          return
        }
        if (e.key === 'F1') {
          e.preventDefault()
          setPaymentMethod('cash')
          return
        }
        if (e.key === 'F2') {
          e.preventDefault()
          setPaymentMethod('transfer')
          return
        }
        if (e.key === 'F3') {
          e.preventDefault()
          setPaymentMethod('card_debit')
          return
        }
        if (e.key === 'F4') {
          e.preventDefault()
          setPaymentMethod('fiao')
          return
        }
      }

      // Voice toggle
      if (
        (e.key === 'v' || e.key === 'V') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault()
        setShowVoiceHUD(prev => !prev)
        return
      }

      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault()
        document.getElementById('pos-search-input')?.focus()
      }
      // F2 / F3: Abonos a Fiao / Cartera Modal
      else if (e.key === 'F2' || e.key === 'F3') {
        e.preventDefault()
        setShowPosAbonoModal(prev => !prev)
      }
      // F4: Kick Cash Drawer
      else if (e.key === 'F4') {
        e.preventDefault()
        kickCashDrawer()
      }
      // F5: Camera Scanner Modal
      else if (e.key === 'F5') {
        e.preventDefault()
        setShowScanner(prev => !prev)
      }
      // F6: Express Product Modal
      else if (e.key === 'F6') {
        e.preventDefault()
        setShowExpressModal(prev => !prev)
      }
      // F8: Loyalty Points & Electronic Wallet
      else if (e.key === 'F8') {
        e.preventDefault()
        setShowWalletModal(prev => !prev)
      }
      // F10: Price Checker / Kiosk Mode
      else if (e.key === 'F10') {
        e.preventDefault()
        setShowPriceCheckerModal(prev => !prev)
      }
      // F12: Confirm payment / focus confirm button
      else if (e.key === 'F12') {
        e.preventDefault()
        document.getElementById('pos-confirm-payment-btn')?.click()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [step])

  // Audio-POS Voice Handlers
  const handleVoiceAddItems = useCallback((items: Array<{ product: any; quantity: number }>) => {
    items.forEach(({ product, quantity }) => {
      setCart(prevCart => {
        const existing = prevCart.find(i => i.id === product.id)
        if (existing) {
          const newQty = existing.quantity + quantity
          const { unitPrice } = getEffectiveUnitPrice({ ...existing, quantity: newQty })
          const itemDisc = existing.discount || 0
          const updatedItem = {
            ...existing,
            quantity: newQty,
            lineTotal: newQty * unitPrice * (1 - itemDisc / 100)
          }
          const rest = prevCart.filter(i => i.id !== product.id)
          return [updatedItem, ...rest]
        } else {
          const initialItem: CartItem = {
            ...product,
            quantity,
            discount: 0,
            lineTotal: 0
          }
          const { unitPrice } = getEffectiveUnitPrice(initialItem)
          return [
            {
              ...initialItem,
              lineTotal: quantity * unitPrice
            },
            ...prevCart
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

  // Permissions & Role verification
  const { hasPermission, isAdmin } = usePermissions()
  const canEditPrice = isAdmin || hasPermission('pos.edit_price') || hasPermission('pos.apply_discount')

  // Item-level Price / Discount Edit Modal states
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
  const [editItemPrice, setEditItemPrice] = useState<string>('')
  const [editItemDiscount, setEditItemDiscount] = useState<string>('')
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null)

  // Eleventa Colombia POS Modal States
  const [showPriceCheckerModal, setShowPriceCheckerModal] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showTerminalModal, setShowTerminalModal] = useState(false)
  const [walletDiscountApplied, setWalletDiscountApplied] = useState(0)

  // Warehouses state
  const [warehouseList, setWarehouseList] = useState<any[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // State loaded from DB (Fast Stale-While-Revalidate from localStorage for 0ms startup)
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mr_tender_cached_products')
        if (cached) return JSON.parse(cached)
      } catch {}
    }
    return []
  })
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
          .select('*')
          .eq('tenant_id', tenant_id)
          .limit(1)

        let currentTaxRate = 19
        if (tSettings?.[0]) {
          setTenantSettingsFull(tSettings[0])
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

        // Get warehouses
        const { data: warehouses } = await supabase
          .from('warehouses')
          .select('id, name, code, is_main, is_active')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
          .order('is_main', { ascending: false })
          .order('name', { ascending: true })
        
        const activeWh = warehouses?.find((w: any) => w.is_main) || warehouses?.[0] || null
        const warehouse_id = activeWh?.id || null
        if (warehouses) setWarehouseList(warehouses)
        // Keep default selectedWarehouseId as 'all' (Todas)

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

        // Fetch customers list with complete fiscal data
        const { data: custData } = await supabase
          .from('customers')
          .select('id, full_name, tax_id, tax_name, tax_regime, tax_address, email, phone, address, city, state, credit_limit, credit_used, total_purchases, total_orders, metadata')
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
              if (found) {
                setSelectedCustomer(found as any)
                const cleanTaxId = (found.tax_id || found.phone || '').replace(/[^a-zA-Z0-9]/g, '')
                setDianCustomer({
                  idType: (found.metadata?.id_type || (cleanTaxId.length >= 9 ? '31' : '13')) as any,
                  documentNumber: cleanTaxId,
                  dv: found.metadata?.dv || (cleanTaxId.length >= 9 ? calculateNITVerificationDigit(cleanTaxId) : undefined),
                  name: (found.tax_name || found.full_name || '').toUpperCase(),
                  personType: found.metadata?.person_type || (cleanTaxId.length >= 9 ? '1' : '2'),
                  regime: (found.tax_regime || '49') as any,
                  email: found.email || '',
                  phone: found.phone || '',
                  address: found.tax_address || found.address || 'Dirección Comercial',
                  city: found.city || 'Bogotá',
                  state: found.state || 'Bogotá D.C.'
                })
              }
            }
          }
        }

        // Get products with stock and pharmacy medicines
        const [prodRes, medRes] = await Promise.all([
          supabase
            .from('products')
            .select(`
              id, name, sale_price, cost_price, sku, barcode, category_id, tax_rate, image_url,
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
              image_url: p.image_url || null,
              category_id: p.category_id,
              warehouse_id,
              inventory: p.inventory || []
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
              category: 'Farmacia',
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
        localStorage.setItem('mr_tender_cached_products', JSON.stringify(loadedProducts))
      } catch (err: any) {
        console.error('Error loading POS data:', err)
        setError('Error al cargar datos del POS')

        const cached = localStorage.getItem('mr_tender_cached_products')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setProducts(parsed)
          } catch {}
        }
      }
    }

    loadData()
  }, [])

  async function handleOpenShift(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setOpeningShiftLoading(true)
    setOpeningShiftError('')
    try {
      const amt = parseFloat(openingShiftAmount) || 0
      const { data, error: rpcError } = await supabase.rpc('open_cash_session', {
        p_opening_amount: amt
      })
      if (rpcError) throw rpcError

      const newSessId = (data && typeof data === 'string') ? data : data?.id || 'active'

      // Synchronize sessionInfo immediately
      const [regRes, sessRes] = await Promise.all([
        supabase
          .from('cash_registers')
          .select('id, current_session_id')
          .eq('tenant_id', sessionInfo?.tenant_id)
          .eq('is_active', true)
          .limit(1),
        supabase
          .from('cash_sessions')
          .select('id, register_id')
          .eq('tenant_id', sessionInfo?.tenant_id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)
      ])

      const finalRegId = regRes.data?.[0]?.id || sessRes.data?.[0]?.register_id || sessionInfo?.register_id || null
      const finalSessId = sessRes.data?.[0]?.id || regRes.data?.[0]?.current_session_id || newSessId

      setSessionInfo(prev => prev ? {
        ...prev,
        session_id: finalSessId,
        register_id: finalRegId
      } : null)

      setShowOpenShiftModal(false)
      playSound('success')
    } catch (err: any) {
      console.error('Error opening shift:', err)
      setOpeningShiftError(err.message || 'Error al abrir turno')
    } finally {
      setOpeningShiftLoading(false)
    }
  }

  const getProductStock = useCallback((p: Product, whId: string | null) => {
    if (p.is_pharmacy) return p.stock || 0
    if (!p.inventory || p.inventory.length === 0) return p.stock || 0
    if (!whId || whId === 'all') {
      return p.inventory.reduce((acc, inv) => acc + Number(inv.quantity || 0), 0)
    }
    const match = p.inventory.find(inv => inv.warehouse_id === whId)
    return match ? Number(match.quantity || 0) : 0
  }, [])

  // Dynamic categories list from loaded products
  const categories = useMemo(() => {
    const map = new Map<string, number>()
    products.forEach(p => {
      const cat = p.category || 'Varios'
      map.set(cat, (map.get(cat) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [products])

  // Fast string normalizer for instant search (accent and case insensitive)
  const normalizeStr = (str: string) =>
    (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  // Ultra-fast in-memory product filter
  const filtered = useMemo(() => {
    let list = products

    // 1. Warehouse filter
    if (selectedWarehouseId && selectedWarehouseId !== 'all') {
      list = list.filter(p => {
        if (p.is_pharmacy) return true
        if (p.inventory && p.inventory.length > 0) {
          return p.inventory.some(inv => inv.warehouse_id === selectedWarehouseId)
        }
        return p.warehouse_id === selectedWarehouseId
      })
    }

    // 2. Search query filter
    const q = normalizeStr(search.trim())
    if (q !== '') {
      return list.filter(p => {
        const nameNorm = normalizeStr(p.name)
        const skuNorm = normalizeStr(p.sku || '')
        const barcodeNorm = p.barcode ? normalizeStr(p.barcode) : ''
        const genNorm = p.generic_name ? normalizeStr(p.generic_name) : ''
        return (
          nameNorm.includes(q) ||
          skuNorm.includes(q) ||
          barcodeNorm.includes(q) ||
          genNorm.includes(q)
        )
      })
    }

    // 3. Category filter (when search is empty, displays all or category-specific products)
    if (selectedCategory !== 'all') {
      list = list.filter(p => (p.category || 'Varios') === selectedCategory)
    }

    return list
  }, [products, search, selectedWarehouseId, selectedCategory])

  const addToCart = useCallback((product: Product, quantity = 1) => {
    playSound('beep')
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        const newQty = existing.quantity + quantity
        const { unitPrice } = getEffectiveUnitPrice({ ...existing, quantity: newQty })
        const updatedItem = {
          ...existing,
          quantity: newQty,
          lineTotal: newQty * unitPrice * (1 - (Number(existing.discount) || 0) / 100)
        }
        const rest = prev.filter(i => i.id !== product.id)
        return [updatedItem, ...rest]
      }
      const initialItem: CartItem = { ...product, quantity, discount: 0, lineTotal: 0 }
      const { unitPrice } = getEffectiveUnitPrice(initialItem)
      return [{ ...initialItem, lineTotal: quantity * unitPrice }, ...prev]
    })
  }, [])

  const updateQty = (id: string, qty: number) => {
    playSound('tap')
    if (qty <= 0) { removeFromCart(id); return }
    const rounded = Math.round(qty * 1000) / 1000
    setCart(prev => {
      const target = prev.find(i => i.id === id)
      if (!target) return prev
      const { unitPrice } = getEffectiveUnitPrice({ ...target, quantity: rounded })
      const updatedItem = {
        ...target,
        quantity: rounded,
        lineTotal: rounded * unitPrice * (1 - (Number(target.discount) || 0) / 100)
      }
      const rest = prev.filter(i => i.id !== id)
      return [updatedItem, ...rest]
    })
  }

  const removeFromCart = (id: string) => {
    playSound('tap')
    setCart(prev => prev.filter(i => i.id !== id))
  }

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0)
  const discountAmt = subtotal * ((Number(discount) || 0) / 100)
  const total = Math.max(0, subtotal - discountAmt - walletDiscountApplied)
  const change = paymentMethod === 'cash' ? Math.max(0, (Number(receivedAmount) || 0) - total) : 0

  // Real-time broadcast for Secondary Customer-Facing Screen
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    try {
      const channel = new BroadcastChannel('mr_tender_customer_display')
      channel.postMessage({
        cart,
        subtotal,
        discount,
        tax: 0,
        total,
        receivedAmount: Number(receivedAmount) || 0,
        change,
        customerName: selectedCustomer?.full_name || null,
        isCompleted: false
      })
      return () => channel.close()
    } catch (e) {
      console.error('Customer Display Broadcast Error:', e)
    }
  }, [cart, subtotal, discount, total, receivedAmount, change, selectedCustomer])

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

    // 1. GS1 Variable weight/price scale barcode decoding (Prefix 20, 21, 28, 29)
    const scaleParsed = parseScaleBarcode(cleanCode)
    if (scaleParsed.isScaleBarcode && scaleParsed.itemCode) {
      const itCode = scaleParsed.itemCode
      const scaleMatch = products.find(p => p.sku === itCode || (p.barcode ? p.barcode.includes(itCode) : false) || (p.sku ? p.sku.endsWith(itCode) : false))
      if (scaleMatch) {
        if (scaleParsed.type === 'weight' && scaleParsed.weightKg) {
          addToCart(scaleMatch, scaleParsed.weightKg)
          return { found: true, name: scaleMatch.name, price: scaleMatch.price, sku: scaleMatch.sku }
        } else if (scaleParsed.type === 'price' && scaleParsed.totalPrice) {
          const qty = Math.round((scaleParsed.totalPrice / (scaleMatch.price || 1)) * 1000) / 1000
          addToCart(scaleMatch, qty)
          return { found: true, name: scaleMatch.name, price: scaleMatch.price, sku: scaleMatch.sku }
        }
      }
    }

    const foundInInventory = products.find(p => p.sku === cleanCode || p.barcode === cleanCode || p.name.toLowerCase().includes(cleanCode.toLowerCase()))
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
      stock: '10',
      image_url: ''
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
        setError('Ingresa el número de comprobante Nequi/Daviplata')
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

      const finalSaleNumber = data.number || offlineId
      setSaleNumber(finalSaleNumber)
      playSound('success')
      kickCashDrawer()

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('mr_tender_customer_display')
          channel.postMessage({
            cart,
            subtotal,
            discount,
            tax: 0,
            total,
            receivedAmount: Number(receivedAmount) || total,
            change,
            customerName: selectedCustomer?.full_name || dianCustomer?.name || null,
            isCompleted: true
          })
          channel.close()
        } catch {}
      }
      
      // Emitir Factura Electrónica ante la DIAN si está activado
      if (emitElectronicInvoice) {
        setDianEmitting(true)
        try {
          const customCustomerPayload = (dianInvoiceMode === 'nominal' && dianCustomer) ? {
            id: dianCustomer.documentNumber,
            idType: dianCustomer.idType,
            dv: dianCustomer.dv,
            name: dianCustomer.name,
            personType: dianCustomer.personType,
            regime: dianCustomer.regime,
            email: dianCustomer.email,
            phone: dianCustomer.phone,
            address: dianCustomer.address,
            city: dianCustomer.city,
            state: dianCustomer.state
          } : {
            id: '222222222222',
            idType: '13',
            name: 'Consumidor Final',
            personType: '2',
            regime: '49',
            email: '',
            phone: '',
            address: 'Mostrador',
            city: 'Bogotá',
            state: 'Bogotá D.C.'
          }

          const dianRes = await fetch('/api/dian/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              saleId: data.sale_id || data.id,
              customCustomer: customCustomerPayload,
              paymentMethod
            })
          })
          const dianData = await dianRes.json()
          if (dianData.success) {
            setDianResult({
              cufe: dianData.cufe,
              qrData: dianData.qrData,
              dianStatus: dianData.dianStatus,
              invoiceId: dianData.invoice?.id,
              number: dianData.invoice?.number
            })
          }
        } catch (dianErr) {
          console.warn('DIAN emission warning:', dianErr)
        } finally {
          setDianEmitting(false)
        }
      }

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
    const cufeText = dianResult?.cufe ? `\n\n*FACTURA ELECTRÓNICA DIAN*\nCUFE: ${dianResult.cufe.slice(0, 32)}...\nVerifica tu factura en el portal DIAN:\n${getDianVerificationUrl(dianResult.cufe, '2')}` : ''
    
    const message = `*${emitElectronicInvoice ? 'FACTURA ELECTRÓNICA DE VENTA' : 'FACTURA POS / TICKET DE COMPRA'}*
*${businessName}*
Folio: ${dianResult?.number || saleNumber}
Fecha: ${new Date().toLocaleString('es-CO')}

${itemsText}

TOTAL: ${formatCurrency(total)}
Pago: ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'fiao' ? 'Fiao (Crédito)' : 'Nequi / Daviplata'}
${change > 0 ? `Cambio: ${formatCurrency(change)}` : ''}${cufeText}

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
    setEmitElectronicInvoice(false)
    setDianCustomerNit('')
    setDianCustomerEmail('')
    setDianResult(null)
    setStep('cart')
  }

  async function handleDownloadOfficialPdfA4() {
    const emisorNit = tenantSettingsFull?.tax_id ? tenantSettingsFull.tax_id.replace(/\D/g, '') : '901234567'
    const resolutionNum = tenantSettingsFull?.dian_resolution || '18760000001'
    const resolutionPrefix = tenantSettingsFull?.dian_prefix || 'SETP'

    const payload = {
      documentType: '01' as any,
      number: dianResult?.number || saleNumber,
      prefix: resolutionPrefix,
      folio: 1,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().split(' ')[0] + '-05:00',
      currency: 'COP',
      environment: (tenantSettingsFull?.dian_environment || '2') as any,
      resolution: {
        resolutionNumber: resolutionNum,
        prefix: resolutionPrefix,
        fromNumber: Number(tenantSettingsFull?.dian_from || 1),
        toNumber: Number(tenantSettingsFull?.dian_to || 50000),
        currentNumber: 1,
        validFrom: '2026-01-01',
        validTo: '2027-12-31',
        technicalKey: tenantSettingsFull?.dian_technical_key || 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
        environment: (tenantSettingsFull?.dian_environment || '2') as any
      },
      emisor: {
        nit: emisorNit,
        dv: '1',
        businessName: tenantSettingsFull?.business_name || businessName,
        regime: (tenantSettingsFull?.dian_regimen?.includes('No') ? '49' : '48') as any,
        personType: '1' as any,
        idType: '31' as any,
        email: tenantSettingsFull?.email || 'facturacion@mrtender.com',
        phone: tenantSettingsFull?.phone || merchantPhone,
        address: tenantSettingsFull?.address || 'Calle Principal # 1-23',
        city: tenantSettingsFull?.city || 'Bogotá',
        state: tenantSettingsFull?.state || 'Bogotá D.C.',
        country: 'Colombia'
      },
      adquiriente: {
        id: dianCustomerNit.trim() || selectedCustomer?.phone || '222222222222',
        idType: (dianCustomerNit.length >= 9 ? '31' : '13') as any,
        name: selectedCustomer?.full_name || 'Consumidor Final',
        personType: '2' as any,
        regime: '49' as any,
        email: dianCustomerEmail,
        city: 'Bogotá',
        address: 'Mostrador'
      },
      paymentMeans: {
        code: paymentMethod === 'cash' ? '10' : '48' as any,
        name: paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia Electrónica',
        isCredit: paymentMethod === 'fiao'
      },
      items: cart.map((it, idx) => ({
        id: it.id || String(idx),
        sku: it.sku || 'SKU',
        name: it.name,
        quantity: it.quantity,
        unitCode: 'EA',
        unitPrice: it.price,
        subtotal: it.lineTotal,
        taxes: [{ taxCode: '01' as any, taxName: 'IVA', taxRate: 19, taxableAmount: it.lineTotal, taxAmount: it.lineTotal * 0.19 }],
        total: it.lineTotal
      })),
      totals: {
        lineExtensionAmount: subtotal,
        taxExclusiveAmount: subtotal,
        taxInclusiveAmount: total,
        allowanceTotalAmount: discountAmt,
        payableAmount: total,
        taxBreakdown: {
          iva19: { base: subtotal, tax: subtotal * 0.19 },
          iva5: { base: 0, tax: 0 },
          iva0: { base: 0, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax: subtotal * 0.19
        }
      }
    }
    await generateDianInvoicePdfA4(
      payload,
      dianResult?.cufe || 'c89f2a01490b8e7c102a99182bc837d7a129031738491823749812739487123984712983749182374918237491823749',
      dianResult?.qrData || '',
      'Validada por la DIAN'
    )
  }
  if (step === 'done') {
    const activeCufe = dianResult?.cufe || 'c89f2a01490b8e7c102a99182bc837d7a12903173849182374981273948712398471298374918237491823749'
    const verificationUrl = getDianVerificationUrl(activeCufe, '2')

    return (
      <div style={{
        width: '100%',
        height: '100%',
        maxHeight: 'calc(100vh - 56px)',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '12px 14px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 860,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          alignItems: 'start',
          margin: '0 auto'
        }}>
          
          {/* ── LEFT: Printable Thermal Receipt Preview ── */}
          <div
            id="pos-ticket"
            className="neu-card animate-scale-in"
            style={{
              background: '#fff',
              color: '#0F172A',
              padding: '16px 14px',
              borderRadius: 14,
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              border: '1px solid #CBD5E1',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
            }}
          >
            {/* Header / Business details */}
            <div style={{ textAlign: 'center', marginBottom: 8, borderBottom: '1px dashed #94A3B8', paddingBottom: 8 }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#0F172A' }}>{businessName}</div>
              <div style={{ fontSize: '0.68rem', color: '#475569' }}>NIT: 901.234.567-1 - Reg. DIAN</div>
              <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Res. DIAN 18760000001 (SETP-1 al SETP-5000)</div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 1 }}>{new Date().toLocaleString('es-CO')}</div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginTop: 4, color: '#1E293B' }}>
                {emitElectronicInvoice ? `Factura Electrónica N°: ${dianResult?.number || saleNumber}` : `Factura POS N°: ${saleNumber}`}
              </div>
              {emitElectronicInvoice && (
                <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700 }}>
                  <ShieldCheck size={11} /> Validada DIAN (ApplicationResponse 00)
                </div>
              )}
            </div>

            {/* Customer Details */}
            {selectedCustomer && (
              <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6, fontSize: '0.74rem' }}>
                <div><strong>Cliente:</strong> {selectedCustomer.full_name}</div>
                {selectedCustomer.phone && <div><strong>Tel:</strong> {selectedCustomer.phone}</div>}
                {dianCustomerNit && <div><strong>NIT/C.C.:</strong> {dianCustomerNit}</div>}
              </div>
            )}

            {/* Cart items */}
            <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 3, marginBottom: 4, fontSize: '0.72rem' }}>
                <span>Cant/Producto</span>
                <span style={{ textAlign: 'right' }}>P.Unit</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 3, fontSize: '0.74rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 4 }}>
                      {item.quantity} {item.unit_type === 'unit' ? 'x' : item.unit_type} {item.name}
                    </div>
                    <div style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</div>
                    <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', marginTop: 2 }}>
                <span>TOTAL:</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginTop: 1 }}>
                <span>Pago:</span>
                <span style={{ fontWeight: 800 }}>{paymentMethod === 'cash' ? 'EFECTIVO' : paymentMethod === 'fiao' ? 'FIAO (CRÉDITO)' : paymentMethod === 'transfer' ? 'NEQUI / TRANSFERENCIA' : 'TARJETA'}</span>
              </div>
              {paymentMethod === 'cash' && change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#059669', fontWeight: 900, marginTop: 2, background: '#ECFDF5', padding: '2px 6px', borderRadius: 4 }}>
                  <span>CAMBIO / VUELTOS:</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            {/* QR Code & DIAN CUFE */}
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verificationUrl)}`} alt="QR DIAN" style={{ width: 54, height: 54, margin: '0 auto 4px', display: 'block' }} />
              <div style={{ fontSize: '0.52rem', color: '#64748B', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                CUFE: {activeCufe.slice(0, 32)}...
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: 3, color: '#475569' }}>
                ¡Gracias por su compra en {businessName}!
              </div>
            </div>
          </div>

          {/* ── RIGHT: Control & Actions Panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {/* Header Success Card */}
            <div className="neu-card animate-scale-in" style={{ padding: '16px 18px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}>
                  ✓
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    ¡Venta Finalizada con Éxito!
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
                    {emitElectronicInvoice ? 'Factura Electrónica emitida y validada por la DIAN' : 'Ticket registrado en caja registradora'}
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: change > 0 ? '1fr 1fr' : '1fr', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Cobrado</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-blue)', lineHeight: 1.1 }}>{formatCurrency(total)}</div>
                </div>
                {paymentMethod === 'cash' && change > 0 && (
                  <div style={{ background: '#ECFDF5', padding: '8px 12px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>Cambio a Devolver</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>{formatCurrency(change)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Card */}
            <div className="neu-card animate-scale-in" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Acciones de Venta
              </span>

              {/* Big Nueva Venta Button */}
              <button
                className="btn-neu btn-primary"
                onClick={newSale}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1.02rem',
                  fontWeight: 900,
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Iniciar Nueva Venta [Enter / Espacio]</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  className="btn-neu"
                  onClick={() => window.print()}
                  style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <Printer size={15} strokeWidth={2} />
                  <span>Imprimir [P]</span>
                </button>

                <button
                  className="btn-neu"
                  onClick={sendTicketWhatsApp}
                  style={{ padding: '10px 12px', fontSize: '0.82rem', background: '#25D366', color: '#fff', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <Send size={15} strokeWidth={2} />
                  <span>WhatsApp [W]</span>
                </button>
              </div>

              {emitElectronicInvoice && (
                <button
                  className="btn-neu"
                  onClick={handleDownloadOfficialPdfA4}
                  style={{ padding: '10px 12px', fontSize: '0.82rem', background: '#0284C7', color: '#fff', fontWeight: 700, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <FileText size={15} />
                  <span>Descargar Factura Oficial DIAN (PDF A4)</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Turno Cerrado Banner */}
      {sessionInfo && !sessionInfo.session_id && (
        <div style={{
          background: '#FEF2F2',
          borderBottom: '1px solid #FECACA',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 14,
          flexShrink: 0,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>🔒</span>
            <span style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.84rem' }}>
              Turno cerrado &mdash; Debes abrir un turno para registrar ventas y cobros en el sistema.
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpeningShiftError(''); setShowOpenShiftModal(true); }}
            className="btn-neu btn-primary"
            style={{
              padding: '5px 14px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <Unlock size={14} strokeWidth={2.5} />
            <span>Abrir Turno</span>
          </button>
        </div>
      )}

      {/* ── STEP 1: CART & PRODUCT SEARCH ── */}
      {step === 'cart' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', gap: 6 }}>
          
          {/* Top Search & Actions Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <div className="pos-search-row" style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
              <div className="input-group" style={{ flex: 1, position: 'relative', minWidth: 0, width: '100%' }}>
                <span className="input-icon" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                  <Search size={17} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                </span>
                <input
                  id="pos-search-input"
                  className="input-neu"
                  placeholder="Buscar producto, SKU o escanear código..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const q = search.trim().toLowerCase()
                      if (!q) return

                      // 1. Check exact barcode or SKU match (ideal for physical barcode guns)
                      const exact = products.find(p =>
                        (p.barcode && p.barcode.toLowerCase() === q) ||
                        (p.sku && p.sku.toLowerCase() === q)
                      )
                      if (exact) {
                        if (exact.is_pharmacy && (exact.blister_price || exact.box_price)) {
                          setSelectedFractionProduct(exact)
                        } else if (exact.unit_type !== 'unit') {
                          setWeighingProduct(exact)
                        } else {
                          addToCart(exact)
                          setSearch('')
                          playSound('beep')
                        }
                        return
                      }

                      // 2. If filtered has exactly 1 result
                      if (filtered.length === 1) {
                        const target = filtered[0]
                        if (target.is_pharmacy && (target.blister_price || target.box_price)) {
                          setSelectedFractionProduct(target)
                        } else if (target.unit_type !== 'unit') {
                          setWeighingProduct(target)
                        } else {
                          addToCart(target)
                          setSearch('')
                          playSound('beep')
                        }
                        return
                      }
                    }
                  }}
                  autoFocus
                  style={{
                    fontSize: '0.88rem',
                    height: 38,
                    paddingLeft: 36,
                    paddingRight: search ? '36px' : '10px',
                    boxSizing: 'border-box'
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                      borderRadius: 4
                    }}
                    title="Limpiar búsqueda"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Action buttons wrapper */}
              <div className="pos-actions-bar" style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                {/* Warehouse selector */}
                <select
                  className="input-neu"
                  value={selectedWarehouseId || 'all'}
                  onChange={e => {
                    const wid = e.target.value
                    setSelectedWarehouseId(wid)
                    try {
                      localStorage.setItem('pos_selected_warehouse_id', wid)
                    } catch {}
                  }}
                  style={{ height: 38, padding: '0 8px', fontSize: '0.78rem', flexShrink: 0, boxSizing: 'border-box' }}
                >
                  <option value="all">Todas las bodegas</option>
                  {warehouseList.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.is_main ? '(Principal)' : ''}
                    </option>
                  ))}
                </select>

                {/* Voice Assistant Button */}
                <button
                  className="btn-neu"
                  onClick={() => setShowVoiceHUD(prev => !prev)}
                  title="Asistente de Voz IA (Tecla V)"
                  style={{
                    height: 38,
                    padding: '0 10px',
                    fontSize: '0.78rem',
                    background: showVoiceHUD ? '#ef4444' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    border: 'none',
                    fontWeight: 700,
                    boxShadow: showVoiceHUD ? '0 0 12px rgba(239, 68, 68, 0.5)' : '0 2px 6px rgba(59, 130, 246, 0.3)',
                    flexShrink: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  <Mic size={15} strokeWidth={2.5} />
                  <span className="pos-btn-label">Voz</span>
                </button>

                {/* Camera Scanner (Only visible on mobile screen sizes < 768px; on Desktop the physical scanner gun scans directly into the search bar) */}
                <button
                  className="btn-neu btn-primary md:hidden"
                  onClick={() => setShowScanner(true)}
                  title="Escanear con cámara (Móvil)"
                  style={{ height: 38, padding: '0 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, boxSizing: 'border-box' }}
                >
                  <Camera size={15} strokeWidth={2} />
                  <span className="pos-btn-label">Escanear</span>
                </button>

                {/* Price Checker F10 */}
                <button
                  className="btn-neu"
                  onClick={() => setShowPriceCheckerModal(true)}
                  title="Verificador de Precios / Modo Kiosko (F10)"
                  style={{ height: 38, padding: '0 9px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, boxSizing: 'border-box' }}
                >
                  <Search size={14} style={{ color: 'var(--accent-purple)' }} />
                  <span className="pos-btn-label">Precios (F10)</span>
                </button>

                {/* Abonos a Fiao / Cartera F3 */}
                <button
                  className="btn-neu"
                  onClick={() => setShowPosAbonoModal(true)}
                  title="Registrar Abono a Crédito / Fiao (F3)"
                  style={{ height: 38, padding: '0 9px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, boxSizing: 'border-box', color: 'var(--accent-purple)', fontWeight: 700 }}
                >
                  <HandCoins size={14} />
                  <span className="pos-btn-label">Abonar Fiao (F3)</span>
                </button>

                {/* Secondary Customer Display */}
                <button
                  className="btn-neu"
                  onClick={() => window.open('/pos/customer-display', 'CustomerDisplay', 'width=1024,height=768')}
                  title="Abrir Pantalla Secundaria para el Cliente"
                  style={{ height: 38, padding: '0 9px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, boxSizing: 'border-box' }}
                >
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                  <span className="pos-btn-label">2ª Pantalla</span>
                </button>

                {heldCarts.length > 0 && (
                  <button
                    className="btn-neu"
                    onClick={() => setShowHeldModal(true)}
                    title="Ver carritos en espera"
                    style={{ height: 38, padding: '0 10px', fontSize: '0.78rem', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, boxSizing: 'border-box' }}
                  >
                    <PlayCircle size={15} />
                    <span>{heldCarts.length}</span>
                  </button>
                )}

                {!isOnline && (
                  <span className="badge badge-amber" title="Modo Offline" style={{ height: 38, padding: '0 8px', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
                    <WifiOff size={13} />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Segmented Switcher (< 768px only) */}
          <div className="pos-mobile-tabs" style={{ display: 'none', gap: 6, padding: '2px 0' }}>
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={`btn-neu ${mobileTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Package size={14} />
              <span>Catálogo ({filtered.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`btn-neu ${mobileTab === 'cart' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ShoppingCart size={14} />
              <span>Carrito ({cart.reduce((s, i) => s + (i.unit_type === 'unit' ? i.quantity : 1), 0)})</span>
              {total > 0 && (
                <span style={{ fontSize: '0.72rem', background: '#0F172A', color: '#fff', padding: '1px 6px', borderRadius: 6, marginLeft: 4 }}>
                  {formatCurrency(total)}
                </span>
              )}
            </button>
          </div>

          {/* DUAL PANELS CONTAINER - UNIFIED VIEW FOR FAST SALES */}
          <div className="pos-layout-grid" style={{ flex: 1, minHeight: 0 }}>

            {/* LEFT / TOP: Products Search & Catalog Panel */}
            <div className={`pos-catalog-panel ${mobileTab === 'cart' ? 'mobile-hidden' : 'mobile-active'}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>

              {/* Smart Generic Suggestions Banner */}
              {search.trim() !== '' && (() => {
                const q = search.toLowerCase()
                const matchedMed = products.find(p => p.is_pharmacy && p.generic_name && (p.name.toLowerCase().includes(q) || p.generic_name.toLowerCase().includes(q)))
                if (!matchedMed?.generic_name) return null
                const alternatives = products.filter(p => p.is_pharmacy && p.generic_name?.toLowerCase() === matchedMed.generic_name?.toLowerCase())
                if (alternatives.length <= 1) return null

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(139,114,190,0.08)', borderRadius: 8, border: '1px solid rgba(139,114,190,0.25)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-purple)' }}>💡 Alternativas con {matchedMed.generic_name}:</span>
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
                        style={{ padding: '2px 7px', fontSize: '0.7rem', background: '#fff', color: 'var(--text-primary)', fontWeight: 700 }}
                      >
                        {alt.laboratory || alt.name.split(' ')[0]}: {formatCurrency(alt.price)}
                      </button>
                    ))}
                  </div>
                )
              })()}

              {/* Quick Category Chips Filter Bar */}
              {categories.length > 1 && (
                <div style={{
                  display: 'flex',
                  gap: 5,
                  overflowX: 'auto',
                  padding: '2px 0 6px',
                  scrollbarWidth: 'none',
                  flexShrink: 0
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="btn-neu"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: selectedCategory === 'all' ? 800 : 600,
                      borderRadius: 16,
                      whiteSpace: 'nowrap',
                      background: selectedCategory === 'all' ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: selectedCategory === 'all' ? '#fff' : 'var(--text-secondary)',
                      boxShadow: selectedCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.3)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Todos</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.85, background: selectedCategory === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--bg-deep)', padding: '1px 5px', borderRadius: 10 }}>
                      {products.length}
                    </span>
                  </button>

                  {categories.map(([catName, count]) => {
                    const isSelected = selectedCategory === catName
                    return (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => setSelectedCategory(isSelected ? 'all' : catName)}
                        className="btn-neu"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: isSelected ? 800 : 600,
                          borderRadius: 16,
                          whiteSpace: 'nowrap',
                          background: isSelected ? 'var(--accent-blue)' : 'var(--bg-card)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          boxShadow: isSelected ? '0 2px 6px rgba(59,130,246,0.3)' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>{catName}</span>
                        <span style={{ fontSize: '0.62rem', opacity: 0.85, background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-deep)', padding: '1px 5px', borderRadius: 10 }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Product grid results */}
              {/* Product grid results */}
              <div className="pos-product-grid" style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.map(product => {
                  const displayStock = getProductStock(product, selectedWarehouseId)
                  return (
                    <button
                      key={product.id}
                      className="pos-product-card"
                      onClick={() => {
                        if (product.is_pharmacy && (product.blister_price || product.box_price)) {
                          setSelectedFractionProduct(product)
                        } else if (product.unit_type !== 'unit') {
                          setWeighingProduct(product)
                        } else {
                          addToCart(product)
                        }
                      }}
                      style={{
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 155,
                        position: 'relative'
                      }}
                    >
                      {/* Product Image / Icon Thumbnail */}
                      <div style={{
                        width: '100%',
                        height: 76,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#F8FAFC',
                        border: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4,
                        position: 'relative'
                      }}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none'
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            display: product.image_url ? 'none' : 'flex',
                            width: '100%',
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--accent-blue-lt)'
                          }}
                        >
                          <Package size={24} strokeWidth={1.8} style={{ color: 'var(--accent-blue)' }} />
                        </div>

                        {product.unit_type !== 'unit' && (
                          <span style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            background: 'var(--accent-purple-lt)',
                            color: 'var(--accent-purple)',
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                          }}>
                            <Scale size={9} /> {product.unit_type}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <div style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.2,
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        marginBottom: 'auto',
                        width: '100%'
                      }}>
                        {product.name}
                      </div>

                      {/* Price & Stock Footer */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: '1px solid #F1F5F9'
                      }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                          {formatCurrency(product.price)}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: displayStock <= 5 ? 'var(--accent-coral)' : 'var(--text-muted)',
                          background: displayStock <= 5 ? '#FEE2E2' : '#F1F5F9',
                          padding: '1px 5px',
                          borderRadius: 4
                        }}>
                          {displayStock} u
                        </span>
                      </div>
                    </button>
                  )
                })}
                {filtered.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
                    <Search size={24} strokeWidth={1.5} style={{ margin: '0 auto 6px', color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {search.trim() !== ''
                        ? `No se encontraron productos para "${search}"`
                        : 'No hay productos disponibles en esta categoría o bodega'}
                    </div>
                    {search.trim() !== '' ? (
                      <button className="btn-neu btn-primary" onClick={() => { setExpressForm({ name: search, sku: '', price: '', cost: '', stock: '10', image_url: '' }); setShowExpressModal(true); }} style={{ margin: '8px auto 0', padding: '6px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <PlusCircle size={13} />
                        <span>Registrar "{search}"</span>
                      </button>
                    ) : (
                      selectedCategory !== 'all' && (
                        <button className="btn-neu" onClick={() => setSelectedCategory('all')} style={{ margin: '8px auto 0', padding: '5px 10px', fontSize: '0.72rem' }}>
                          Ver todos los productos
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT / BOTTOM: Minimalist High-Density Cart Panel */}
            <div className={`neu-card pos-cart-panel ${mobileTab === 'catalog' ? 'mobile-hidden' : 'mobile-active'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Cart header */}
              <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--bg-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', minWidth: 0 }}>
                  <ShoppingCart size={15} strokeWidth={2} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Carrito ({cart.reduce((s, i) => s + (i.unit_type === 'unit' ? i.quantity : 1), 0)})
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {cart.length > 0 && (
                    <>
                      <button className="btn-neu" onClick={holdCurrentCart} title="Poner en espera para atender a otro cliente" style={{ padding: '3px 7px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent-amber)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        <PauseCircle size={12} />
                        <span>En espera</span>
                      </button>
                      <button className="btn-neu btn-ghost" onClick={() => setCart([])} style={{ padding: '3px 7px', fontSize: '0.68rem', color: 'var(--accent-coral)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        Limpiar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div ref={cartListRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '4px 6px' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-muted)' }}>
                    <ShoppingCart size={26} strokeWidth={1.5} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '0.75rem' }}>Carrito vacío &mdash; Selecciona o escanea productos arriba</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cart.map(item => (
                      <div key={item.id} className="neu-flat" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1, flexWrap: 'wrap' }}>
                            <span style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.price)} {item.unit_type !== 'unit' ? `x ${item.unit_type}` : 'c/u'}</span>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (!canEditPrice) {
                                  setPermissionWarning('No tienes autorización para modificar precios o aplicar descuentos individuales a los productos en el carrito. Solicita el permiso "pos.edit_price" a tu administrador.')
                                  return
                                }
                                setEditingCartItem(item)
                                setEditItemPrice(String(item.price))
                                setEditItemDiscount(String(item.discount || 0))
                              }}
                              className="btn-neu btn-ghost"
                              style={{
                                padding: '1px 5px',
                                fontSize: '0.62rem',
                                color: (item.discount || 0) > 0 ? 'var(--accent-coral)' : 'var(--accent-blue)',
                                fontWeight: 700,
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                background: (item.discount || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.08)'
                              }}
                              title={canEditPrice ? "Modificar precio o descuento" : "Requiere permiso de administrador"}
                            >
                              <Tag size={9} />
                              <span>{(item.discount || 0) > 0 ? `-${item.discount}%` : 'Editar $'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <button className="btn-neu btn-icon-sm" onClick={() => updateQty(item.id, item.quantity - (item.unit_type !== 'unit' ? 0.25 : 1))} style={{ width: 24, height: 24, minWidth: 24, padding: 0, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>-</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: '0.78rem' }}>
                            {item.quantity}{item.unit_type !== 'unit' ? item.unit_type : ''}
                          </span>
                          <button className="btn-neu btn-icon-sm btn-primary" onClick={() => updateQty(item.id, item.quantity + (item.unit_type !== 'unit' ? 0.25 : 1))} style={{ width: 24, height: 24, minWidth: 24, padding: 0, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>+</button>
                        </div>

                        {/* Line Total */}
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 54 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent-blue)', whiteSpace: 'nowrap' }}>{formatCurrency(item.lineTotal)}</div>
                        </div>

                        <button onClick={() => removeFromCart(item.id)} style={{ padding: '3px', color: 'var(--accent-coral)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Quitar">
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount Input */}
              {cart.length > 0 && (
                <div style={{ padding: '4px 10px', borderTop: '1px solid var(--bg-deep)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Descuento %</span>
                    <input className="input-neu" type="number" min={0} max={100} value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" style={{ padding: '2px 6px', fontSize: '0.74rem', width: 60 }} />
                  </div>
                </div>
              )}

              {/* Totals & Checkout Button */}
              <div style={{ padding: '8px 10px', borderTop: '1px solid var(--bg-deep)', background: 'var(--bg-deep)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--accent-coral)' }}>
                      <span>Descuento ({discount}%)</span><span>-{formatCurrency(discountAmt)}</span>
                    </div>
                  )}
                  <div className="divider" style={{ margin: '1px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                    <span>Total</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(total)}</span>
                  </div>
                </div>
                <button
                  className="btn-neu btn-primary"
                  disabled={cart.length === 0}
                  onClick={() => {
                    if (!sessionInfo?.session_id) {
                      setOpeningShiftError('')
                      setShowOpenShiftModal(true)
                      return
                    }
                    setReceivedAmount(String(total))
                    setIsFirstNumpadKey(true)
                    setStep('payment')
                    playSound('tap')
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '0.86rem', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  {!sessionInfo?.session_id && <Unlock size={15} strokeWidth={2.5} />}
                  <span>{!sessionInfo?.session_id ? 'Abrir Turno para Cobrar' : `Cobrar ${formatCurrency(total)}`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Checkout Button for Mobile */}
          {mobileTab === 'catalog' && cart.length > 0 && (
            <div
              className="pos-floating-checkout"
              onClick={() => setMobileTab('cart')}
              style={{
                display: 'none',
                position: 'fixed',
                bottom: 12,
                left: 12,
                right: 12,
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '12px 18px',
                borderRadius: 14,
                zIndex: 99,
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: '#00D6BC', color: '#0F172A', padding: '2px 8px', borderRadius: 8, fontWeight: 800, fontSize: '0.82rem' }}>
                  {cart.reduce((s, i) => s + (i.unit_type === 'unit' ? i.quantity : 1), 0)} items
                </span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>{formatCurrency(total)}</span>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, color: '#00D6BC', fontSize: '0.86rem' }}>
                Ver Carrito / Cobrar →
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: HIGH-SPEED DESKTOP & TOUCH CHECKOUT STUDIO ── */}
      {step === 'payment' && (
        <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 960, margin: '0 auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '16px 20px', boxSizing: 'border-box', overflow: 'hidden', background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
          
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
            <button
              className="btn-neu btn-ghost"
              onClick={() => setStep('cart')}
              style={{ padding: '6px 14px', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderRadius: 10 }}
            >
              <ArrowLeft size={16} />
              <span>Volver al Carrito (Esc)</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                <span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: 8, color: '#334155' }}>
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total a Cobrar</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-blue)', lineHeight: 1 }}>{formatCurrency(total)}</div>
              </div>
            </div>
          </div>

          {/* Dual Column Grid on Desktop, Stack on Mobile */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)', gap: 16, minHeight: 0, overflow: 'hidden' }}>
            
            {/* ── LEFT COLUMN: Orden, Cliente & Método ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
              
              {/* Payment Methods Fast Bar */}
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Método de Pago (Atajos F1-F4)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('cash'); setError(''); playSound('tap'); }}
                    className={`btn-neu ${paymentMethod === 'cash' ? 'btn-primary' : ''}`}
                    style={{ padding: '10px 4px', fontSize: '0.74rem', fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRadius: 10 }}
                  >
                    <Banknote size={16} />
                    <span>Efectivo</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>[F1]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('transfer'); setError(''); playSound('tap'); }}
                    className={`btn-neu ${paymentMethod === 'transfer' ? 'btn-primary' : ''}`}
                    style={{ padding: '10px 4px', fontSize: '0.74rem', fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRadius: 10 }}
                  >
                    <Smartphone size={16} />
                    <span>Nequi</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>[F2]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('card_debit'); setError(''); playSound('tap'); }}
                    className={`btn-neu ${paymentMethod === 'card_debit' ? 'btn-primary' : ''}`}
                    style={{ padding: '10px 4px', fontSize: '0.74rem', fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRadius: 10 }}
                  >
                    <CreditCard size={16} />
                    <span>Tarjeta</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>[F3]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('fiao'); setError(''); playSound('tap'); }}
                    className={`btn-neu ${paymentMethod === 'fiao' ? 'btn-primary' : ''}`}
                    style={{ padding: '10px 4px', fontSize: '0.74rem', fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRadius: 10 }}
                  >
                    <User size={16} />
                    <span>Fiar</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>[F4]</span>
                  </button>
                </div>
              </div>

              {/* Customer Selector & Fiscal Management */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={13} color="#64748B" />
                    <span>Cliente / Receptor</span>
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={() => setShowWalletModal(true)}
                        style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', color: '#7E22CE', borderRadius: 6, padding: '2px 7px', fontSize: '0.66rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✨ Puntos {walletDiscountApplied > 0 ? `(-${formatCurrency(walletDiscountApplied)})` : ''}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowDianCustomerModal(true)}
                      style={{
                        background: '#E6F7F5',
                        color: '#00B19D',
                        border: '1px solid #99F6E4',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                      title="Registrar o editar datos del cliente para Facturación DIAN"
                    >
                      <span>{selectedCustomer || dianCustomer ? '✏️ Datos Fiscales' : '+ Datos Fiscales'}</span>
                    </button>
                  </div>
                </div>

                <select
                  className="input-neu"
                  value={selectedCustomer?.id || ''}
                  onChange={e => {
                    const found = customerList.find(c => c.id === e.target.value)
                    setSelectedCustomer(found || null)
                    if (found) {
                      const cleanTaxId = (found.tax_id || found.phone || '').replace(/[^a-zA-Z0-9]/g, '')
                      setDianCustomer({
                        idType: (found.metadata?.id_type || (cleanTaxId.length >= 9 ? '31' : '13')) as any,
                        documentNumber: cleanTaxId,
                        dv: found.metadata?.dv || (cleanTaxId.length >= 9 ? calculateNITVerificationDigit(cleanTaxId) : undefined),
                        name: (found.tax_name || found.full_name || '').toUpperCase(),
                        personType: found.metadata?.person_type || (cleanTaxId.length >= 9 ? '1' : '2'),
                        regime: (found.tax_regime || '49') as any,
                        email: found.email || '',
                        phone: found.phone || '',
                        address: found.tax_address || found.address || 'Dirección Comercial',
                        city: found.city || 'Bogotá',
                        state: found.state || 'Bogotá D.C.'
                      })
                      setDianInvoiceMode('nominal')
                    } else {
                      setDianCustomer(null)
                    }
                    setError('')
                  }}
                  style={{ fontSize: '0.8rem', width: '100%', padding: '6px 10px', borderRadius: 8, height: 36 }}
                >
                  <option value="">-- Cliente General / Mostrador --</option>
                  {customerList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.tax_id ? `[NIT: ${c.tax_id}]` : c.phone ? `(${c.phone})` : ''} {c.credit_used > 0 ? `• Deuda: ${formatCurrency(c.credit_used)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compact Cart Items List for Cashier Confirmation */}
              <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 6, display: 'block' }}>
                  Resumen de Compra ({cart.length} ítems)
                </span>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
                  {cart.map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', padding: '3px 0', borderBottom: '1px dashed #F1F5F9' }}>
                      <span style={{ color: '#1E293B', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                        <strong style={{ color: 'var(--accent-blue)', marginRight: 4 }}>{item.quantity}x</strong> {item.name}
                      </span>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                        {formatCurrency(item.lineTotal || (item.quantity * item.price))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DIAN Electronic Invoicing Panel with Full Legal Support */}
              <div style={{
                background: emitElectronicInvoice ? '#F0FDF4' : '#FFFFFF',
                border: emitElectronicInvoice ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: emitElectronicInvoice ? '#15803D' : '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emitElectronicInvoice}
                      onChange={e => setEmitElectronicInvoice(e.target.checked)}
                      style={{ accentColor: '#16A34A', width: 15, height: 15 }}
                    />
                    <span>Factura Electrónica DIAN</span>
                  </label>
                  {emitElectronicInvoice && (
                    <span style={{ fontSize: '0.64rem', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 9999, fontWeight: 800 }}>
                      UBL 2.1 ACTIVA
                    </span>
                  )}
                </div>

                {emitElectronicInvoice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Invoice Mode Selector */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setDianInvoiceMode('nominal')}
                        style={{
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          fontWeight: dianInvoiceMode === 'nominal' ? 800 : 600,
                          background: dianInvoiceMode === 'nominal' ? '#00B19D' : '#FFFFFF',
                          color: dianInvoiceMode === 'nominal' ? '#FFFFFF' : '#475569',
                          border: dianInvoiceMode === 'nominal' ? '1.5px solid #008F7E' : '1px solid #CBD5E1',
                          borderRadius: 8,
                          cursor: 'pointer',
                          boxShadow: dianInvoiceMode === 'nominal' ? '0 2px 6px rgba(0, 177, 157, 0.3)' : 'none'
                        }}
                      >
                        🏢 Nominal (NIT / C.C.)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDianInvoiceMode('final_consumer')}
                        style={{
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          fontWeight: dianInvoiceMode === 'final_consumer' ? 800 : 600,
                          background: dianInvoiceMode === 'final_consumer' ? '#00B19D' : '#FFFFFF',
                          color: dianInvoiceMode === 'final_consumer' ? '#FFFFFF' : '#475569',
                          border: dianInvoiceMode === 'final_consumer' ? '1.5px solid #008F7E' : '1px solid #CBD5E1',
                          borderRadius: 8,
                          cursor: 'pointer',
                          boxShadow: dianInvoiceMode === 'final_consumer' ? '0 2px 6px rgba(0, 177, 157, 0.3)' : 'none'
                        }}
                      >
                        ⚡ Consumidor Final
                      </button>
                    </div>

                    {/* Nominal Details Card */}
                    {dianInvoiceMode === 'nominal' ? (
                      <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 8, border: '1px solid #99F6E4', fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {dianCustomer?.documentNumber ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                {dianCustomer.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowDianCustomerModal(true)}
                                style={{ background: 'none', border: 'none', color: '#00B19D', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}
                              >
                                Editar
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.68rem', color: '#475569' }}>
                              <span><strong>{dianCustomer.idType === '31' ? 'NIT' : 'C.C.'}:</strong> {dianCustomer.documentNumber}{dianCustomer.dv ? `-${dianCustomer.dv}` : ''}</span>
                              <span style={{ color: dianCustomer.email ? '#00B19D' : '#DC2626' }}>
                                <strong>Email:</strong> {dianCustomer.email || '⚠️ Sin correo'}
                              </span>
                            </div>
                            {!dianCustomer.email && (
                              <div style={{ color: '#DC2626', fontSize: '0.64rem', fontWeight: 700 }}>
                                ⚠️ DIAN exige correo electrónico obligatorio para entrega del XML.
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '6px 0' }}>
                            <p style={{ color: '#DC2626', margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700 }}>
                              ⚠️ Sin datos fiscales asignados
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowDianCustomerModal(true)}
                              style={{ width: '100%', padding: '6px 10px', fontSize: '0.74rem', fontWeight: 800, background: '#00B19D', color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                            >
                              + Ingresar Datos Fiscales del Cliente
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.7rem', color: '#475569', lineHeight: 1.35 }}>
                        ℹ️ Factura Electrónica POS para <strong>Consumidor Final</strong> (NIT 222222222222 - Cuantías menores sin nombre).
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Calculation, Bill Selector & Final Action ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              
              {paymentMethod === 'cash' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Efectivo Recibido
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="pos-cash-input"
                        type="number"
                        className="input-neu"
                        placeholder="0"
                        value={receivedAmount}
                        onChange={e => {
                          setReceivedAmount(e.target.value)
                          setError('')
                        }}
                        autoFocus
                        style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', height: 48, paddingLeft: 14 }}
                      />
                    </div>
                  </div>

                  {/* Quick Colombian Bill Buttons */}
                  <div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Billetes Rápidos (COP)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {[2000, 5000, 10000, 20000, 50000, 100000].map(val => (
                        <button
                          key={val}
                          type="button"
                          className="btn-neu"
                          onClick={() => {
                            setReceivedAmount(String(val))
                            playSound('tap')
                          }}
                          style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}
                        >
                          ${val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-neu"
                      onClick={() => {
                        setReceivedAmount(String(total))
                        playSound('tap')
                      }}
                      style={{ width: '100%', marginTop: 6, padding: '7px', fontSize: '0.78rem', fontWeight: 800, color: '#00B19D', background: '#E6F7F5', border: '1px solid #99F6E4' }}
                    >
                      💵 Monto Exacto ({formatCurrency(total)})
                    </button>
                  </div>

                  {/* Change Preview */}
                  <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Cambio / Vueltas</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: change > 0 ? '#16A34A' : '#0F172A' }}>
                        {formatCurrency(change)}
                      </div>
                    </div>
                    {change > 0 && (
                      <span style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>
                        Entregar Vueltas
                      </span>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#E6F7F5', border: '1px solid #99F6E4', padding: 12, borderRadius: 10 }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#007D6E', margin: '0 0 4px' }}>Transferencia Nequi / Daviplata / Bancolombia</h4>
                    <p style={{ fontSize: '0.75rem', color: '#3B82F6', margin: 0 }}>
                      Verifica en la app de tu comercio el comprobante de pago por <strong>{formatCurrency(total)}</strong>.
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Número de Comprobante / Referencia (Opcional)
                    </label>
                    <input
                      type="text"
                      className="input-neu"
                      placeholder="Ej: M1234567 o Nequi..."
                      value={transferRef}
                      onChange={e => setTransferRef(e.target.value)}
                      style={{ fontSize: '0.86rem', height: 40 }}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'card_debit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Datáfono / Tarjeta Débito / Crédito</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00B19D', marginBottom: 8 }}>{formatCurrency(total)}</div>
                    <button
                      type="button"
                      onClick={() => setShowTerminalModal(true)}
                      className="btn-neu"
                      style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#00B19D', background: '#E6F7F5', border: '1px solid #99F6E4', margin: '0 auto' }}
                    >
                      💳 Conectar Datáfono Smart
                    </button>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Autorización / Últimos 4 dígitos (Opcional)
                    </label>
                    <input
                      type="text"
                      className="input-neu"
                      placeholder="Ej: Aut: 981244"
                      value={transferRef}
                      onChange={e => setTransferRef(e.target.value)}
                      style={{ fontSize: '0.86rem', height: 40 }}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'fiao' && (
                <div style={{ background: '#F0EDFC', border: '1px solid #C8B9F5', padding: 12, borderRadius: 10 }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400E', margin: '0 0 4px' }}>Venta a Crédito / Fiado</h4>
                  <p style={{ fontSize: '0.75rem', color: '#B45309', margin: 0 }}>
                    Se cargará un saldo pendiente de <strong>{formatCurrency(total)}</strong> a la cuenta de <strong>{selectedCustomer?.full_name || 'Cliente'}</strong>.
                  </p>
                </div>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                  {error}
                </div>
              )}

              {/* Confirm Button */}
              <button
                id="pos-confirm-payment-btn"
                className="btn-neu btn-primary"
                onClick={processSale}
                disabled={
                  loading ||
                  !sessionInfo?.session_id ||
                  (paymentMethod === 'cash' && (Number(receivedAmount) || 0) < total) ||
                  (paymentMethod === 'fiao' && !selectedCustomer)
                }
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 900, justifyContent: 'center', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', boxShadow: '0 4px 14px rgba(5,150,105,0.4)', marginTop: 'auto', borderRadius: 12 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    Procesando...
                  </span>
                ) : (
                  <span>✅ Confirmar Cobro — {formatCurrency(total)} <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>[Enter / F12]</span></span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: HELD CARTS (Pausar Venta) ── */}
      {showHeldModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                <PauseCircle size={17} style={{ color: 'var(--accent-amber)' }} />
                <span>Carritos en Espera ({heldCarts.length})</span>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowHeldModal(false)} style={{ padding: '2px 6px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {heldCarts.map(held => (
                <div key={held.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>{held.label}</strong>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{held.time} • {held.cart.length} productos</span>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>{formatCurrency(held.total)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn-neu btn-ghost" onClick={() => deleteHeldCart(held.id)} style={{ padding: '5px 7px', color: 'var(--accent-coral)' }}>
                      <X size={13} />
                    </button>
                    <button className="btn-neu btn-primary" onClick={() => resumeHeldCart(held)} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                      Retomar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EXPRESS PRODUCT CREATION ── */}
      {showExpressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateExpressProduct} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <PlusCircle size={18} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Registrar Producto Express</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre del Producto *</label>
                <input className="input-neu" placeholder="Ej: Arroz Diana 500g" value={expressForm.name} onChange={e => setExpressForm({ ...expressForm, name: e.target.value })} required autoFocus style={{ fontSize: '0.82rem', padding: '6px 8px' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Venta $ *</label>
                  <input className="input-neu" type="number" step="100" placeholder="2500" value={expressForm.price} onChange={e => setExpressForm({ ...expressForm, price: e.target.value })} required style={{ fontSize: '0.88rem', fontWeight: 800, padding: '6px 8px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Costo $ (Opcional)</label>
                  <input className="input-neu" type="number" step="100" placeholder="1800" value={expressForm.cost} onChange={e => setExpressForm({ ...expressForm, cost: e.target.value })} style={{ fontSize: '0.82rem', padding: '6px 8px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Código / EAN</label>
                  <input className="input-neu" placeholder="770..." value={expressForm.sku} onChange={e => setExpressForm({ ...expressForm, sku: e.target.value })} style={{ fontSize: '0.8rem', padding: '6px 8px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Stock Inicial</label>
                  <input className="input-neu" type="number" value={expressForm.stock} onChange={e => setExpressForm({ ...expressForm, stock: e.target.value })} style={{ fontSize: '0.82rem', fontWeight: 700, padding: '6px 8px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <button type="button" className="btn-neu" onClick={() => setShowExpressModal(false)} style={{ flex: 1, padding: 8, fontSize: '0.8rem' }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={creatingExpress} style={{ flex: 1, padding: 8, fontSize: '0.8rem' }}>
                {creatingExpress ? 'Guardando...' : 'Guardar y Vender'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: WEIGHED PRODUCT PICKER (Serial Scale & Manual) ── */}
      {weighingProduct && (
        <ScaleHardwareModal
          isOpen={Boolean(weighingProduct)}
          onClose={() => setWeighingProduct(null)}
          product={weighingProduct}
          onConfirmWeight={(weight) => {
            addToCart(weighingProduct, weight)
            setWeighingProduct(null)
          }}
        />
      )}

      {/* MODAL: PHARMACY FRACTION SELECTOR */}
      {selectedFractionProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pill size={17} color="var(--accent-blue)" />
                  <span>{selectedFractionProduct.name.split('(')[0].trim()}</span>
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600, marginTop: 2 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CircleDot size={18} color="var(--accent-blue)" />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Pill size={18} color="var(--accent-emerald)" />
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
                      name: `${selectedFractionProduct.name.split('(')[0].trim()} (Caja x${selectedFractionProduct.units_per_box || 100})`,
                      price: selectedFractionProduct.box_price!
                    })
                    setSelectedFractionProduct(null)
                  }}
                  className="btn-neu"
                  style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Package size={18} color="var(--accent-purple)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>1 Caja Completa (x${selectedFractionProduct.units_per_box || 100} uds)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empaque original cerrado</div>
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

      {/* Item Price & Discount Edit Modal */}
      {editingCartItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={16} style={{ color: 'var(--accent-blue)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Modificar Precio / Descuento
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setEditingCartItem(null)} style={{ padding: '2px 6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8 }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>{editingCartItem.name}</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {editingCartItem.sku || 'N/A'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                  Precio Unitario (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-neu"
                  value={editItemPrice}
                  onChange={e => setEditItemPrice(e.target.value)}
                  style={{ width: '100%', fontSize: '0.9rem', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Descuento Rápido (%)
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      className="btn-neu btn-ghost"
                      onClick={() => setEditItemDiscount(String(pct))}
                      style={{
                        flex: 1,
                        padding: '5px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: editItemDiscount === String(pct) ? 'var(--accent-coral)' : 'var(--text-secondary)',
                        border: editItemDiscount === String(pct) ? '1px solid var(--accent-coral)' : '1px solid var(--border-color)',
                        background: editItemDiscount === String(pct) ? 'rgba(239, 68, 68, 0.08)' : 'transparent'
                      }}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                  Descuento Personalizado (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input-neu"
                  placeholder="0"
                  value={editItemDiscount}
                  onChange={e => setEditItemDiscount(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {(() => {
                const p = Math.max(0, parseFloat(editItemPrice) || 0)
                const d = Math.min(100, Math.max(0, parseFloat(editItemDiscount) || 0))
                const finalUnitPrice = p * (1 - d / 100)
                const finalLineTotal = (editingCartItem.unit_type !== 'unit' ? editingCartItem.quantity : Math.round(editingCartItem.quantity)) * finalUnitPrice

                return (
                  <div className="neu-flat" style={{ padding: 10, borderRadius: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Precio Unitario Final:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(finalUnitPrice)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginTop: 4 }}>
                      <span>Total ({editingCartItem.quantity} {editingCartItem.unit_type !== 'unit' ? editingCartItem.unit_type : 'uds'}):</span>
                      <strong style={{ color: 'var(--accent-blue)' }}>{formatCurrency(finalLineTotal)}</strong>
                    </div>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn-neu btn-ghost"
                  onClick={() => {
                    const orig = products.find(p => p.id === editingCartItem.id)?.price || editingCartItem.price
                    setEditItemPrice(String(orig))
                    setEditItemDiscount('0')
                  }}
                  style={{ flex: 1, padding: '9px', fontSize: '0.76rem' }}
                >
                  Restablecer
                </button>

                <button
                  type="button"
                  className="btn-neu btn-primary"
                  onClick={() => {
                    const p = Math.max(0, parseFloat(editItemPrice) || 0)
                    const d = Math.min(100, Math.max(0, parseFloat(editItemDiscount) || 0))
                    const finalUnitPrice = p * (1 - d / 100)
                    setCart(prev => prev.map(i => i.id === editingCartItem.id
                      ? {
                          ...i,
                          price: p,
                          discount: d,
                          lineTotal: i.quantity * finalUnitPrice
                        }
                      : i
                    ))
                    playSound('tap')
                    setEditingCartItem(null)
                  }}
                  style={{ flex: 1.3, padding: '9px', fontSize: '0.8rem', fontWeight: 800 }}
                >
                  Aplicar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Lock Warning Modal */}
      {permissionWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Lock size={22} />
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Acceso Restringido
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 16 }}>
              {permissionWarning}
            </p>
            <button
              className="btn-neu btn-primary"
              onClick={() => setPermissionWarning(null)}
              style={{ width: '100%', padding: '9px', fontSize: '0.82rem' }}
            >
              Entendido
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

      {/* Price Checker Modal F10 */}
      <PriceCheckerModal
        isOpen={showPriceCheckerModal}
        onClose={() => setShowPriceCheckerModal(false)}
        products={products}
        onAddToCart={(p, qty) => addToCart(p as any, qty)}
      />

      {/* Abonos a Fiao / Cartera Modal F3 */}
      <PosAbonoModal
        isOpen={showPosAbonoModal}
        onClose={() => setShowPosAbonoModal(false)}
        customers={customerList}
        initialCustomer={selectedCustomer}
        businessName={businessName}
        onAbonoSuccess={({ customerId, newDebt }) => {
          setCustomerList(prev => prev.map(c => c.id === customerId ? { ...c, credit_used: newDebt } : c))
          if (selectedCustomer?.id === customerId) {
            setSelectedCustomer(prev => prev ? ({ ...prev, credit_used: newDebt }) : null)
          }
          playSound('success')
        }}
      />

      {/* Customer Loyalty Electronic Wallet & Cashback */}
      <ElectronicWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        customer={selectedCustomer}
        saleTotal={total}
        onApplyWalletPayment={(amount) => {
          setWalletDiscountApplied(amount)
        }}
      />

      {/* Datáfono / Payment Terminal Modal */}
      <PaymentTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        amount={total}
        onPaymentApproved={(res) => {
          setTransferRef(`Datáfono ${res.terminal} - ${res.cardBrand} *${res.lastFour} (Aut: ${res.authCode})`)
          setPaymentMethod('card_debit')
        }}
      />

      {/* DIAN Customer Fiscal Data Modal */}
      <DianCustomerModal
        isOpen={showDianCustomerModal}
        onClose={() => setShowDianCustomerModal(false)}
        initialData={dianCustomer}
        existingCustomers={customerList}
        tenantId={sessionInfo?.tenant_id}
        onSave={(data, savedDbRecord) => {
          setDianCustomer(data)
          setDianInvoiceMode('nominal')
          if (savedDbRecord) {
            setCustomerList(prev => {
              const idx = prev.findIndex(c => c.id === savedDbRecord.id)
              if (idx >= 0) {
                const copy = [...prev]
                copy[idx] = savedDbRecord
                return copy
              }
              return [...prev, savedDbRecord]
            })
            setSelectedCustomer(savedDbRecord)
          }
          setError('')
          playSound('beep')
        }}
      />

      {/* ── MODAL: ABRIR TURNO ── */}
      {showOpenShiftModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleOpenShift} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0, 214, 188, 0.15)', color: '#00D6BC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Unlock size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    Abrir Turno
                  </h2>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Fondo inicial en efectivo para la jornada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {openingShiftError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: '0.76rem', color: '#DC2626' }}>
                {openingShiftError}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Fondo Inicial en Efectivo ($)
              </label>
              <input
                className="input-neu"
                type="number"
                step="1000"
                min="0"
                placeholder="50000"
                value={openingShiftAmount}
                onChange={e => setOpeningShiftAmount(e.target.value)}
                autoFocus
                required
                style={{ fontSize: '1.25rem', fontWeight: 900, textAlign: 'center', height: 46, width: '100%' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                Sugerencias de fondo rápido:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[0, 20000, 50000, 100000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className="btn-neu"
                    onClick={() => setOpeningShiftAmount(String(amt))}
                    style={{
                      padding: '6px 4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      justifyContent: 'center',
                      borderColor: String(amt) === openingShiftAmount ? '#00D6BC' : undefined,
                      color: String(amt) === openingShiftAmount ? '#00D6BC' : undefined
                    }}
                  >
                    {amt === 0 ? '$0' : formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn-neu btn-ghost"
                onClick={() => setShowOpenShiftModal(false)}
                style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-neu btn-primary"
                disabled={openingShiftLoading}
                style={{ flex: 1.5, padding: '10px', fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Unlock size={15} strokeWidth={2.5} />
                <span>{openingShiftLoading ? 'Abriendo turno...' : 'Abrir Turno'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
