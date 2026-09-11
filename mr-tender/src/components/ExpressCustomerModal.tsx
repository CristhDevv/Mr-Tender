'use client'
import React, { useState } from 'react'
import {
  UserPlus,
  User,
  Phone,
  CreditCard,
  Mail,
  MapPin,
  X,
  Check,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export interface ExpressCustomerCreated {
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

interface ExpressCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId?: string | null
  onCustomerCreated: (customer: ExpressCustomerCreated) => void
  initialSuggestedLimit?: number
}

const PRESET_CREDIT_LIMITS = [
  { label: '$0 (Sin Cupo)', value: 0 },
  { label: '$50.000', value: 50000 },
  { label: '$100.000', value: 100000 },
  { label: '$200.000', value: 200000 },
  { label: '$500.000', value: 500000 },
  { label: '$1.000.000', value: 1000000 }
]

export default function ExpressCustomerModal({
  isOpen,
  onClose,
  tenantId,
  onCustomerCreated,
  initialSuggestedLimit = 200000
}: ExpressCustomerModalProps) {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [creditLimit, setCreditLimit] = useState<string>(String(initialSuggestedLimit))
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [showExtraFields, setShowExtraFields] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleReset = () => {
    setFullName('')
    setPhone('')
    setTaxId('')
    setCreditLimit(String(initialSuggestedLimit))
    setEmail('')
    setAddress('')
    setShowExtraFields(false)
    setError('')
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('El nombre del cliente es obligatorio')
      return
    }

    setLoading(true)
    setError('')

    try {
      let resolvedTenantId = tenantId
      if (!resolvedTenantId) {
        const { data: { user } } = await supabase.auth.getUser()
        resolvedTenantId = user?.user_metadata?.tenant_id
      }

      if (!resolvedTenantId) {
        throw new Error('No se detectó el identificador del comercio (tenant_id)')
      }

      const cleanName = fullName.trim()
      const cleanPhone = phone.trim() || null
      const cleanTaxId = taxId.trim().replace(/[^a-zA-Z0-9]/g, '') || null
      const cleanEmail = email.trim() ? email.trim().toLowerCase() : null
      const cleanAddress = address.trim() || null
      const numCreditLimit = Math.max(0, Number(creditLimit) || 0)

      const payload = {
        tenant_id: resolvedTenantId,
        full_name: cleanName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        tax_id: cleanTaxId,
        tax_name: cleanName,
        tax_regime: '49',
        tax_address: cleanAddress,
        email: cleanEmail,
        address: cleanAddress,
        city: 'Bogotá',
        state: 'Bogotá D.C.',
        credit_limit: numCreditLimit,
        credit_used: 0,
        credit_days: 30,
        total_purchases: 0,
        total_orders: 0,
        points_balance: 0,
        points_total_earned: 0,
        is_active: true,
        metadata: cleanTaxId ? {
          id_type: cleanTaxId.length >= 9 ? '31' : '13',
          person_type: '2'
        } : null
      }

      const { data, error: insertError } = await supabase
        .from('customers')
        .insert(payload)
        .select('*')
        .single()

      if (insertError) {
        throw insertError
      }

      const created: ExpressCustomerCreated = {
        id: data.id,
        full_name: data.full_name,
        tax_id: data.tax_id,
        tax_name: data.tax_name,
        tax_regime: data.tax_regime,
        tax_address: data.tax_address,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        credit_limit: Number(data.credit_limit || numCreditLimit),
        credit_used: Number(data.credit_used || 0),
        total_purchases: 0,
        total_orders: 0,
        metadata: data.metadata
      }

      onCustomerCreated(created)
      handleClose()
    } catch (err: any) {
      console.error('Error creating express customer:', err)
      setError(err.message || 'No se pudo registrar el cliente. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #F0FDF4 0%, #E6F7F5 100%)',
            borderBottom: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#00B19D',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 177, 157, 0.35)'
              }}
            >
              <UserPlus size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: 1.2
                }}
              >
                Crear Cliente Express
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#0F766E', margin: '2px 0 0', fontWeight: 600 }}>
                Asignación instantánea para compras y fiados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre Completo */}
          <div>
            <label
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}
            >
              <User size={13} color="#00B19D" />
              <span>Nombre Completo *</span>
            </label>
            <input
              type="text"
              className="input-neu"
              placeholder="Ej: Don Pedro Gómez / Vecina Gloria"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                fontSize: '0.9rem',
                fontWeight: 700,
                padding: '9px 12px',
                borderRadius: 8
              }}
            />
          </div>

          {/* Teléfono / WhatsApp & Cédula en 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 10 }}>
            <div>
              <label
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 4,
                  textTransform: 'uppercase'
                }}
              >
                <Phone size={12} color="#00B19D" />
                <span>Teléfono / WhatsApp</span>
              </label>
              <input
                type="tel"
                className="input-neu"
                placeholder="Ej: 3101234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.84rem',
                  padding: '8px 10px',
                  borderRadius: 8
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 4,
                  textTransform: 'uppercase'
                }}
              >
                <CreditCard size={12} color="#00B19D" />
                <span>C.C. / NIT (Opcional)</span>
              </label>
              <input
                type="text"
                className="input-neu"
                placeholder="Ej: 1020304050"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.84rem',
                  padding: '8px 10px',
                  borderRadius: 8
                }}
              />
            </div>
          </div>

          {/* Cupo de Crédito (Para Fiar) */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  textTransform: 'uppercase'
                }}
              >
                <DollarSign size={13} color="#059669" />
                <span>Cupo de Crédito (Para Fiar)</span>
              </label>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669' }}>
                {formatCurrency(Number(creditLimit) || 0)}
              </span>
            </div>

            <input
              type="number"
              step="5000"
              className="input-neu"
              placeholder="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#059669',
                padding: '8px 12px',
                borderRadius: 8
              }}
            />

            {/* Quick preset buttons */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PRESET_CREDIT_LIMITS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCreditLimit(String(p.value))}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: Number(creditLimit) === p.value ? 800 : 600,
                    borderRadius: 6,
                    border: Number(creditLimit) === p.value ? '1.5px solid #059669' : '1px solid #CBD5E1',
                    background: Number(creditLimit) === p.value ? '#ECFDF5' : '#FFFFFF',
                    color: Number(creditLimit) === p.value ? '#065F46' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle More Details (Email / Dirección) */}
          <div>
            <button
              type="button"
              onClick={() => setShowExtraFields(!showExtraFields)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00B19D',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{showExtraFields ? '− Ocultar datos adicionales' : '+ Agregar Email o Dirección (Opcional)'}</span>
            </button>

            {showExtraFields && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 10,
                  background: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px dashed #CBD5E1'
                }}
              >
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Mail size={11} /> Correo Electrónico
                  </label>
                  <input
                    type="email"
                    className="input-neu"
                    placeholder="cliente@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <MapPin size={11} /> Dirección de Residencia o Entrega
                  </label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Cra 7 # 12-34 Casa 2"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn-neu"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#64748B',
                borderRadius: 10
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="btn-neu btn-primary"
              style={{
                padding: '10px 14px',
                fontSize: '0.86rem',
                fontWeight: 900,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #00B19D, #008F7E)',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0, 177, 157, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Guardar y Asignar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
