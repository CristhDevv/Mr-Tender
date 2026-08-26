'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Sparkles,
  Dog,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  Scissors,
  Hotel,
  X
} from 'lucide-react'

interface GroomingHotelOrder {
  id: string
  pet_name: string
  owner_name: string
  service_type: 'grooming' | 'hotel'
  service_name: string
  price: number
  status: 'received' | 'in_service' | 'ready' | 'delivered'
  scheduled_time: string
}

export default function VetGroomingPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<GroomingHotelOrder[]>([])

  useEffect(() => {
    loadGrooming()
  }, [])

  async function loadGrooming() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const demo: GroomingHotelOrder[] = [
        {
          id: '1',
          pet_name: 'Lucas (Golden)',
          owner_name: 'Felipe Jaramillo',
          service_type: 'grooming',
          service_name: 'Baño Antipulgas + Corte de Uñas + Cepillado',
          price: 55000,
          status: 'in_service',
          scheduled_time: '11:00 AM'
        },
        {
          id: '2',
          pet_name: 'Mía (Persa)',
          owner_name: 'Marcela Arango',
          service_type: 'grooming',
          service_name: 'Deslanado + Baño en Seco',
          price: 45000,
          status: 'ready',
          scheduled_time: '12:30 PM'
        },
        {
          id: '3',
          pet_name: 'Toby (Beagle)',
          owner_name: 'Carlos Mendoza',
          service_type: 'hotel',
          service_name: 'Guardería Canina Día Completo',
          price: 35000,
          status: 'in_service',
          scheduled_time: '08:00 AM'
        }
      ]
      setServices(demo)
    } catch (err) {
      console.error('Error loading grooming services:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(id: string, status: 'in_service' | 'ready' | 'delivered') {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Peluquería & Spa Pet</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Scissors size={24} style={{ color: 'var(--accent-purple)' }} />
            Peluquería Canina, Spa & Guardería de Mascotas
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Turnos de baño, corte de pelo, deslanado, estadía en hotel canino y aviso al tutor de mascota lista.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/veterinary/pets"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Dog size={15} />
            <span>Pacientes Mascotas</span>
          </Link>
          <button
            onClick={loadGrooming}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {services.map(s => {
          const isReady = s.status === 'ready'
          const isInServ = s.status === 'in_service'
          const isDeliv = s.status === 'delivered'

          return (
            <div key={s.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{s.pet_name} 🐾</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tutor: {s.owner_name} • Hora: {s.scheduled_time}</div>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: isDeliv ? 'var(--bg-deep)' : isReady ? 'var(--accent-green-lt)' : 'var(--accent-purple-lt)',
                  color: isDeliv ? 'var(--text-muted)' : isReady ? 'var(--accent-green)' : 'var(--accent-purple)'
                }}>
                  {isDeliv ? 'Entregado' : isReady ? '¡Mascota Lista!' : 'En Baño / Spa'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Servicio:</strong> {s.service_name}</div>
                <div style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>Valor: {formatCurrency(s.price)}</div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                {isInServ && (
                  <button
                    onClick={() => handleUpdateStatus(s.id, 'ready')}
                    className="btn-neu btn-primary"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                  >
                    <CheckCircle2 size={14} /> ¡Marcar Listo y Avisar por WhatsApp!
                  </button>
                )}
                {isReady && (
                  <button
                    onClick={() => handleUpdateStatus(s.id, 'delivered')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 700 }}
                  >
                    Entregar Mascota al Tutor
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
