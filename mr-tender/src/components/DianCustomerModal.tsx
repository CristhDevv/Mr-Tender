'use client'
import React, { useState, useEffect } from 'react'
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Check,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'
import { createClient } from '@/lib/supabase/client'

export interface DianCustomerData {
  id?: string
  idType: '13' | '31' | '22' | '41' | '12' | '11' | '42'
  documentNumber: string
  dv?: string
  name: string
  personType: '1' | '2' // 1: Jurídica, 2: Natural
  regime: '48' | '49' | '04' // 48: Responsable IVA, 49: No Responsable IVA, 04: RST
  email: string
  phone: string
  address: string
  city: string
  state: string
}

interface DianCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (customer: DianCustomerData, savedInDbCustomer?: any) => void
  initialData?: Partial<DianCustomerData> | null
  existingCustomers?: any[]
  tenantId?: string
}

const COLOMBIA_DEPARTMENTS = [
  'Bogotá D.C.',
  'Antioquia',
  'Valle del Cauca',
  'Cundinamarca',
  'Atlántico',
  'Santander',
  'Bolívar',
  'Tolima',
  'Caldas',
  'Risaralda',
  'Huila',
  'Nariño',
  'Boyacá',
  'Norte de Santander',
  'Meta',
  'Cesar',
  'Córdoba',
  'Quindío',
  'Magdalena',
  'Cauca',
  'Sucre',
  'La Guajira',
  'Casanare',
  'Chocó',
  'Caquetá',
  'Arauca',
  'Putumayo',
  'Amazonas',
  'San Andrés y Providencia',
  'Guaviare',
  'Vichada',
  'Vaupés',
  'Guainía'
]

