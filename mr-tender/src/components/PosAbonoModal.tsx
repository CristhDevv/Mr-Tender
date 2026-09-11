'use client'
import React, { useState, useMemo } from 'react'
import {
  DollarSign,
  User,
  Search,
  CheckCircle2,
  X,
  Phone,
  CreditCard,
  Wallet,
  ArrowRight,
  Printer,
  Share2,
  AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Customer {
  id: string
  full_name: string
  phone?: string | null
  id_number?: string | null
  credit_used?: number
  credit_limit?: number
  email?: string | null
}

interface PosAbonoModalProps {
  isOpen: boolean
  onClose: () => void
  customers: Customer[]
  initialCustomer?: Customer | null
  businessName?: string
  onAbonoSuccess: (result: {
    customerId: string
    newDebt: number
    amountPaid: number
    customerName: string
  }) => void
}

export default function PosAbonoModal({
  isOpen,
  onClose,
  customers,
  initialCustomer,
  businessName = 'Mi Negocio',
  onAbonoSuccess
}: PosAbonoModalProps) {
  const supabase = createClient()
  const [selectedCust, setSelectedCust] = useState<Customer | null>(initialCustomer || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receiptData, setReceiptData] = useState<{
    receiptNumber?: string
    customerName: string
    amountPaid: number
    prevDebt: number
    newDebt: number
    phone?: string | null
    date: string
  } | null>(null)

  // Filter customers with debt or matching search
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      return [...customers].sort((a, b) => Number(b.credit_used || 0) - Number(a.credit_used || 0)).slice(0, 15)
    }
    return customers.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.id_number || '').includes(q)
    ).slice(0, 15)
  }, [customers, searchQuery])

  if (!isOpen) return null

  const currentDebt = Number(selectedCust?.credit_used || 0)
  const creditLimit = Number(selectedCust?.credit_limit || 0)
  const availableCredit = Math.max(0, creditLimit - currentDebt)

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCust(c)
    setSearchQuery('')
    if (Number(c.credit_used || 0) > 0) {
      setAmount(String(c.credit_used))
    } else {
      setAmount('')
    }
  }

  const handleQuickAmount = (val: number) => {
    setAmount(String(Math.min(val, currentDebt > 0 ? currentDebt : val)))
  }

  const handleSubmitAbono = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCust) {
      alert('Por favor selecciona un cliente.')
      return
    }
    const numAmount = parseFloat(amount) || 0
    if (numAmount <= 0) {
      alert('El monto del abono debe ser mayor a $0.')
      return
    }
    if (currentDebt <= 0) {
      if (!confirm('Este cliente no tiene saldo fiado pendiente registrado. ¿Deseas registrar este ingreso de todas formas?')) {
        return
      }
    }

    setSubmitting(true)
    try {
      const noteStr = `${paymentMethod === 'cash' ? 'Efectivo en mostrador' : paymentMethod === 'transfer' ? 'Transferencia / Nequi' : 'Tarjeta'}${notes.trim() ? ` - ${notes.trim()}` : ''}`

      const { data, error } = await supabase.rpc('record_customer_abono', {
        p_customer_id: selectedCust.id,
        p_amount: numAmount,
        p_notes: noteStr
      })

      if (error) throw error
      if (data && data.success === false) throw new Error(data.error || 'Error al procesar el abono')

      const prevDebt = Number(data.prev_debt ?? currentDebt)
      const newDebt = Number(data.new_debt ?? Math.max(0, currentDebt - numAmount))
      const dateStr = new Date().toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: true
      })

      const receipt = {
        receiptNumber: `ABO-${Date.now().toString().slice(-6)}`,
        customerName: selectedCust.full_name,
        amountPaid: numAmount,
        prevDebt,
        newDebt,
        phone: selectedCust.phone,
        date: dateStr
      }

      setReceiptData(receipt)
      onAbonoSuccess({
        customerId: selectedCust.id,
        newDebt,
        amountPaid: numAmount,
        customerName: selectedCust.full_name
      })

    } catch (err: any) {
      console.error('Error registrando abono:', err)
      alert('Error al registrar abono: ' + (err.message || 'Error desconocido'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendWhatsApp = () => {
    if (!receiptData) return
    let cleanPhone = (receiptData.phone || '').replace(/\D/g, '')
    if (!cleanPhone) {
      alert('El cliente no tiene teléfono celular registrado.')
      return
    }
    if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = '57' + cleanPhone
    }

    const msg = ` *COMPROBANTE DE ABONO A CRÉDITO (FIAO)*
 *${businessName}*
 *Cliente:* ${receiptData.customerName}
 *Fecha:* ${receiptData.date}

 *Monto Abonado:* ${formatCurrency(receiptData.amountPaid)}
 *Saldo Anterior:* ${formatCurrency(receiptData.prevDebt)}
 *Saldo Pendiente Actual:* ${formatCurrency(receiptData.newDebt)}

¡Muchas gracias por su puntual pago y preferencia!`

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleResetAndClose = () => {
    setReceiptData(null)
    setSelectedCust(null)
    setAmount('')
    setNotes('')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={handleResetAndClose}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.05))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--accent-purple)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DollarSign size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {receiptData ? 'Comprobante de Abono' : 'Abonar a Fiao / Cartera'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {receiptData ? 'Transacción registrada con éxito en caja' : 'Registrar pago de deuda de cliente en caja'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="btn-neu"
            style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* SUCCESS RECEIPT VIEW */}
          {receiptData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#10B981' }}>
                  ¡Abono de {formatCurrency(receiptData.amountPaid)} Exitoso!
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  El ingreso quedó asentado en la caja y el saldo del cliente fue actualizado.
                </p>
              </div>

              {/* Receipt Ticket Box */}
              <div
                className="neu-card"
                style={{
                  width: '100%',
                  padding: 16,
                  background: 'var(--bg-deep)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 12,
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{receiptData.customerName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Fecha & Hora:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{receiptData.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Monto Abonado:</span>
                  <strong style={{ color: '#10B981', fontSize: '0.95rem' }}>{formatCurrency(receiptData.amountPaid)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Deuda Anterior:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(receiptData.prevDebt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Saldo Restante:</span>
                  <strong style={{ color: receiptData.newDebt > 0 ? 'var(--accent-coral)' : '#10B981', fontSize: '1rem' }}>
                    {formatCurrency(receiptData.newDebt)}
                  </strong>
                </div>
              </div>

              {/* Actions: WhatsApp & Print */}
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                {receiptData.phone && (
                  <button
                    type="button"
                    className="btn-neu"
                    onClick={handleSendWhatsApp}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      color: '#25D366'
                    }}
                  >
                    <Share2 size={16} />
                    <span>WhatsApp</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-neu"
                  onClick={handlePrint}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Printer size={16} />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  className="btn-neu btn-primary"
                  onClick={handleResetAndClose}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmitAbono} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Step 1: Customer Selector */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  1. SELECCIONAR CLIENTE
                </label>

                {selectedCust ? (
                  <div
                    className="neu-card"
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(139, 92, 246, 0.06)',
                      border: '1.5px solid var(--accent-purple)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'var(--accent-purple)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      >
                        {selectedCust.full_name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {selectedCust.full_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {selectedCust.phone ? `Tel: ${selectedCust.phone}` : 'Sin teléfono'}
                          {selectedCust.id_number ? ` • Doc: ${selectedCust.id_number}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-neu"
                      onClick={() => { setSelectedCust(null); setAmount(''); }}
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="input-group" style={{ width: '100%' }}>
                      <span className="input-icon"><Search size={15} style={{ color: 'var(--text-muted)' }} /></span>
                      <input
                        className="input-neu"
                        placeholder="Buscar cliente por nombre, teléfono o cédula..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', fontSize: '0.85rem', paddingLeft: 34 }}
                        autoFocus
                      />
                    </div>

                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        background: 'var(--bg-deep)'
                      }}
                    >
                      {filteredCustomers.map(c => {
                        const debt = Number(c.credit_used || 0)
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.82rem'
                            }}
                            className="hover:bg-opacity-50 hover:bg-gray-200"
                          >
                            <div>
                              <strong style={{ color: 'var(--text-primary)' }}>{c.full_name}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.phone || 'Sin teléfono'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Deuda actual: </span>
                              <strong style={{ color: debt > 0 ? 'var(--accent-coral)' : '#10B981' }}>
                                {formatCurrency(debt)}
                              </strong>
                            </div>
                          </div>
                        )
                      })}
                      {filteredCustomers.length === 0 && (
                        <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No se encontraron clientes
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Debt & Credit Status Cards */}
              {selectedCust && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div
                    className="neu-card"
                    style={{
                      padding: 10,
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 10
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>DEUDA PENDIENTE (FIAO)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: currentDebt > 0 ? 'var(--accent-coral)' : '#10B981', marginTop: 2 }}>
                      {formatCurrency(currentDebt)}
                    </div>
                  </div>

                  <div
                    className="neu-card"
                    style={{
                      padding: 10,
                      background: 'rgba(59, 130, 246, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: 10
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CUPO DISPONIBLE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-blue)', marginTop: 2 }}>
                      {formatCurrency(availableCredit)}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Amount & Quick Chips */}
              {selectedCust && (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    2. MONTO A ABONAR
                  </label>

                  {/* Quick amount chips */}
                  {currentDebt > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      <button
                        type="button"
                        className="btn-neu"
                        onClick={() => handleQuickAmount(currentDebt)}
                        style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
                      >
                        Total ({formatCurrency(currentDebt)})
                      </button>
                      {currentDebt > 10000 && (
                        <button
                          type="button"
                          className="btn-neu"
                          onClick={() => handleQuickAmount(Math.round(currentDebt / 2))}
                          style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700 }}
                        >
                          50% ({formatCurrency(Math.round(currentDebt / 2))})
                        </button>
                      )}
                      {[10000, 20000, 50000, 100000].filter(val => val < currentDebt).map(val => (
                        <button
                          key={val}
                          type="button"
                          className="btn-neu"
                          onClick={() => handleQuickAmount(val)}
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          {formatCurrency(val)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="input-group" style={{ width: '100%' }}>
                    <span className="input-icon" style={{ fontWeight: 900, color: 'var(--accent-green)', fontSize: '1.1rem' }}>$</span>
                    <input
                      type="number"
                      className="input-neu"
                      placeholder="0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        paddingLeft: 34,
                        color: 'var(--text-primary)',
                        height: 44
                      }}
                      min={1}
                      step="any"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Payment Method */}
              {selectedCust && (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    3. MÉTODO DE INGRESO
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      className={`btn-neu ${paymentMethod === 'cash' ? 'btn-primary' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                      style={{ padding: '8px 6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                    >
                      <Wallet size={16} />
                      <span>Efectivo (Caja)</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-neu ${paymentMethod === 'transfer' ? 'btn-primary' : ''}`}
                      onClick={() => setPaymentMethod('transfer')}
                      style={{ padding: '8px 6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                    >
                      <Share2 size={16} />
                      <span>Nequi / Transf.</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-neu ${paymentMethod === 'card' ? 'btn-primary' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                      style={{ padding: '8px 6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                    >
                      <CreditCard size={16} />
                      <span>Tarjeta</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Notes (Optional) */}
              {selectedCust && (
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Nota / Referencia de comprobante (opcional)
                  </label>
                  <input
                    className="input-neu"
                    placeholder="Ej. Comprobante Nequi #1234..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                </div>
              )}

              {/* Submit Button */}
              {selectedCust && (
                <button
                  type="submit"
                  className="btn-neu btn-primary"
                  disabled={submitting || !amount || parseFloat(amount) <= 0}
                  style={{
                    padding: '12px 16px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 6
                  }}
                >
                  <DollarSign size={18} />
                  <span>{submitting ? 'Procesando Abono...' : `Confirmar Abono de ${formatCurrency(parseFloat(amount) || 0)}`}</span>
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
