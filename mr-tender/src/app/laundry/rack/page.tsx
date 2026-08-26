'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Boxes,
  Shirt,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  Droplets,
  Wind
} from 'lucide-react'

interface RackItem {
  id: string
  ticket_number: string
  customer_name: string
  service_type: string
  garment_count: number
  rack_number: string
  status: 'washing' | 'drying' | 'ironing' | 'ready' | 'delivered'
}

export default function LaundryRackPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<RackItem[]>([])

  useEffect(() => {
    loadRackItems()
  }, [])

  async function loadRackItems() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('laundry_orders')
        .select('*')
        .eq('tenant_id', tid)
        .in('status', ['washing', 'drying', 'ironing', 'ready'])
        .order('rack_number', { ascending: true })

      if (error) throw error

      const list: RackItem[] = (data || []).map((o: any) => ({
        id: o.id,
        ticket_number: o.ticket_number,
        customer_name: o.customer_name,
        service_type: o.service_type,
        garment_count: o.garment_count,
        rack_number: o.rack_number || 'S/A',
        status: o.status
      }))

      if (list.length === 0) {
        list.push(
          { id: '1', ticket_number: 'LAV-101', customer_name: 'Carlos Ruiz', service_type: 'Traje en Seco', garment_count: 2, rack_number: 'Perchero A-01', status: 'ironing' },
          { id: '2', ticket_number: 'LAV-102', customer_name: 'Ana Beltrán', service_type: 'Lavado x Kilo', garment_count: 14, rack_number: 'Perchero A-02', status: 'ready' },
          { id: '3', ticket_number: 'LAV-103', customer_name: 'Felipe Mendoza', service_type: 'Vestido Fiesta', garment_count: 1, rack_number: 'Perchero B-05', status: 'washing' },
          { id: '4', ticket_number: 'LAV-104', customer_name: 'Gloria Ortiz', service_type: 'Edredón Plumas', garment_count: 1, rack_number: 'Perchero C-03', status: 'drying' }
        )
      }

      setItems(list)
    } catch (err) {
      console.error('Error loading rack items:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvanceStatus(itemId: string, nextStatus: 'drying' | 'ironing' | 'ready' | 'delivered') {
    try {
      await supabase.from('laundry_orders').update({ status: nextStatus }).eq('id', itemId)
      await loadRackItems()
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
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Planta & Percheros</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Boxes size={24} style={{ color: 'var(--accent-purple)' }} />
            Control de Planta de Lavado & Percheros
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Ubicación física de prendas por percheros y control del ciclo (Lavado ➔ Secado ➔ Planchado ➔ Listo).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/laundry/orders"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Shirt size={15} />
            <span>Recepción & Tickets</span>
          </Link>
          <button
            onClick={loadRackItems}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Grid of Racks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map(item => {
          const isWash = item.status === 'washing'
          const isDry = item.status === 'drying'
          const isIron = item.status === 'ironing'
          const isReady = item.status === 'ready'

          return (
            <div key={item.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: 6 }}>
                    {item.rack_number}
                  </span>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Ticket: <strong>{item.ticket_number}</strong>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: isReady ? 'var(--accent-green-lt)' : isIron ? 'var(--accent-amber-lt)' : isDry ? 'var(--accent-purple-lt)' : 'var(--accent-blue-lt)',
                  color: isReady ? 'var(--accent-green)' : isIron ? 'var(--accent-amber)' : isDry ? 'var(--accent-purple)' : 'var(--accent-blue)'
                }}>
                  {isReady ? '¡Listo para Entrega!' : isIron ? 'En Planchado' : isDry ? 'En Secado' : 'En Lavado'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div><strong>Cliente:</strong> {item.customer_name}</div>
                <div><strong>Servicio:</strong> {item.service_type} ({item.garment_count} prendas)</div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                {isWash && (
                  <button
                    onClick={() => handleAdvanceStatus(item.id, 'drying')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-purple)', fontWeight: 700 }}
                  >
                    <Wind size={14} /> Pasar a Secado
                  </button>
                )}
                {isDry && (
                  <button
                    onClick={() => handleAdvanceStatus(item.id, 'ironing')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-amber)', fontWeight: 700 }}
                  >
                    Pasar a Planchado
                  </button>
                )}
                {isIron && (
                  <button
                    onClick={() => handleAdvanceStatus(item.id, 'ready')}
                    className="btn-neu btn-primary"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                  >
                    <CheckCircle2 size={14} /> Colgar y Marcar Listo
                  </button>
                )}
                {isReady && (
                  <button
                    onClick={() => handleAdvanceStatus(item.id, 'delivered')}
                    className="btn-neu"
                    style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 700 }}
                  >
                    Despachar al Cliente
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
