'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Eye,
  Glasses,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Phone,
  X
} from 'lucide-react'

interface LabOrder {
  id: string
  tenant_id: string
  order_number: string
  patient_name: string
  frame_model: string
  lens_type: string
  lab_supplier: string
  status: 'sent_to_lab' | 'surfacing' | 'coating' | 'mounting' | 'ready_for_patient' | 'delivered'
  promised_date: string
  created_at: string
}

export default function OptometryLabPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<LabOrder[]>([])

  useEffect(() => {
    loadLabOrders()
  }, [])

  async function loadLabOrders() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('optometry_lab_orders')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error

      let list = data || []
      if (list.length === 0) {
        list = [
          {
            id: '1',
            tenant_id: tid,
            order_number: 'LAB-2081',
            patient_name: 'Camila Montoya',
            frame_model: 'Montura Ray-Ban Aviator 3025 Dorado',
            lens_type: 'Policarbonato Antirreflejo Verde AR',
            lab_supplier: 'Laboratorio Oftálmico Essilor',
            status: 'surfacing',
            promised_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            tenant_id: tid,
            order_number: 'LAB-2082',
            patient_name: 'Gonzalo Pardo',
            frame_model: 'Montura Oakley Holbrook Negro Mate',
            lens_type: 'Progresivo Digital FreeForm Transitions Gen 8',
            lab_supplier: 'Laboratorio Servióptica',
            status: 'ready_for_patient',
            promised_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
            created_at: new Date().toISOString()
          }
        ]
      }
      setOrders(list)
    } catch (err) {
      console.error('Error loading lab orders:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(id: string, status: 'surfacing' | 'mounting' | 'ready_for_patient' | 'delivered') {
    try {
      await supabase.from('optometry_lab_orders').update({ status }).eq('id', id)
      await loadLabOrders()
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
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Laboratorio Oftálmico</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={24} style={{ color: 'var(--accent-purple)' }} />
            Control de Órdenes de Laboratorio & Talla de Lentes
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Seguimiento de tallado de lentes, tratamientos antirreflejo, biselado y montaje en montura.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/optometry/patients"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Glasses size={15} />
            <span>Historias Clínicas</span>
          </Link>
          <button
            onClick={loadLabOrders}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {orders.map(o => {
          const isReady = o.status === 'ready_for_patient'
          const isDeliv = o.status === 'delivered'
          const isSurfacing = o.status === 'surfacing'

          return (
            <div key={o.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{o.patient_name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Orden: <strong>{o.order_number}</strong> • {o.lab_supplier}</div>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: isDeliv ? 'var(--bg-deep)' : isReady ? 'var(--accent-green-lt)' : isSurfacing ? 'var(--accent-amber-lt)' : 'var(--accent-purple-lt)',
                  color: isDeliv ? 'var(--text-muted)' : isReady ? 'var(--accent-green)' : isSurfacing ? 'var(--accent-amber)' : 'var(--accent-purple)'
                }}>
                  {isDeliv ? 'Entregado a Paciente' : isReady ? '¡Lente Listo en Tienda!' : isSurfacing ? 'En Tallado / Laboratorio' : 'En Montaje'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Montura:</strong> {o.frame_model}</div>
                <div><strong>Lente / Tratamiento:</strong> {o.lens_type}</div>
                <div><strong>Fecha Promesa:</strong> 📅 {formatDate(o.promised_date)}</div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                {isSurfacing && (
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'mounting')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-purple)', fontWeight: 700 }}
                  >
                    Recibido de Lab ➔ Biselar y Montar
                  </button>
                )}
                {!isReady && !isDeliv && (
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'ready_for_patient')}
                    className="btn-neu btn-primary"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                  >
                    <CheckCircle2 size={14} /> ¡Montaje Listo! Avisar Paciente
                  </button>
                )}
                {isReady && (
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'delivered')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 700 }}
                  >
                    Entregar Gafas al Paciente
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
