'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingBag,
  Store,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  Minus,
  CheckCircle2,
  Send,
  ArrowLeft,
  Package,
  ShoppingCart
} from 'lucide-react'

interface StoreSettings {
  tenant_id: string
  store_name: string
  description: string | null
  logo_url: string | null
  primary_color: string
  currency: string
  whatsapp_phone?: string | null
}

interface Product {
  id: string
  name: string
  sale_price: number
  sku: string
  description: string | null
}

interface CartItem extends Product {
  quantity: number
}

export default function StoreClient({ subdomain }: { subdomain: string }) {
  const supabase = createClient()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [checkoutStep, setCheckoutStep] = useState<'browse' | 'checkout' | 'done'>('browse')
  const [storeWhatsapp, setStoreWhatsapp] = useState<string>('')

  // Customer form
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cash_on_delivery',
    changeAmount: '50000',
    notes: ''
  })

  useEffect(() => {
    async function loadStore() {
      try {
        const { data: storeData, error: storeErr } = await supabase
          .from('ecommerce_settings')
          .select('tenant_id, store_name, description, logo_url, primary_color, currency, whatsapp_phone')
          .eq('subdomain', subdomain)
          .single()

        if (storeErr) throw storeErr

        if (storeData) {
          setSettings(storeData as any)

          let phoneToUse = storeData.whatsapp_phone || ''
          if (!phoneToUse) {
            const { data: tenantData } = await supabase
              .from('tenant_settings')
              .select('whatsapp, phone')
              .eq('tenant_id', storeData.tenant_id)
              .limit(1)
            
            if (tenantData?.[0]) {
              phoneToUse = tenantData[0].whatsapp || tenantData[0].phone || ''
            }
          }
          setStoreWhatsapp(phoneToUse)

          const { data: prodData, error: prodErr } = await supabase
            .from('products')
            .select('id, name, sale_price, sku, description')
            .eq('tenant_id', storeData.tenant_id)
            .eq('is_active', true)

          if (prodErr) throw prodErr
          if (prodData) setProducts(prodData as any)
        }
      } catch (err) {
        console.error('Error loading store:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStore()
  }, [subdomain])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) {
      setCart(prev => prev.filter(i => i.id !== id))
      return
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.sale_price * i.quantity, 0)

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (!settings || submitting) return
    setSubmitting(true)

    try {
      const orderNum = 'ORD-' + String(Math.floor(Math.random() * 90000) + 10000)

      const payload = {
        tenant_id: settings.tenant_id,
        order_number: orderNum,
        subtotal,
        total: subtotal,
        items: cart.map(i => ({
          product_id: i.id,
          product_name: i.name,
          quantity: i.quantity,
          unit_price: i.sale_price,
          total: i.sale_price * i.quantity
        })),
        shipping_address: { address: customer.address },
        billing_address: {},
        payment_method: customer.paymentMethod,
        payment_status: 'pending',
        notes: customer.notes,
        customer_notes: `Nombre: ${customer.name}, Teléfono: ${customer.phone}`
      }

      await supabase.from('ecommerce_orders').insert(payload)

      setOrderNumber(orderNum)
      setCheckoutStep('done')

      // WhatsApp format
      let cleanPhone = storeWhatsapp.replace(/\D/g, '')
      if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
        cleanPhone = '57' + cleanPhone
      }

      const itemsText = cart.map(i => `• ${i.quantity}x ${i.name} (${formatCurrency(i.sale_price * i.quantity)})`).join('\n')
      const paymentText = customer.paymentMethod === 'cash_on_delivery'
        ? `Efectivo contra entrega (Cambio de ${formatCurrency(Number(customer.changeAmount) || 0)})`
        : `Nequi / Daviplata`

      const message = `*NUEVO PEDIDO DE DOMICILIO* (#${orderNum})
*${settings.store_name}*

*Cliente:* ${customer.name}
*Teléfono:* ${customer.phone}
*Dirección:* ${customer.address}

*PRODUCTOS:*
${itemsText}

*TOTAL:* ${formatCurrency(subtotal)}
*Pago:* ${paymentText}
${customer.notes ? `*Notas:* ${customer.notes}` : ''}`

      if (cleanPhone) {
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
      }

      setCart([])
    } catch (err) {
      console.error(err)
      alert('Error al realizar el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8F9FA' }}>
        <div style={{ fontWeight: 600, color: '#6B7280' }}>Cargando tienda...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8F9FA', gap: 10, padding: 20 }}>
        <Store size={44} style={{ color: '#9CA3AF' }} />
        <h1 style={{ fontWeight: 800, color: '#1F2937', fontSize: '1.25rem' }}>Tienda no encontrada</h1>
        <p style={{ color: '#6B7280', textAlign: 'center', fontSize: '0.85rem' }}>El enlace no corresponde a ninguna tienda activa.</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#F4F6F8', minHeight: '100vh', paddingBottom: 80, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
            )}
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1rem', color: '#1F2937', margin: 0 }}>{settings.store_name}</h1>
              <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>{settings.description || 'Catálogo Digital'}</p>
            </div>
          </div>
          {cart.length > 0 && checkoutStep === 'browse' && (
            <button onClick={() => setCheckoutStep('checkout')}
              style={{ background: '#25D366', color: '#fff', border: 'none', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <ShoppingCart size={15} />
              <span>Ver Carrito ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            </button>
          )}
        </div>
      </header>

      {/* Done State */}
      {checkoutStep === 'done' && (
        <div style={{ maxWidth: 440, margin: '40px auto 0', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: '#25D366', margin: '0 auto 12px' }} />
          <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1F2937', marginBottom: 6 }}>¡Pedido recibido y enviado a WhatsApp!</h2>
          <p style={{ color: '#6B7280', fontSize: '0.82rem', marginBottom: 14 }}>La tienda ya tiene registrado tu pedido en su sistema.</p>
          <div style={{ background: '#F3F4F6', padding: 10, borderRadius: 10, display: 'inline-block', marginBottom: 20 }}>
            <span style={{ fontSize: '0.75rem', color: '#4B5563' }}>Número de Orden:</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1F2937', marginTop: 2 }}>{orderNumber}</div>
          </div>
          <button className="btn-neu" onClick={() => setCheckoutStep('browse')} style={{ width: '100%', padding: '10px', justifyContent: 'center', fontSize: '0.85rem' }}>
            Seguir explorando la tienda
          </button>
        </div>
      )}

      {/* Checkout Screen */}
      {checkoutStep === 'checkout' && (
        <div style={{ maxWidth: 800, margin: '20px auto 0', padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Form */}
          <form onSubmit={handleCheckout} style={{ background: '#fff', padding: 20, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '1rem', color: '#1F2937' }}>
              <MapPin size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>Datos del Domicilio</span>
            </div>
            
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>Tu Nombre Completo *</label>
              <input style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem' }} placeholder="Ej: Carmen / Carlos R." value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} required />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp *</label>
              <input style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem' }} type="tel" placeholder="Ej: 3001234567" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} required />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>Dirección de Entrega *</label>
              <input style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem' }} placeholder="Ej: Calle 45 # 12-34 Apto 201" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} required />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>Forma de Pago *</label>
              <select style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none', background: '#fff', fontWeight: 700, fontSize: '0.85rem' }} value={customer.paymentMethod} onChange={e => setCustomer({ ...customer, paymentMethod: e.target.value })}>
                <option value="cash_on_delivery">💵 Efectivo Contra Entrega</option>
                <option value="nequi">📱 Nequi / Daviplata</option>
              </select>
            </div>

            {customer.paymentMethod === 'cash_on_delivery' && (
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>¿Con cuánto vas a pagar? (Para cambio)</label>
                <input style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem' }} type="number" step="1000" placeholder="50000" value={customer.changeAmount} onChange={e => setCustomer({ ...customer, changeAmount: e.target.value })} />
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>Instrucciones adicionales (Opcional)</label>
              <input style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem' }} placeholder="Ej: Timbrar duro / Dejar en portería" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn-neu" onClick={() => setCheckoutStep('browse')} style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '0.82rem' }}>Volver</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting}
                style={{ flex: 2, background: '#25D366', color: '#fff', border: 'none', padding: '10px', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={15} />
                <span>{submitting ? 'Enviando...' : 'Pedir por WhatsApp'}</span>
              </button>
            </div>
          </form>

          {/* Cart review */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1F2937', marginBottom: 12 }}>Resumen del Pedido</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: '#4B5563' }}>{item.name} x{item.quantity}</span>
                  <span style={{ fontWeight: 700, color: '#1F2937' }}>{formatCurrency(item.sale_price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Catalog */}
      {checkoutStep === 'browse' && (
        <div style={{ maxWidth: 900, margin: '24px auto 0', padding: '0 16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1F2937', marginBottom: 14 }}>Productos Disponibles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {products.map((p) => (
              <div key={p.id} style={{ background: '#fff', padding: 14, borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                  <Package size={22} style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1F2937', marginBottom: 2 }}>{p.name}</h4>
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', minHeight: 28, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description || 'Disponible para entrega inmediata'}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
                    {formatCurrency(p.sale_price)}
                  </span>
                  <button className="btn-neu" onClick={() => addToCart(p)}
                    style={{ padding: '6px 10px', fontSize: '0.75rem', background: '#F3F4F6', fontWeight: 700 }}>
                    + Agregar
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#6B7280', fontSize: '0.85rem' }}>
                No hay productos cargados en esta tienda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button for Mobile */}
      {cart.length > 0 && checkoutStep === 'browse' && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 99, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => setCheckoutStep('checkout')} className="btn-neu"
            style={{ width: '100%', maxWidth: 420, padding: '14px 18px', background: '#25D366', color: '#fff', fontSize: '0.95rem', fontWeight: 800, border: 'none', borderRadius: 24, boxShadow: '0 8px 24px rgba(37,211,102,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShoppingCart size={18} />
              <span>Pedir Domicilio ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            </span>
            <span>{formatCurrency(subtotal)} →</span>
          </button>
        </div>
      )}
    </div>
  )
}