export default function DianCustomerModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCustomers = [],
  tenantId
}: DianCustomerModalProps) {
  const supabase = createClient()

  const [idType, setIdType] = useState<DianCustomerData['idType']>('13')
  const [documentNumber, setDocumentNumber] = useState('')
  const [dv, setDv] = useState('')
  const [name, setName] = useState('')
  const [personType, setPersonType] = useState<DianCustomerData['personType']>('2')
  const [regime, setRegime] = useState<DianCustomerData['regime']>('49')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Bogotá')
  const [state, setState] = useState('Bogotá D.C.')
  const [saveToDb, setSaveToDb] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  // Hydrate form when opening or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setIdType(initialData.idType || '13')
        setDocumentNumber(initialData.documentNumber || '')
        setDv(initialData.dv || '')
        setName(initialData.name || '')
        setPersonType(initialData.personType || (initialData.idType === '31' ? '1' : '2'))
        setRegime(initialData.regime || '49')
        setEmail(initialData.email || '')
        setPhone(initialData.phone || '')
        setAddress(initialData.address || '')
        setCity(initialData.city || 'Bogotá')
        setState(initialData.state || 'Bogotá D.C.')
      }
      setFormError('')
    }
  }, [isOpen, initialData])

  // Auto-calculate DV when NIT changes or idType is 31
  useEffect(() => {
    if (idType === '31') {
      const clean = documentNumber.replace(/\D/g, '')
      if (clean.length >= 5) {
        setDv(calculateNITVerificationDigit(clean))
        setPersonType('1') // Default to Jurídica for NIT
      } else {
        setDv('')
      }
    } else {
      setDv('')
      if (idType === '13' || idType === '12' || idType === '11') {
        setPersonType('2') // Natural
      }
    }
  }, [documentNumber, idType])

  if (!isOpen) return null

  // Fast pick from existing customer list
  const filteredExisting = searchFilter.trim()
    ? existingCustomers.filter(c =>
        c.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.tax_id?.includes(searchFilter) ||
        c.phone?.includes(searchFilter) ||
        c.email?.toLowerCase().includes(searchFilter.toLowerCase())
      ).slice(0, 5)
    : []

  const handleSelectExisting = (c: any) => {
    const rawTaxId = c.tax_id || c.document_number || ''
    const cleanId = rawTaxId.replace(/[^a-zA-Z0-9]/g, '')
    const inferredType = cleanId.length >= 9 && cleanId.length <= 10 ? '31' : '13'
    
    setIdType((c.metadata?.id_type || inferredType) as any)
    setDocumentNumber(cleanId)
    if (inferredType === '31' || c.metadata?.id_type === '31') {
      setDv(calculateNITVerificationDigit(cleanId))
    }
    setName(c.tax_name || c.full_name || '')
    setPersonType(c.metadata?.person_type || (inferredType === '31' ? '1' : '2'))
    setRegime((c.tax_regime || '49') as any)
    setEmail(c.email || '')
    setPhone(c.phone || '')
    setAddress(c.tax_address || c.address || '')
    setCity(c.city || 'Bogotá')
    setState(c.state || 'Bogotá D.C.')
    setSearchFilter('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const cleanNum = documentNumber.trim().replace(/[^a-zA-Z0-9]/g, '')
    if (!cleanNum) {
      setFormError('El número de identificación / NIT es obligatorio para la DIAN.')
      return
    }

    if (!name.trim()) {
      setFormError('El nombre completo o Razón Social es obligatorio.')
      return
    }

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setFormError('El correo electrónico es obligatorio para la entrega legal del XML y PDF de la Factura.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Ingresa un correo electrónico con formato válido (ejemplo: facturacion@empresa.com).')
      return
    }

    setIsSubmitting(true)
    let savedDbRecord = null

    try {
      const customerPayload: DianCustomerData = {
        idType,
        documentNumber: cleanNum,
        dv: idType === '31' ? (dv || calculateNITVerificationDigit(cleanNum)) : undefined,
        name: name.trim().toUpperCase(),
        personType,
        regime,
        email: cleanEmail.toLowerCase(),
        phone: phone.trim(),
        address: address.trim() || 'Dirección comercial',
        city: city.trim() || 'Bogotá',
        state: state.trim() || 'Bogotá D.C.'
      }

      // Save or update customer in Supabase if requested
      if (saveToDb && tenantId) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(`tax_id.eq.${cleanNum},email.eq.${cleanEmail.toLowerCase()}`)
          .limit(1)
          .maybeSingle()

        if (existing?.id) {
          const { data: updated } = await supabase
            .from('customers')
            .update({
              full_name: customerPayload.name,
              tax_id: cleanNum,
              tax_name: customerPayload.name,
              tax_regime: customerPayload.regime,
              tax_address: customerPayload.address,
              email: customerPayload.email,
              phone: customerPayload.phone || null,
              address: customerPayload.address,
              city: customerPayload.city,
              state: customerPayload.state,
              metadata: {
                id_type: customerPayload.idType,
                dv: customerPayload.dv,
                person_type: customerPayload.personType
              }
            })
            .eq('id', existing.id)
            .select()
            .single()

          savedDbRecord = updated
        } else {
          const { data: inserted } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              full_name: customerPayload.name,
              tax_id: cleanNum,
              tax_name: customerPayload.name,
              tax_regime: customerPayload.regime,
              tax_address: customerPayload.address,
              email: customerPayload.email,
              phone: customerPayload.phone || null,
              address: customerPayload.address,
              city: customerPayload.city,
              state: customerPayload.state,
              credit_limit: 0,
              credit_used: 0,
              credit_days: 30,
              total_purchases: 0,
              total_orders: 0,
              points_balance: 0,
              points_total_earned: 0,
              is_active: true,
              metadata: {
                id_type: customerPayload.idType,
                dv: customerPayload.dv,
                person_type: customerPayload.personType
              }
            })
            .select()
            .single()

          savedDbRecord = inserted
        }
      }

      onSave(customerPayload, savedDbRecord)
      onClose()
    } catch (err: any) {
      console.error('Error saving customer DIAN:', err)
      setFormError(err.message || 'Error al guardar los datos del cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#E6F7F5',
                color: '#00B19D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Datos Fiscales del Cliente
                </h2>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    background: '#CCFBF1',
                    color: '#007D6E',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    letterSpacing: '0.03em'
                  }}
                >
                  DIAN UBL 2.1
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Requisitos legales para emisión electrónica y entrega de XML/PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Cerrar modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Quick Search Existing Client */}
        <div style={{ padding: '12px 24px 8px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8'
              }}
            />
            <input
              type="text"
              placeholder="Buscar cliente registrado por nombre, NIT, cédula o teléfono..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: 36,
                paddingRight: 12,
                fontSize: '0.82rem',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            />
          </div>

          {/* Autocomplete suggestions */}
          {filteredExisting.length > 0 && (
            <div
              style={{
                marginTop: 8,
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '6px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', padding: '2px 8px', textTransform: 'uppercase' }}>
                Clientes existentes encontrados:
              </span>
              {filteredExisting.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectExisting(c)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#E6F7F5'
                    e.currentTarget.style.borderColor = '#99F6E4'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F8FAFC'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                      {c.full_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      {c.email || c.address || 'Sin correo'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#00B19D',
                      background: '#CCFBF1',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {c.tax_id ? `NIT: ${c.tax_id}` : c.phone || 'Seleccionar'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {formError && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {/* Group 1: Document & DV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.8fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                Tipo de Documento *
              </label>
              <select
                value={idType}
                onChange={e => setIdType(e.target.value as any)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="13">C.C. (Cédula de Ciudadanía)</option>
                <option value="31">NIT (Número Tributario)</option>
                <option value="22">C.E. (Cédula Extranjería)</option>
                <option value="41">Pasaporte</option>
                <option value="12">Tarjeta de Identidad</option>
                <option value="11">Registro Civil</option>
                <option value="42">Doc. Identificación Extranjero</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                Número de Identificación *
              </label>
              <input
                type="text"
                placeholder={idType === '31' ? 'Ej: 900123456' : 'Ej: 1018456789'}
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                DV {idType === '31' && <span style={{ color: '#16A34A', fontSize: '0.65rem' }}> Auto</span>}
              </label>
              <input
                type="text"
                placeholder="-"
                value={dv}
                readOnly={idType === '31'}
                onChange={e => setDv(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: idType === '31' ? '1.5px solid #5EEAD4' : '1.5px solid #E2E8F0',
                  background: idType === '31' ? '#E6F7F5' : '#FFFFFF',
                  color: idType === '31' ? '#008F7E' : '#0F172A',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  textAlign: 'center',
                  outline: 'none'
                }}
                title="Dígito de Verificación calculado según Módulo 11 de la DIAN"
              />
            </div>
          </div>

          {/* Group 2: Razón Social / Nombre */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
              Razón Social o Nombre Completo *
            </label>
            <div style={{ position: 'relative' }}>
              <Building2
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8'
                }}
              />
              <input
                type="text"
                placeholder="EJ: DISTRIBUIDORA LOS ANDES S.A.S. O JUAN PÉREZ"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 40,
                  paddingLeft: 36,
                  paddingRight: 12,
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Group 3: Email (Obligatorio DIAN) & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#007D6E', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={13} />
                  <span>Correo Facturación Electrónica *</span>
                </label>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#00B19D', background: '#CCFBF1', padding: '1px 6px', borderRadius: '4px' }}>
                  Obligatorio XML/PDF
                </span>
              </div>
              <input
                type="email"
                placeholder="facturacion@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #5EEAD4',
                  background: '#F0F9FF',
                  color: '#0F172A',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Phone size={13} color="#64748B" />
                <span>Teléfono / WhatsApp</span>
              </label>
              <input
                type="text"
                placeholder="3001234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Group 4: Persona y Régimen Fiscal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                Tipo de Persona
              </label>
              <select
                value={personType}
                onChange={e => setPersonType(e.target.value as any)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="2"> Persona Natural (2)</option>
                <option value="1"> Persona Jurídica (1)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                Responsabilidad / Régimen Fiscal
              </label>
              <select
                value={regime}
                onChange={e => setRegime(e.target.value as any)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="49">No Responsable de IVA (49 / No Declarante)</option>
                <option value="48">Responsable de IVA (48 / Régimen Común)</option>
                <option value="04">Régimen Simple de Tributación (04 / SIMPLE)</option>
              </select>
            </div>
          </div>

          {/* Group 5: Dirección, Ciudad, Departamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <MapPin size={13} color="#64748B" />
                <span>Dirección Fiscal</span>
              </label>
              <input
                type="text"
                placeholder="Calle 100 # 15-20"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                Ciudad / Municipio
              </label>
              <input
                type="text"
                placeholder="Bogotá"
                value={city}
                onChange={e => setCity(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 4 }}>
                Departamento
              </label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {COLOMBIA_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle: Save to customer DB */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#1E293B',
              marginTop: 2
            }}
          >
            <input
              type="checkbox"
              checked={saveToDb}
              onChange={e => setSaveToDb(e.target.checked)}
              style={{
                accentColor: '#00B19D',
                width: 16,
                height: 16,
                cursor: 'pointer'
              }}
            />
            <span style={{ fontWeight: 600 }}>
              Guardar o actualizar este cliente en el directorio para futuras ventas
            </span>
          </label>

          {/* Modal Actions Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6,
              paddingTop: 14,
              borderTop: '1px solid #F1F5F9'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#64748B',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 24px',
                fontSize: '0.86rem',
                fontWeight: 800,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(0, 177, 157, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={17} />
              <span>{isSubmitting ? 'Guardando...' : 'Aplicar Datos a la Factura'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
