'use client'
import { useState, useCallback, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  price: number
  sku: string
  emoji: string
  stock: number
  category: string
  cost: number
  category_id?: string
  warehouse_id?: string
}

interface CartItem extends Product {
  quantity: number
  discount: number
  lineTotal: number
}

const PAYMENT_METHODS = [
  { key: 'cash', label: '💵 Efectivo' },
  { key: 'card_debit', label: '💳 Débito' },
  { key: 'card_credit', label: '💳 Crédito' },
  { key: 'transfer', label: '📱 Transferencia' },
]

const EMOJIS = ['🥤', '🥛', '🍞', '🫙', '🧼', '🧻', '🧽', '🍚', '☕', '🍗', '🫘', '🧴', '🍎', '🥩', '🍟']

export default function POSClient() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [step, setStep] = useState<'cart' | 'payment' | 'done'>('cart')
  const [loading, setLoading] = useState(false)
  const [saleNumber, setSaleNumber] = useState('')
  const [error, setError] = useState('')

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

  // Fetch session data and products
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id
        const user_id = user.id

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
          const loadedProducts: Product[] = prodData.map((p: any, idx: number) => {
            // Find inventory for current warehouse or sum all
            const whStock = p.inventory?.find((inv: any) => inv.warehouse_id === warehouse_id)
            const stock = whStock ? Number(whStock.quantity) : 0
            const catName = p.categories?.name || 'General'

            return {
              id: p.id,
              name: p.name,
              price: Number(p.sale_price),
              cost: Number(p.cost_price),
              sku: p.sku || p.barcode || '',
              emoji: EMOJIS[idx % EMOJIS.length],
              stock,
              category: catName,
              category_id: p.category_id,
              warehouse_id
            }
          })
          setProducts(loadedProducts)

          const cats = ['Todos', ...Array.from(new Set(loadedProducts.map(p => p.category)))]
          setCategories(cats)
        }
      } catch (err: any) {
        console.error('Error loading POS data:', err)
        setError('Error al cargar datos del POS')
      }
    }

    loadData()
  }, [])

  const filtered = search.trim() === '' ? [] : products.filter(p => {
    const matchCat = category === 'Todos' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id
          ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.price * (1 - i.discount / 100) }
          : i
        )
      }
      return [...prev, { ...product, quantity: 1, discount: 0, lineTotal: product.price }]
    })
  }, [])

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) { removeFromCart(id); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty, lineTotal: qty * i.price * (1 - i.discount / 100) } : i))
  }

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id))

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0)
  const discountAmt = subtotal * (discount / 100)
  const total = subtotal - discountAmt
  const change = paymentMethod === 'cash' ? Math.max(0, Number(receivedAmount) - total) : 0

  async function processSale() {
    if (!sessionInfo) return
    setLoading(true)
    setError('')

    const salePayload = {
      tenant_id: sessionInfo.tenant_id,
      seller_id: sessionInfo.user_id,
      register_id: sessionInfo.register_id,
      session_id: sessionInfo.session_id,
      branch_id: sessionInfo.branch_id,
      customer_id: null, // Default
      subtotal,
      discount_amount: discountAmt,
      tax_amount: total * 0.16, // Simulating 16% tax
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
        tax_rate: 16.00,
        tax_amount: item.lineTotal * 0.16,
        subtotal: item.lineTotal / 1.16,
        total: item.lineTotal,
        cost_price: item.cost,
        warehouse_id: sessionInfo.warehouse_id
      })),
      payments: [
        {
          payment_method: paymentMethod,
          amount: total,
          received_amount: paymentMethod === 'cash' ? Number(receivedAmount) : total,
          change_amount: change
        }
      ]
    }

    try {
      const { data, error: rpcErr } = await supabase.rpc('process_sale', { p_sale_data: salePayload })
      if (rpcErr) throw rpcErr
      if (data && data.success === false) throw new Error(data.error)

      setSaleNumber(data.number)
      
      // Update local products stock
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(ci => ci.id === p.id)
        return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p
      }))

      setStep('done')
    } catch (err: any) {
      console.error('Error processing sale:', err)
      setError(err.message || 'Error al procesar la venta en el servidor')
    } finally {
      setLoading(false)
    }
  }

  function newSale() {
    setCart([])
    setDiscount(0)
    setPaymentMethod('cash')
    setReceivedAmount('')
    setStep('cart')
  }

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div className="neu-card animate-scale-in" style={{ padding: '52px 44px', textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 8 }}>¡Venta completada!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>Folio: <strong>{saleNumber}</strong></p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>Total: <strong>{formatCurrency(total)}</strong></p>
          {change > 0 && <p style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>Cambio: {formatCurrency(change)}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button className="btn-neu" style={{ flex: 1, padding: '12px', fontSize: '0.875rem' }} onClick={() => alert('Ticket impreso / enviado')}>🖨 Ticket</button>
            <button className="btn-neu btn-primary" style={{ flex: 2, padding: '12px', fontSize: '0.875rem' }} onClick={newSale}>+ Nueva venta</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, width: '100%' }}>

      {/* ── LEFT: Products ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        {/* Search */}
        <div className="input-group">
          <span className="input-icon" style={{ fontSize: '1rem' }}>🔍</span>
          <input className="input-neu" placeholder="Buscar producto por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map(c => (
            <button key={c} className="btn-neu" onClick={() => setCategory(c)}
              style={{ padding: '7px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0, background: category === c ? 'var(--accent-blue)' : 'var(--bg)', color: category === c ? '#fff' : 'var(--text-secondary)', boxShadow: category === c ? '4px 4px 10px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, alignContent: 'start', paddingRight: 4 }}>
          {filtered.map(product => (
            <button key={product.id} className="pos-product-btn" onClick={() => addToCart(product)}>
              <div style={{ fontSize: '2rem', marginBottom: 4 }}>{product.emoji}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{product.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(product.price)}</span>
                <span style={{ fontSize: '0.68rem', color: product.stock <= 5 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>{product.stock} uds</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
              <div>{search.trim() === '' ? 'Escribe para buscar un producto o número de producto' : 'No se encontraron coincidencias'}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }} className="neu-card">

        {step === 'cart' && (
          <>
            {/* Cart header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--bg-deep)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>🛒 Carrito</span>
                {cart.length > 0 && (
                  <button className="btn-neu btn-ghost" onClick={() => setCart([])} style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}>Limpiar</button>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🛍</div>
                  <div style={{ fontSize: '0.875rem' }}>Toca un producto para agregarlo</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cart.map(item => (
                    <div key={item.id} className="neu-flat" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.3rem' }}>{item.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatCurrency(item.price)} c/u</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button className="btn-neu btn-icon-sm" onClick={() => updateQty(item.id, item.quantity - 1)} style={{ fontSize: '1rem', fontWeight: 700 }}>−</button>
                        <span style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{item.quantity}</span>
                        <button className="btn-neu btn-icon-sm btn-primary" onClick={() => updateQty(item.id, item.quantity + 1)} style={{ fontSize: '1rem', fontWeight: 700 }}>+</button>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{formatCurrency(item.lineTotal)}</div>
                        <button onClick={() => removeFromCart(item.id)} style={{ fontSize: '0.7rem', color: 'var(--accent-coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Quitar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount */}
            {cart.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--bg-deep)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Descuento %</span>
                  <input className="input-neu" type="number" min={0} max={100} value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
                </div>
              </div>
            )}

            {/* Totals */}
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--bg-deep)', background: 'var(--bg-deep)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--accent-coral)' }}>
                    <span>Descuento ({discount}%)</span><span>-{formatCurrency(discountAmt)}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  <span>Total</span><span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(total)}</span>
                </div>
              </div>
              <button className="btn-neu btn-primary" disabled={cart.length === 0} onClick={() => setStep('payment')} style={{ width: '100%', padding: '14px', fontSize: '0.95rem', justifyContent: 'center' }}>
                💳 Cobrar {formatCurrency(total)}
              </button>
            </div>
          </>
        )}

        {/* ── PAYMENT STEP ── */}
        {step === 'payment' && (
          <>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--bg-deep)' }}>
              <button className="btn-neu btn-ghost" onClick={() => setStep('cart')} style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: 8 }}>← Volver</button>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Método de pago</div>
              <div style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--accent-blue)', marginTop: 4 }}>{formatCurrency(total)}</div>
            </div>

            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Payment methods */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.key} className="btn-neu" onClick={() => setPaymentMethod(pm.key)}
                    style={{ padding: '12px 10px', fontSize: '0.82rem', flexDirection: 'column', gap: 4, height: 64, justifyContent: 'center', background: paymentMethod === pm.key ? 'var(--accent-blue)' : 'var(--bg)', color: paymentMethod === pm.key ? '#fff' : 'var(--text-secondary)', boxShadow: paymentMethod === pm.key ? '4px 4px 12px rgba(74,144,217,0.4)' : 'var(--neu-raised)' }}>
                    {pm.label}
                  </button>
                ))}
              </div>

              {/* Cash received input */}
              {paymentMethod === 'cash' && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Efectivo recibido</div>
                  <input className="input-neu" type="number" placeholder={total.toFixed(2)} value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'right' }} />
                  {Number(receivedAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '10px 14px', background: 'var(--accent-green-lt)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-green)' }}>Cambio</span>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-green)' }}>{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick amount buttons for cash */}
              {paymentMethod === 'cash' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[50, 100, 200, 500, 1000, Math.ceil(total / 10) * 10].map(amt => (
                    <button key={amt} className="btn-neu" onClick={() => setReceivedAmount(String(amt))} style={{ padding: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                      ${amt}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 18px', borderTop: '1px solid var(--bg-deep)' }}>
              <button className="btn-neu btn-success" onClick={processSale} disabled={loading || (paymentMethod === 'cash' && Number(receivedAmount) < total && receivedAmount !== '')}
                style={{ width: '100%', padding: '15px', fontSize: '1rem', justifyContent: 'center' }}>
                {loading ? '⏳ Procesando...' : '✓ Confirmar pago'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
