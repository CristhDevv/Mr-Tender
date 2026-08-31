'use client'
import React, { useState } from 'react'
import {
  Smartphone,
  Receipt,
  Gamepad2,
  X,
  CheckCircle2,
  Printer,
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Send,
  Zap,
  Flame,
  Droplets,
  Tv,
  Globe
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface RechargesServicesModalProps {
  isOpen: boolean
  onClose: () => void
  onCompleteTransaction?: (transaction: {
    type: 'recharge' | 'service' | 'pin'
    title: string
    reference: string
    amount: number
    commission: number
    authCode: string
  }) => void
}

const MOBILE_OPERATORS = [
  { id: 'claro', name: 'Claro Colombia', color: '#da291c', packages: [2000, 5000, 10000, 15000, 20000, 30000, 50000], commRate: 0.05 },
  { id: 'tigo', name: 'Tigo Colombia', color: '#0033a0', packages: [3000, 5000, 10000, 15000, 20000, 35000], commRate: 0.055 },
  { id: 'movistar', name: 'Movistar Colombia', color: '#00a9e0', packages: [3000, 5000, 10000, 15000, 20000, 30000], commRate: 0.05 },
  { id: 'wom', name: 'WOM Colombia', color: '#5f259f', packages: [2000, 5000, 10000, 15000, 20000, 30000], commRate: 0.06 },
  { id: 'virgin', name: 'Virgin Mobile', color: '#cc0000', packages: [3000, 5000, 10000, 15000, 20000, 30000], commRate: 0.05 },
  { id: 'exito', name: 'Móvil Éxito', color: '#fed100', packages: [3000, 5000, 10000, 15000, 20000], commRate: 0.05 },
  { id: 'etb', name: 'ETB Móvil', color: '#0066cc', packages: [3000, 5000, 10000, 20000, 30000], commRate: 0.05 },
  { id: 'flash', name: 'Flash Mobile', color: '#ff6600', packages: [5000, 10000, 20000, 30000], commRate: 0.05 }
]

const PUBLIC_SERVICES = [
  { id: 'enel', name: 'Enel Colombia (Energía Codensa)', category: 'Energía', Icon: Zap, defaultFee: 1500 },
  { id: 'epm', name: 'EPM (Empresas Públicas de Medellín)', category: 'Multiservicios', Icon: Zap, defaultFee: 1500 },
  { id: 'celsia', name: 'Celsia Energía', category: 'Energía', Icon: Zap, defaultFee: 1500 },
  { id: 'afinia', name: 'Afinia Grupo EPM', category: 'Energía', Icon: Zap, defaultFee: 1500 },
  { id: 'acueducto_bogota', name: 'Acueducto y Alcantarillado de Bogotá', category: 'Agua', Icon: Droplets, defaultFee: 1500 },
  { id: 'vanti', name: 'Vanti (Gas Natural Bogotá/Cundinamarca)', category: 'Gas', Icon: Flame, defaultFee: 1500 },
  { id: 'gases_caribe', name: 'Gases del Caribe', category: 'Gas', Icon: Flame, defaultFee: 1500 },
  { id: 'gases_occidente', name: 'Gases de Occidente', category: 'Gas', Icon: Flame, defaultFee: 1500 },
  { id: 'claro_hogar', name: 'Claro Hogar (Internet/TV/Fijo)', category: 'Telecomunicaciones', Icon: Tv, defaultFee: 1200 },
  { id: 'tigo_hogar', name: 'Tigo Hogar / UNE', category: 'Telecomunicaciones', Icon: Tv, defaultFee: 1200 },
  { id: 'movistar_hogar', name: 'Movistar Fibra / Fijo', category: 'Telecomunicaciones', Icon: Globe, defaultFee: 1200 }
]

const DIGITAL_PINS = [
  { id: 'freefire', name: 'Free Fire (Diamantes Garena)', denomination: [3500, 7000, 17500, 35000], emoji: '🔥', commRate: 0.08 },
  { id: 'netflix', name: 'Netflix Tarjeta de Regalo', denomination: [20000, 30000, 40000, 50000], emoji: '🎬', commRate: 0.06 },
  { id: 'spotify', name: 'Spotify Premium Individual', denomination: [17900, 35800, 53700], emoji: '🎵', commRate: 0.06 },
  { id: 'xbox', name: 'Xbox Game Pass / Gift Card', denomination: [30000, 50000, 100000], emoji: '🎮', commRate: 0.06 },
  { id: 'playstation', name: 'PlayStation Store PIN (USD/COP)', denomination: [40000, 80000, 150000], emoji: '🕹️', commRate: 0.06 },
  { id: 'roblox', name: 'Roblox Robux Digital Card', denomination: [25000, 50000, 100000], emoji: '🧱', commRate: 0.07 },
  { id: 'crunchyroll', name: 'Crunchyroll Fan Mega', denomination: [15000, 30000, 45000], emoji: '🍥', commRate: 0.06 }
]

export default function RechargesServicesModal({
  isOpen,
  onClose,
  onCompleteTransaction
}: RechargesServicesModalProps) {
  const [tab, setTab] = useState<'recharge' | 'services' | 'pins'>('recharge')

  // Recharge form state
  const [selectedOperator, setSelectedOperator] = useState(MOBILE_OPERATORS[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [rechargeAmount, setRechargeAmount] = useState('10000')

  // Services form state
  const [selectedService, setSelectedService] = useState(PUBLIC_SERVICES[0])
  const [serviceBarcode, setServiceBarcode] = useState('')
  const [serviceAmount, setServiceAmount] = useState('')
  const [serviceFee, setServiceFee] = useState('1500')

  // Digital PINs state
  const [selectedPin, setSelectedPin] = useState(DIGITAL_PINS[0])
  const [pinDenom, setPinDenom] = useState('20000')
  const [customerEmailPhone, setCustomerEmailPhone] = useState('')

  // Processing & Done states
  const [submitting, setSubmitting] = useState(false)
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null)

  if (!isOpen) return null

  const handleProcessRecharge = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      alert('Por favor ingresa un número de celular válido de 10 dígitos (ej. 3001234567).')
      return
    }
    const amt = parseFloat(rechargeAmount) || 0
    if (amt < 1000) {
      alert('El monto mínimo de recarga es de $1.000 COP.')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      const authCode = 'REC-' + Math.floor(100000 + Math.random() * 900000)
      const commission = Math.round(amt * selectedOperator.commRate)
      const receipt = {
        type: 'recharge',
        title: `Recarga ${selectedOperator.name}`,
        reference: cleanPhone,
        amount: amt,
        commission,
        authCode,
        date: new Date().toLocaleString('es-CO')
      }
      setSuccessReceipt(receipt)
      setSubmitting(false)
      if (onCompleteTransaction) {
        onCompleteTransaction(receipt as any)
      }
    }, 800)
  }

  const handleProcessService = (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceBarcode.trim()) {
      alert('Por favor ingresa o escanea el número de referencia o código de barras de la factura.')
      return
    }
    const amt = parseFloat(serviceAmount) || 0
    if (amt <= 0) {
      alert('Por favor ingresa el valor a pagar de la factura.')
      return
    }
    const fee = parseFloat(serviceFee) || 0

    setSubmitting(true)
    setTimeout(() => {
      const authCode = 'SRV-' + Math.floor(100000 + Math.random() * 900000)
      const receipt = {
        type: 'service',
        title: `Recaudo ${selectedService.name}`,
        reference: serviceBarcode.trim(),
        amount: amt,
        commission: fee,
        authCode,
        date: new Date().toLocaleString('es-CO')
      }
      setSuccessReceipt(receipt)
      setSubmitting(false)
      if (onCompleteTransaction) {
        onCompleteTransaction(receipt as any)
      }
    }, 800)
  }

  const handleProcessPin = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(pinDenom) || 0
    if (amt <= 0) return

    setSubmitting(true)
    setTimeout(() => {
      const authCode = 'PIN-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      const pinCode = Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join('-')
      const commission = Math.round(amt * selectedPin.commRate)
      const receipt = {
        type: 'pin',
        title: `PIN Digital ${selectedPin.name}`,
        reference: customerEmailPhone || 'Sin destinatario',
        amount: amt,
        commission,
        authCode,
        pinCode,
        date: new Date().toLocaleString('es-CO')
      }
      setSuccessReceipt(receipt)
      setSubmitting(false)
      if (onCompleteTransaction) {
        onCompleteTransaction(receipt as any)
      }
    }, 800)
  }

  const handlePrintReceipt = () => {
    window.print()
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
      onClick={onClose}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Smartphone size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Recargas & Pago de Servicios <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--text-muted)' }}>F8</span>
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Corresponsalía comercial y recaudos en tiempo real para Colombia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        {!successReceipt && (
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: 12, marginBottom: 18 }}>
            <button
              onClick={() => setTab('recharge')}
              className="btn-neu"
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: tab === 'recharge' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                color: tab === 'recharge' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Smartphone size={16} />
              <span>Recargas Móviles</span>
            </button>

            <button
              onClick={() => setTab('services')}
              className="btn-neu"
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: tab === 'services' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                color: tab === 'services' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Receipt size={16} />
              <span>Servicios Públicos</span>
            </button>

            <button
              onClick={() => setTab('pins')}
              className="btn-neu"
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: tab === 'pins' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                color: tab === 'pins' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Gamepad2 size={16} />
              <span>Pines Digitales</span>
            </button>
          </div>
        )}

        {/* Success / Printed Receipt View */}
        {successReceipt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'inline-flex', alignSelf: 'center', padding: 14, borderRadius: '50%', background: 'rgba(22,163,74,0.12)', color: 'var(--accent-green, #16a34a)' }}>
              <CheckCircle2 size={42} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                ¡Transacción Exitosa!
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Comprobante de corresponsalía generado y registrado en caja
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 14,
                padding: 16,
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ fontWeight: 800, textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 6 }}>
                MR TENDER CORRESPONSALÍA
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Operación:</span> <strong>{successReceipt.title}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Referencia/Tel:</span> <strong>{successReceipt.reference}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Folio Autorización:</span> <strong>{successReceipt.authCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fecha:</span> <span>{successReceipt.date}</span>
              </div>
              {successReceipt.pinCode && (
                <div style={{ background: '#fef08a', padding: 8, borderRadius: 8, margin: '6px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>CÓDIGO PIN DE ACTIVACIÓN:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.1em' }}>{successReceipt.pinCode}</div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 6, fontSize: '1rem', fontWeight: 800 }}>
                <span>VALOR COBRADO:</span> <strong>{formatCurrency(successReceipt.amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)', fontSize: '0.8rem' }}>
                <span>Comisión ganada:</span> <span>+{formatCurrency(successReceipt.commission)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handlePrintReceipt}
                className="btn-neu"
                style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Printer size={18} />
                <span>Imprimir Ticket Térmico</span>
              </button>
              <button
                onClick={() => { setSuccessReceipt(null); onClose(); }}
                className="btn-neu btn-primary"
                style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                Finalizar y Continuar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. RECARGAS TAB */}
            {tab === 'recharge' && (
              <form onSubmit={handleProcessRecharge} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Selecciona el Operador Móvil
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {MOBILE_OPERATORS.map(op => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => { setSelectedOperator(op); setRechargeAmount(String(op.packages[2] || 10000)); }}
                        style={{
                          padding: '10px 6px',
                          borderRadius: 10,
                          border: selectedOperator.id === op.id ? `2px solid ${op.color}` : '1px solid var(--border-color, #e2e8f0)',
                          background: selectedOperator.id === op.id ? 'rgba(37,99,235,0.06)' : 'var(--bg-card, #ffffff)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {op.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Número de Celular (10 dígitos)
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="300 123 4567"
                      maxLength={10}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        borderRadius: 10,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Monto de Recarga ($ COP)
                    </label>
                    <input
                      type="number"
                      value={rechargeAmount}
                      onChange={e => setRechargeAmount(e.target.value)}
                      min="1000"
                      step="1000"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        borderRadius: 10,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--accent-green, #16a34a)'
                      }}
                    />
                  </div>
                </div>

                {/* Quick Packages Chips */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Montos Frecuentes
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedOperator.packages.map(pkg => (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => setRechargeAmount(String(pkg))}
                        className="btn-neu"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: rechargeAmount === String(pkg) ? 'var(--accent-blue, #2563eb)' : 'var(--bg-secondary)',
                          color: rechargeAmount === String(pkg) ? '#fff' : 'var(--text-primary)'
                        }}
                      >
                        ${pkg.toLocaleString('es-CO')}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(22,163,74,0.06)', padding: 12, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span>Comisión estimada para el negocio:</span>
                  <strong style={{ color: 'var(--accent-green, #16a34a)' }}>
                    +{formatCurrency(Math.round((parseFloat(rechargeAmount) || 0) * selectedOperator.commRate))}
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-neu btn-primary"
                  style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 }}
                >
                  {submitting ? 'Procesando recarga...' : `Vender Recarga ${selectedOperator.name} (${formatCurrency(parseFloat(rechargeAmount) || 0)})`}
                </button>
              </form>
            )}

            {/* 2. SERVICIOS PÚBLICOS TAB */}
            {tab === 'services' && (
              <form onSubmit={handleProcessService} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Convenio de Servicio Público / Factura
                  </label>
                  <select
                    value={selectedService.id}
                    onChange={e => {
                      const found = PUBLIC_SERVICES.find(s => s.id === e.target.value)
                      if (found) {
                        setSelectedService(found)
                        setServiceFee(String(found.defaultFee))
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-primary, #f8fafc)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {PUBLIC_SERVICES.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Código de Barras / Referencia de Pago Factura
                  </label>
                  <input
                    type="text"
                    value={serviceBarcode}
                    onChange={e => setServiceBarcode(e.target.value)}
                    placeholder="Escanear código de barras de la factura o escribir referencia..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '0.95rem',
                      fontFamily: 'monospace',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-primary, #f8fafc)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Valor Total de la Factura ($ COP)
                    </label>
                    <input
                      type="number"
                      value={serviceAmount}
                      onChange={e => setServiceAmount(e.target.value)}
                      placeholder="Ej: 85400"
                      min="500"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        borderRadius: 10,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Comisión ($ COP)
                    </label>
                    <input
                      type="number"
                      value={serviceFee}
                      onChange={e => setServiceFee(e.target.value)}
                      min="0"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        borderRadius: 10,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--accent-green, #16a34a)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span>Total a cobrar al cliente en caja:</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    {formatCurrency((parseFloat(serviceAmount) || 0) + (parseFloat(serviceFee) || 0))}
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-neu btn-primary"
                  style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 }}
                >
                  {submitting ? 'Procesando recaudo...' : `Registrar Pago de Factura`}
                </button>
              </form>
            )}

            {/* 3. PINES DIGITALES TAB */}
            {tab === 'pins' && (
              <form onSubmit={handleProcessPin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Selecciona la Plataforma Digital
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {DIGITAL_PINS.map(pin => (
                      <button
                        key={pin.id}
                        type="button"
                        onClick={() => { setSelectedPin(pin); setPinDenom(String(pin.denomination[0])); }}
                        style={{
                          padding: '10px 6px',
                          borderRadius: 10,
                          border: selectedPin.id === pin.id ? '2px solid var(--accent-blue, #2563eb)' : '1px solid var(--border-color, #e2e8f0)',
                          background: selectedPin.id === pin.id ? 'rgba(37,99,235,0.06)' : 'var(--bg-card, #ffffff)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{pin.emoji}</span>
                        <span>{pin.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Denominación del PIN ({selectedPin.name})
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedPin.denomination.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setPinDenom(String(d))}
                        className="btn-neu"
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          background: pinDenom === String(d) ? 'var(--accent-blue, #2563eb)' : 'var(--bg-secondary)',
                          color: pinDenom === String(d) ? '#fff' : 'var(--text-primary)'
                        }}
                      >
                        ${d.toLocaleString('es-CO')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    WhatsApp / Email del Cliente (Opcional para envío digital)
                  </label>
                  <input
                    type="text"
                    value={customerEmailPhone}
                    onChange={e => setCustomerEmailPhone(e.target.value)}
                    placeholder="300 123 4567 o cliente@gmail.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '0.95rem',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-primary, #f8fafc)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-neu btn-primary"
                  style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 }}
                >
                  {submitting ? 'Generando PIN...' : `Generar PIN ${selectedPin.name} (${formatCurrency(parseFloat(pinDenom) || 0)})`}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
