'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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

export default function CustomersPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [customers, setCustomers] = useState<DBCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('nuestro negocio')

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

      // Get business name from tenant settings or metadata
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
      const newCreditUsed = Math.max(0, selectedCustomer.credit_used - amount)
      const { error } = await supabase
        .from('customers')
        .update({ credit_used: newCreditUsed })
        .eq('id', selectedCustomer.id)

      if (error) throw error

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, credit_used: newCreditUsed } : c))
      setShowAbonoModal(false)
      setAbonoAmount('')
      alert(`✅ Abono registrado exitosamente. Deuda restante: ${formatCurrency(newCreditUsed)}`)
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

    const message = `Hola ${selectedCustomer.full_name}, ¡un saludo de ${businessName}! 😊 Te recordamos que tu saldo fiao pendiente es de ${formatCurrency(selectedCustomer.credit_used)}. Puedes realizar tu pago o abono cuando gustes. ¡Muchas gracias por tu preferencia!`
    const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando clientes...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {/* Left Column: List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Clientes & Libreta de Fiao</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{customers.length} clientes registrados</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-neu btn-primary" onClick={() => setShowNewModal(true)} style={{ padding: '10px 18px', fontSize: '0.85rem' }}>+ Nuevo cliente</button>
          </div>
        </div>

        <div className="input-group">
          <span className="input-icon">🔍</span>
          <input className="input-neu" placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="neu-card" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <table className="table-neu">
            <thead>
              <tr>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Fiao (Deuda)</th>
                <th style={{ textAlign: 'right' }}>Cupo Crédito</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'center' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => {
                const debt = Number(customer.credit_used || 0)
                const limit = Number(customer.credit_limit || 0)
                return (
                  <tr key={customer.id} onClick={() => setSelected(customer.id)} style={{ cursor: 'pointer', background: selected === customer.id ? 'var(--accent-blue-lt)' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: debt > 0 ? 'var(--accent-coral-lt)' : 'var(--accent-purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: debt > 0 ? 'var(--accent-coral)' : 'var(--accent-purple)', flexShrink: 0 }}>
                          {customer.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{customer.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{customer.phone || 'Sin teléfono'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: debt > 0 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>
                      {formatCurrency(debt)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {formatCurrency(limit)}
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-gray">{customer.total_orders}</span></td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-amber">⭐ {customer.points_balance}</span></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No se encontraron clientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Detail Panel */}
      {selectedCustomer && (
        <div className="neu-card animate-scale-in" style={{ width: 320, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: selectedCustomer.credit_used > 0 ? 'var(--accent-coral-lt)' : 'var(--accent-purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: selectedCustomer.credit_used > 0 ? 'var(--accent-coral)' : 'var(--accent-purple)', margin: '0 auto 12px', boxShadow: 'var(--neu-raised)' }}>
              {selectedCustomer.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedCustomer.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>📱 {selectedCustomer.phone || 'Sin número registrado'}</div>
          </div>

          <div className="divider" />

          {/* Fiao Summary Box */}
          <div style={{ background: selectedCustomer.credit_used > 0 ? 'var(--accent-coral-lt)' : 'var(--bg-deep)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: selectedCustomer.credit_used > 0 ? 'var(--accent-coral)' : 'var(--text-muted)', letterSpacing: '0.05em' }}>Saldo Fiado (Deuda)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: selectedCustomer.credit_used > 0 ? 'var(--accent-coral)' : 'var(--accent-green)', marginTop: 2 }}>
              {formatCurrency(selectedCustomer.credit_used)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Disponible: <strong>{formatCurrency(Math.max(0, selectedCustomer.credit_limit - selectedCustomer.credit_used))}</strong> de {formatCurrency(selectedCustomer.credit_limit)}
            </div>
          </div>

          {/* Quick Fiao Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedCustomer.credit_used > 0 && (
              <>
                <button className="btn-neu btn-primary" onClick={() => setShowAbonoModal(true)} style={{ width: '100%', padding: '11px', fontSize: '0.85rem', justifyContent: 'center', background: 'var(--accent-green)', color: '#fff' }}>
                  💵 Registrar Abono
                </button>
                <button className="btn-neu" onClick={sendWhatsAppReminder} style={{ width: '100%', padding: '11px', fontSize: '0.85rem', justifyContent: 'center', background: '#25D366', color: '#fff', fontWeight: 700 }}>
                  💬 Cobrar por WhatsApp
                </button>
              </>
            )}
            <a href={`/pos?customer=${selectedCustomer.id}`} className="btn-neu btn-primary" style={{ width: '100%', padding: '11px', fontSize: '0.85rem', justifyContent: 'center', textDecoration: 'none', textAlign: 'center' }}>
              🛒 Vender / Fiar en POS
            </a>
          </div>

          <div className="divider" />

          {/* Stats list */}
          {[
            { label: 'Compras totales', value: formatCurrency(selectedCustomer.total_purchases), icon: '💰' },
            { label: 'Pedidos totales', value: selectedCustomer.total_orders, icon: '🛒' },
            { label: 'Puntos acumulados', value: `⭐ ${selectedCustomer.points_balance}`, icon: '🏆' },
          ].map(item => (
            <div key={item.label} className="neu-flat" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.icon} {item.label}</span>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Nuevo Cliente ── */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateCustomer} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>➕ Registrar Nuevo Cliente</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nombre completo *</label>
                <input className="input-neu" placeholder="Ej: Doña María / Juan Pérez" value={newForm.fullName} onChange={e => setNewForm(f => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Teléfono / WhatsApp</label>
                <input className="input-neu" type="tel" placeholder="Ej: 3001234567" value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cupo de Crédito (Fiao) $</label>
                <input className="input-neu" type="number" step="5000" placeholder="150000" value={newForm.creditLimit} onChange={e => setNewForm(f => ({ ...f, creditLimit: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn-neu" onClick={() => setShowNewModal(false)} style={{ flex: 1, padding: 12 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ flex: 1, padding: 12 }}>
                {submitting ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: Registrar Abono ── */}
      {showAbonoModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleRecordAbono} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>💵 Registrar Abono de Fiao</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>Cliente: <strong>{selectedCustomer.full_name}</strong> (Deuda: {formatCurrency(selectedCustomer.credit_used)})</p>
            
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Monto del Abono $</label>
              <input className="input-neu" type="number" step="1000" placeholder="Ej: 20000" value={abonoAmount} onChange={e => setAbonoAmount(e.target.value)} required autoFocus style={{ fontSize: '1.2rem', fontWeight: 800 }} />
            </div>

            {/* Quick Abono Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
              {[10000, 20000, 50000].map(amt => (
                <button key={amt} type="button" className="btn-neu" onClick={() => setAbonoAmount(String(amt))} style={{ padding: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn-neu" onClick={() => setShowAbonoModal(false)} style={{ flex: 1, padding: 12 }}>Cancelar</button>
              <button type="submit" className="btn-neu btn-primary" disabled={submitting || !abonoAmount} style={{ flex: 1, padding: 12, background: 'var(--accent-green)', color: '#fff' }}>
                {submitting ? 'Registrando...' : 'Confirmar Abono'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
