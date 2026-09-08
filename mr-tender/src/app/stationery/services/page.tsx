'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  Globe,
  FileCheck,
  Smartphone,
  CreditCard,
  Printer,
  ArrowLeft,
  CheckCircle2,
  ShoppingCart,
  Clock,
  Scan
} from 'lucide-react'

interface DigitalService {
  id: string
  name: string
  category: 'tramite' | 'escaneo' | 'internet' | 'laminacion'
  price: number
  description: string
}

const DIGITAL_SERVICES: DigitalService[] = [
  { id: '1', name: 'Certificado de Antecedentes de Policía', category: 'tramite', price: 3000, description: 'Consulta, descarga e impresión en papel bond' },
  { id: '2', name: 'Certificado de Procuraduría & Contraloría', category: 'tramite', price: 3000, description: 'Descarga con código de verificación' },
  { id: '3', name: 'Descarga de RUT DIAN con Contraseña', category: 'tramite', price: 5000, description: 'Descarga del PDF actualizado del RUT' },
  { id: '4', name: 'Certificado de Afiliación EPS / ADRES (FOSYGA)', category: 'tramite', price: 2500, description: 'Consulta de estado de afiliación a salud' },
  { id: '5', name: 'Escaneo a PDF por Hoja / Documento', category: 'escaneo', price: 1000, description: 'Escáner de alta resolución con envío directo a WhatsApp o Correo' },
  { id: '6', name: 'Impresión desde Memoria USB / WhatsApp / Correo', category: 'escaneo', price: 500, description: 'Apertura de archivo y servicio de recepción' },
  { id: '7', name: 'Plastificado de Carné / Cédula / Pase', category: 'laminacion', price: 1500, description: 'Funda plástica térmica 100 micras' },
  { id: '8', name: 'Tiempo de Computador / Internet (Hora)', category: 'internet', price: 2000, description: 'Navegación e investigación para estudiantes' }
]

export default function StationeryServicesPage() {
  const [services] = useState<DigitalService[]>(DIGITAL_SERVICES)
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState('')

  const handleQtyChange = (id: string, delta: number) => {
    setSelectedCounts(prev => {
      const current = prev[id] || 0
      const updated = Math.max(0, current + delta)
      return { ...prev, [id]: updated }
    })
  }

  const total = Object.entries(selectedCounts).reduce((acc, [id, qty]) => {
    const s = services.find(srv => srv.id === id)
    return acc + (s ? s.price * qty : 0)
  }, 0)

  const itemsCount = Object.values(selectedCounts).reduce((a, b) => a + b, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Servicios Digitales, Trámites & Internet
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Tarificador de antecedentes, descargas de RUT, escaneos a WhatsApp y plastificados
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {services.map(srv => {
          const qty = selectedCounts[srv.id] || 0
          return (
            <div
              key={srv.id}
              className="neu-card"
              style={{
                padding: '16px 18px',
                background: '#FFFFFF',
                border: qty > 0 ? '1.5px solid #00B19D' : '1px solid #E2E8F0',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{srv.name}</h4>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(srv.price)}</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                {srv.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 8, marginTop: 'auto' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Cantidad:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => handleQtyChange(srv.id, -1)}
                    disabled={qty === 0}
                    className="btn-neu"
                    style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}
                  >
                    -
                  </button>
                  <span style={{ width: 24, textAlign: 'center', fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>{qty}</span>
                  <button
                    onClick={() => handleQtyChange(srv.id, 1)}
                    className="btn-neu"
                    style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, background: '#E6F7F5', color: '#00B19D' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating Bottom Checkout Bar if items selected */}
      {itemsCount > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 20,
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '14px 24px',
            borderRadius: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 50
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{itemsCount} servicios seleccionados</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(total)}</div>
          </div>

          <button
            type="button"
            onClick={() => { setNotice(`¡${itemsCount} servicios digitales (${formatCurrency(total)}) enviados al POS!`); setSelectedCounts({}); setTimeout(() => setNotice(''), 5000) }}
            style={{
              padding: '10px 22px',
              fontSize: '0.86rem',
              fontWeight: 800,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ShoppingCart size={16} />
            <span>Cobrar en POS</span>
          </button>
        </div>
      )}
    </div>
  )
}
