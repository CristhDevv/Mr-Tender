'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Truck
} from 'lucide-react'

interface FloralDelivery {
  id: string
  recipientName: string
  senderName: string
  phone: string
  address: string
  deliveryDate: string
  timeWindow: string
  occasion: string
  arrangement: string
  status: 'preparando' | 'en_ruta' | 'entregado'
}

const DEFAULT_DELIVERIES: FloralDelivery[] = [
  { id: '1', recipientName: 'Valentina Restrepo', senderName: 'Camilo Velasco', phone: '3124567890', address: 'Calle 127 # 15-40 Apto 502, Bogotá', deliveryDate: 'Hoy', timeWindow: '09:00 AM - 11:00 AM', occasion: 'Aniversario de Novios', arrangement: 'Box 24 Rosas Rojas + Ferrero', status: 'en_ruta' },
  { id: '2', recipientName: 'Dra. María Claudia Gómez', senderName: 'Clínica Los Nogales', phone: '3109876543', address: 'Carrera 7 # 116-50 Consultorio 304', deliveryDate: 'Hoy', timeWindow: '02:00 PM - 04:00 PM', occasion: 'Cumpleaños', arrangement: 'Bouquet de Girasoles & Lirios', status: 'preparando' },
  { id: '3', recipientName: 'Familia Morales Echeverri', senderName: 'Banco Davivienda', phone: '3156789012', address: 'Funeraria Gaviria Calle 98 # 17-20', deliveryDate: 'Hoy', timeWindow: '04:00 PM - 06:00 PM', occasion: 'Condolencias', arrangement: 'Corona Fúnebre Lirios & Orquídeas', status: 'preparando' }
]

export default function FloristDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<FloralDelivery[]>(DEFAULT_DELIVERIES)
  const [notice, setNotice] = useState('')

  const handleUpdateStatus = (id: string, newStatus: 'preparando' | 'en_ruta' | 'entregado') => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d))
    setNotice(`Estado de entrega actualizado a "${newStatus.toUpperCase()}"!`)
    setTimeout(() => setNotice(''), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
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
              Agenda de Entregas Florales & Domicilios
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Programación de despachos con franjas horarias y confirmación de entrega
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {deliveries.map(d => {
          const isDelivered = d.status === 'entregado'
          const isEnRuta = d.status === 'en_ruta'
          return (
            <div
              key={d.id}
              className="neu-card"
              style={{
                padding: '18px 22px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0F172A' }}>{d.recipientName}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#F8FAFC', color: '#008F7E', border: '1px solid #CCFBF1' }}>
                    {d.occasion}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>💐 {d.arrangement}</span>
                  <span>📍 {d.address}</span>
                  <span>📞 {d.phone}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                  De parte de: <strong>{d.senderName}</strong> • Horario: <strong>{d.timeWindow}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={d.status}
                  onChange={e => handleUpdateStatus(d.id, e.target.value as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    border: '1px solid #CBD5E1',
                    background: isDelivered ? '#DCFCE7' : isEnRuta ? '#E0F2FE' : '#F0EDFC',
                    color: isDelivered ? '#15803D' : isEnRuta ? '#0369A1' : '#5534B8'
                  }}
                >
                  <option value="preparando">⏳ En Preparación</option>
                  <option value="en_ruta">🚚 En Ruta de Entrega</option>
                  <option value="entregado">✅ Entregado con Éxito</option>
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
