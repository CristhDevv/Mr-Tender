'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Footprints,
  Shirt,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react'

interface ApparelFittingRoom {
  id: string
  tenant_id: string
  room_number: string
  customer_name?: string | null
  pieces_in_room: number
  assigned_advisor?: string | null
  status: 'available' | 'occupied' | 'cleaning'
  occupied_since?: string | null
  created_at: string
}

export default function ApparelFittingRoomsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<ApparelFittingRoom[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    room_number: 'Vestidor 1',
    customer_name: '',
    pieces_in_room: 3,
    assigned_advisor: 'Asesor de Piso'
  })

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('apparel_fitting_rooms')
        .select('*')
        .eq('tenant_id', tid)
        .order('room_number', { ascending: true })

      if (error) throw error

      let list = data || []
      if (list.length === 0) {
        list = [
          { id: '1', tenant_id: tid, room_number: 'Vestidor 1 (Cabina Dama)', customer_name: 'Marcela Arango', pieces_in_room: 4, assigned_advisor: 'Laura Asesora', status: 'occupied', occupied_since: '10:15 AM', created_at: new Date().toISOString() },
          { id: '2', tenant_id: tid, room_number: 'Vestidor 2 (Cabina Caballero)', customer_name: null, pieces_in_room: 0, assigned_advisor: null, status: 'available', occupied_since: null, created_at: new Date().toISOString() },
          { id: '3', tenant_id: tid, room_number: 'Vestidor 3 (Cabina VIP)', customer_name: 'Felipe Mendoza', pieces_in_room: 2, assigned_advisor: 'Carlos Asesor', status: 'occupied', occupied_since: '10:20 AM', created_at: new Date().toISOString() }
        ]
      }

      setRooms(list)
    } catch (err) {
      console.error('Error loading fitting rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateRoomStatus(id: string, status: 'available' | 'occupied' | 'cleaning') {
    try {
      await supabase
        .from('apparel_fitting_rooms')
        .update({
          status,
          customer_name: status === 'available' ? null : undefined,
          pieces_in_room: status === 'available' ? 0 : undefined
        })
        .eq('id', id)
      await loadRooms()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Probadores & Vestidores</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Footprints size={24} style={{ color: 'var(--accent-purple)' }} />
            Control de Probadores & Prendas en Cabina
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Prevención de pérdidas, conteo de prendas por cliente en vestidor y disponibilidad en tiempo real.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/apparel/matrix"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Shirt size={15} />
            <span>Matriz Tallas</span>
          </Link>
          <button
            onClick={loadRooms}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {rooms.map(r => {
          const isOcc = r.status === 'occupied'

          return (
            <div key={r.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{r.room_number}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Asesor: {r.assigned_advisor || 'Sin asignar'}</div>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: isOcc ? 'var(--accent-coral-lt)' : 'var(--accent-green-lt)',
                  color: isOcc ? 'var(--accent-coral)' : 'var(--accent-green)'
                }}>
                  {isOcc ? 'Ocupado' : 'Disponible'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Cliente:</strong> {r.customer_name || 'Ninguno'}</div>
                <div><strong>Prendas en Cabina:</strong> 🏷️ {r.pieces_in_room} prendas</div>
                {r.occupied_since && <div><strong>Ocupado desde:</strong> ⏰ {r.occupied_since}</div>}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                {isOcc ? (
                  <button
                    onClick={() => handleUpdateRoomStatus(r.id, 'available')}
                    className="btn-neu btn-primary"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.78rem' }}
                  >
                    <CheckCircle2 size={14} /> Liberar Vestidor & Verificar Prendas
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateRoomStatus(r.id, 'occupied')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 700 }}
                  >
                    Ingresar Cliente
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
