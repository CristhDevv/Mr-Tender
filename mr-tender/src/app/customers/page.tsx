'use client'
import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Plus,
  Search,
  Phone,
  DollarSign,
  CreditCard,
  MessageSquare,
  ShoppingCart,
  Award,
  Check,
  UserCheck,
  Receipt,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useVerticalTerms } from '@/lib/hooks/useVerticalTerms'

interface DBCustomer {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  total_purchases: number
  total_orders: number
  points_balance: number
  credit_limit: number
  credit_used: number
  last_purchase_at: string | null
  is_active: boolean
}

interface CustomerFiaoSale {
  id: string
  number: string
  total: number
  created_at: string
  sale_items?: {
    product_name: string
    quantity: number
    total: number
  }[]
}

export default function CustomersPage() {
  const supabase = createClient()
  const { t, verticalConfig } = useVerticalTerms()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [customers, setCustomers] = useState<DBCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('nuestro negocio')

  // Fiao History for selected customer
  const [customerSales, setCustomerSales] = useState<CustomerFiaoSale[]>([])
  const [loadingSales, setLoadingSales] = useState(false)

  // Modals
  const [showNewModal, setShowNewModal] = useState(false)
  const [showAbonoModal, setShowAbonoModal] = useState(false)

  // Forms
  const [newForm, setNewForm] = useState({ fullName: '', phone: '', creditLimit: '150000' })
  const [abonoAmount, setAbonoAmount] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tid = user.user_metadata?.tenant_id
      setTenantId(tid)

      const { data: tSettings } = await supabase
        .from('tenant_settings')
        .select('business_name')
        .eq('tenant_id', tid)
        .limit(1)
      
      if (tSettings?.[0]?.business_name) {
        setBusinessName(tSettings[0].business_name)
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tid)
        .order('full_name', { ascending: true })

      if (error) throw error
      if (data) {
        setCustomers(data as any)
        if (data.length > 0 && !selected) setSelected(data[0].id)
      }
    } catch (err) {
      console.error('Error loading customers:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load sales history for selected customer
  useEffect(() => {
    if (!selected || !tenantId) return
    async function loadCustomerHistory() {
      setLoadingSales(true)
      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id, number, total, created_at,
            sale_items (product_name, quantity, total)
          `)
          .eq('customer_id', selected)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!error && data) {
          setCustomerSales(data as any)
        }
      } catch (err) {
        console.error('Error loading customer sales history:', err)
      } finally {
        setLoadingSales(false)
      }
    }
    loadCustomerHistory()
  }, [selected, tenantId])

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  )

  const selectedCustomer = customers.find(c => c.id === selected)

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !newForm.fullName.trim() || submitting) return
    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          full_name: newForm.fullName.trim(),
          phone: newForm.phone.trim() || null,
          whatsapp: newForm.phone.trim() || null,
          credit_limit: Number(newForm.creditLimit) || 0,
          credit_used: 0,
          credit_days: 30,
          total_purchases: 0,
          total_orders: 0,
          points_balance: 0,
          points_total_earned: 0,
          is_active: true
        })
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setCustomers(prev => [...prev, data as any])
        setSelected(data.id)
      }

      setShowNewModal(false)
      setNewForm({ fullName: '', phone: '', creditLimit: '150000' })
    } catch (err: any) {
      console.error('Error creating customer:', err)
      alert(err.message || 'No se pudo crear el cliente')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecordAbono(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || !abonoAmount || submitting) return
    const amount = Number(abonoAmount)
    if (amount <= 0) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('record_customer_abono', {
        p_customer_id: selectedCustomer.id,
        p_amount: amount,
        p_notes: 'Abono manual'
      })

      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      const prevDebt = Number(data.prev_debt ?? selectedCustomer.credit_used ?? 0)
      const newCreditUsed = Number(data.new_debt ?? 0)

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, credit_used: newCreditUsed } : c))
      setShowAbonoModal(false)
      setAbonoAmount('')

      // Offer to send WhatsApp payment confirmation
      let rawPhone = (selectedCustomer.phone || '').replace(/\D/g, '')
      if (rawPhone) {
        if (!rawPhone.startsWith('57') && rawPhone.length === 10) rawPhone = '57' + rawPhone
        const receiptMsg = `*RECIBO DE ABONO / PAGO A CRÉDITO*
*${businessName}*
Cliente: ${selectedCustomer.full_name}
Fecha: ${new Date().toLocaleString('es-CO')}

*Monto abonado:* ${formatCurrency(amount)}
*Saldo anterior:* ${formatCurrency(prevDebt)}
*Saldo pendiente actual:* ${formatCurrency(newCreditUsed)}
*Cupo disponible:* ${formatCurrency(Number(selectedCustomer.credit_limit || 0) - newCreditUsed)}

¡Muchas gracias por su puntual abono!`

        if (confirm(`Abono de ${formatCurrency(amount)} registrado con éxito. ¿Deseas enviar el comprobante por WhatsApp al cliente?`)) {
          window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(receiptMsg)}`, '_blank')
        }
      } else {
        alert(`Abono registrado exitosamente. Deuda restante: ${formatCurrency(newCreditUsed)}`)
      }
    } catch (err: any) {
      console.error('Error recording abono:', err)
      alert(err.message || 'No se pudo registrar el abono')
    } finally {
      setSubmitting(false)
    }
  }

  function sendWhatsAppReminder() {
    if (!selectedCustomer) return
    let rawPhone = (selectedCustomer.phone || '').replace(/\D/g, '')
    if (!rawPhone) {
      alert('Este cliente no tiene número de teléfono registrado')
      return
    }

    if (!rawPhone.startsWith('57') && rawPhone.length === 10) {
      rawPhone = '57' + rawPhone
    }

    const message = `Hola ${selectedCustomer.full_name}, un cordial saludo de ${businessName}. Te recordamos que tu saldo fiao pendiente es de ${formatCurrency(selectedCustomer.credit_used)}. Puedes realizar tu pago o abono cuando gustes. ¡Muchas gracias por tu preferencia!`
    const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando clientes...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {t('customersPlural', 'Clientes')} & Cartera
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
            {customers.length} {t('customersPlural', 'clientes').toLowerCase()} registrados
          </p>
        </div>
        <button className="btn-neu btn-primary" onClick={() => setShowNewModal(true)} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} strokeWidth={2.5} />
          <span>Nuevo {t('customers', 'cliente').toLowerCase()}</span>
        </button>
      </div>

      {/* Main Grid: Responsive 2-column on desktop, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        
        {/* Left: Customer List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="input-group">
            <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
            <input className="input-neu" placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.85rem' }} />
          </div>

          <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(customer => {
              const debt = Number(customer.credit_used || 0)
              const limit = Number(customer.credit_limit || 0)
              const isSelected = selected === customer.id

              return (
                <div key={customer.id} onClick={() => setSelected(customer.id)}
                  className={`neu-flat ${isSelected ? 'active' : ''}`}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: isSelected ? 'var(--accent-blue-lt)' : 'var(--bg)' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: debt > 0 ? 'var(--accent-coral-lt)' : 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', color: debt > 0 ? 'var(--accent-coral)' : 'var(--accent-blue)', flexShrink: 0 }}>
                      {customer.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.full_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{customer.phone || 'Sin teléfono'}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: debt > 0 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>
                      {debt > 0 ? formatCurrency(debt) : 'Al día'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cupo: {formatCurrency(limit)}</div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <Users size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                <div style={{ fontSize: '0.85rem' }}>No se encontraron clientes</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Customer Details Panel */}
        {selectedCustomer && (
          <div className="neu-card animate-scale-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: selectedCustomer.credit_used > 0 ? 'var(--accent-coral-lt)' : 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.05rem', color: selectedCustomer.credit_used > 0 ? 'var(--accent-coral)' : 'var(--accent-blue)', flexShrink: 0 }}>
                {selectedCustomer.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedCustomer.full_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} strokeWidth={2} />
                  <span>{selectedCustomer.phone || 'Sin número registrado'}</span>
                </div>
              </div>
            </div>

            {/* Fiao Balance Box */}
            <div style={{ background: selectedCustomer.credit_used > 0 ? 'var(--accent-coral-lt)' : 'var(--bg-deep)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: selectedCustomer.credit_used > 0 ? 'var(--accent-coral)' : 'var(--text-muted)', letterSpacing: '0.05em' }}>Saldo Fiado (Deuda)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: selectedCustomer.credit_used > 0 ? 'var(--accent-coral)' : 'var(--accent-green)', marginTop: 2 }}>
                {formatCurrency(selectedCustomer.credit_used)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Disponible: <strong>{formatCurrency(Math.max(0, selectedCustomer.credit_limit - selectedCustomer.credit_used))}</strong> de {formatCurrency(selectedCustomer.credit_limit)}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedCustomer.credit_used > 0 && (
                <>
                  <button className="btn-neu btn-primary" onClick={() => setShowAbonoModal(true)} style={{ width: '100%', padding: '10px', fontSize: '0.82rem', justifyContent: 'center', background: 'var(--accent-green)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <DollarSign size={15} strokeWidth={2.5} />
                    <span>Registrar Abono</span>
                  </button>
                  <button className="btn-neu" onClick={sendWhatsAppReminder} style={{ width: '100%', padding: '10px', fontSize: '0.82rem', justifyContent: 'center', background: '#25D366', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={15} strokeWidth={2.2} />
                    <span>Cobrar por WhatsApp</span>
                  </button>
                </>
              )}
              <a href={`/pos?customer=${selectedCustomer.id}`} className="btn-neu btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.82rem', justifyContent: 'center', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingCart size={15} strokeWidth={2.2} />
                <span>Vender / Fiar en POS</span>
              </a>
            </div>

            {/* Itemized Fiao Purchases History (Desglose de lo que debe) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Receipt size={14} style={{ color: 'var(--accent-blue)' }} />
                <span>Historial de Compras Recientes</span>
              </div>

              {loadingSales ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>Cargando compras...</div>
              ) : customerSales.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>Sin compras registradas aún</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {customerSales.map(sale => (
                    <div key={sale.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{sale.number}</span>
                        <strong style={{ fontSize: '0.82rem', color: 'var(--accent-blue)' }}>{formatCurrency(sale.total)}</strong>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {formatDate(sale.created_at)}
                      </div>
                      {sale.sale_items && sale.sale_items.length > 0 && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--bg-deep)', paddingTop: 3, marginTop: 2 }}>
                          {sale.sale_items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>• {item.quantity}x {item.product_name}</span>
                              <span>{formatCurrency(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
              <div className="neu-flat" style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Compras acumuladas:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedCustomer.total_purchases)}</span>
              </div>
              <div className="neu-flat" style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pedidos totales:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCustomer.total_orders}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal: New Customer */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateCustomer} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>Registrar Nuevo Cliente</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre completo *</label>
                <input className="input-neu" placeholder="Ej: Doña María / Juan Pérez" value={newForm.fullName} onChange={e => setNewForm(f => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                <input className="input-neu" type="tel" placeholder="Ej: 3001234567" value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cupo de Crédito (Fiao) $</label>
                <input className="input-neu" type="number" step="5000" placeholder="150000" value={newForm.creditLimit} onChange={e => setNewForm(f => ({ ...f, creditLimit: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setShowNewModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ flex: 1, padding: 10 }}>
                {submitting ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Abono */}
      {showAbonoModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleRecordAbono} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 360, padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Registrar Abono de Fiao</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Cliente: <strong>{selectedCustomer.full_name}</strong> (Deuda: {formatCurrency(selectedCustomer.credit_used)})</p>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Monto del Abono $</label>
              <input className="input-neu" type="number" step="1000" placeholder="Ej: 20000" value={abonoAmount} onChange={e => setAbonoAmount(e.target.value)} required autoFocus style={{ fontSize: '1.1rem', fontWeight: 800 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
              {[10000, 20000, 50000].map(amt => (
                <button key={amt} type="button" className="btn-neu" onClick={() => setAbonoAmount(String(amt))} style={{ padding: '7px', fontSize: '0.75rem', fontWeight: 700 }}>
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn-neu" onClick={() => setShowAbonoModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting || !abonoAmount} style={{ flex: 1, padding: 10, background: 'var(--accent-green)', color: '#fff' }}>
                {submitting ? 'Registrando...' : 'Confirmar Abono'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
