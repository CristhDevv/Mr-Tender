'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface StoreSettings {
  tenant_id: string
  store_name: string
  description: string | null
  logo_url: string | null
  primary_color: string
  currency: string
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

const EMOJIS = ['🍔', '🥤', '🍞', '🍕', '🥗', '🍎', '🍰', '🍪', '☕', '🥤']

export default function StoreClient({ subdomain }: { subdomain: string }) {
  const supabase = createClient()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [checkoutStep, setCheckoutStep] = useState<'browse' | 'checkout' | 'done'>('browse')

  // Customer form
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => {
    async function loadStore() {
      try {
        // Resolve settings
        const { data: storeData, error: storeErr } = await supabase
          .from('ecommerce_settings')
          .select('tenant_id, store_name, description, logo_url, primary_color, currency')
          .eq('subdomain', subdomain)
          .single()

        if (storeErr) throw storeErr

        if (storeData) {
          setSettings(storeData as any)

          // Load active products for this tenant
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
    if (!settings) return
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
        payment_method: 'cash_on_delivery',
        payment_status: 'pending',
        notes: customer.notes,
        customer_notes: `Nombre: ${customer.name}, Teléfono: ${customer.phone}, Email: ${customer.email}`
      }

      const { error: orderErr } = await supabase
        .from('ecommerce_orders')
        .insert(payload)

      if (orderErr) throw orderErr

      setOrderNumber(orderNum)
      setCheckoutStep('done')
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8F9FA', gap: 10 }}>
        <span style={{ fontSize: '3rem' }}>🧐</span>
        <h1 style={{ fontWeight: 800, color: '#1F2937' }}>Tienda no encontrada</h1>
        <p style={{ color: '#6B7280' }}>El subdominio "{subdomain}" no corresponde a ninguna tienda activa.</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#F4F6F8', minHeight: '100vh', paddingBottom: 60, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" style={{ width: 40, height: 40, borderRadius: 8 }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: settings.primary_color || 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                {settings.store_name[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1F2937' }}>{settings.store_name}</h1>
              <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{settings.description || 'Tienda en línea oficial'}</p>
            </div>
          </div>
          {cart.length > 0 && checkoutStep === 'browse' && (
            <button className="btn-neu btn-primary" onClick={() => setCheckoutStep('checkout')}
              style={{ background: settings.primary_color || 'var(--accent-blue)', padding: '10px 20px', fontSize: '0.85rem' }}>
              🛒 Ver Carrito ({cart.reduce((s, i) => s + i.quantity, 0)})
            </button>
          )}
        </div>
      </header>

      {/* Done State */}
      {checkoutStep === 'done' && (
        <div style={{ maxWidth: 500, margin: '60px auto 0', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#1F2937', marginBottom: 8 }}>¡Pedido recibido!</h2>
          <p style={{ color: '#6B7280', marginBottom: 18 }}>Hemos recibido tu pedido correctamente. El negocio se pondrá en contacto contigo.</p>
          <div style={{ background: '#F3F4F6', padding: 14, borderRadius: 12, display: 'inline-block', marginBottom: 28 }}>
            <span style={{ fontSize: '0.875rem', color: '#4B5563' }}>Número de Orden:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2937', marginTop: 4 }}>{orderNumber}</div>
          </div>
          <button className="btn-neu" onClick={() => setCheckoutStep('browse')} style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
            Seguir explorando
          </button>
        </div>
      )}

      {/* Checkout Screen */}
      {checkoutStep === 'checkout' && (
        <div style={{ maxWidth: 800, margin: '40px auto 0', padding: '0 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Form */}
          <form onSubmit={handleCheckout} style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1F2937', marginBottom: 6 }}>Información de entrega</h3>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Tu nombre completo</label>
              <input style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none' }} placeholder="Juan Pérez" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Número de teléfono</label>
              <input style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none' }} placeholder="555-123-4567" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Correo electrónico</label>
              <input style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none' }} type="email" placeholder="juan@email.com" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Dirección de entrega</label>
              <input style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none' }} placeholder="Calle falsa 123, Ciudad" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Notas adicionales</label>
              <input style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', outline: 'none' }} placeholder="Ej: dejar en portería" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="button" className="btn-neu" onClick={() => setCheckoutStep('browse')} style={{ flex: 1, padding: '12px', justifyContent: 'center' }}>Volver</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting}
                style={{ flex: 2, background: settings.primary_color || 'var(--accent-blue)', padding: '12px', justifyContent: 'center' }}>
                {submitting ? 'Enviando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </form>

          {/* Cart review */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1F2937', marginBottom: 14 }}>Resumen de compra</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: '#4B5563' }}>{item.name} x{item.quantity}</span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{formatCurrency(item.sale_price * item.quantity, settings.currency)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
              <span>Total</span>
              <span style={{ color: settings.primary_color || 'var(--accent-blue)' }}>{formatCurrency(subtotal, settings.currency)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Catalog */}
      {checkoutStep === 'browse' && (
        <div style={{ maxWidth: 1000, margin: '40px auto 0', padding: '0 20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2937', marginBottom: 20 }}>Nuestros Productos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 18 }}>
            {products.map((p, idx) => (
              <div key={p.id} style={{ background: '#fff', padding: 18, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '2.5rem', textAlign: 'center', padding: '10px 0' }}>{EMOJIS[idx % EMOJIS.length]}</div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', marginBottom: 4 }}>{p.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', minHeight: 32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description || 'Sin descripción adicional'}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontWeight: 800, color: settings.primary_color || 'var(--accent-blue)', fontSize: '1rem' }}>
                    {formatCurrency(p.sale_price, settings.currency)}
                  </span>
                  <button className="btn-neu" onClick={() => addToCart(p)}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', background: '#F3F4F6' }}>
                    + Agregar
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#6B7280' }}>
                No hay productos cargados en esta tienda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
