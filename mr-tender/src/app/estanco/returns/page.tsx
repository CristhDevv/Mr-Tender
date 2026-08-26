'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  RotateCcw,
  Beer,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Truck,
  Users,
  X
} from 'lucide-react'

interface ReturnableContainer {
  id: string
  tenant_id: string
  container_name: string
  deposit_amount: number
  stock_empty_in_store: number
  stock_with_customers: number
  created_at: string
}

interface ContainerMovement {
  id: string
  tenant_id: string
  container_id: string
  movement_type: 'loan_to_customer' | 'returned_by_customer' | 'sent_to_supplier' | 'received_from_supplier'
  quantity: number
  customer_name?: string | null
  deposit_total: number
  notes?: string | null
  created_at: string
  liquor_returnable_containers?: {
    container_name: string
  }
}

export default function EstancoReturnsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [containers, setContainers] = useState<ReturnableContainer[]>([])
  const [movements, setMovements] = useState<ContainerMovement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    container_name: 'Canasta Cerveza 30 Botellas Vidrio',
    deposit_amount: 15000,
    stock_empty_in_store: 12,
    stock_with_customers: 6
  })

  useEffect(() => {
    loadContainers()
  }, [])

  async function loadContainers() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [cRes, mRes] = await Promise.all([
        supabase.from('liquor_returnable_containers').select('*').eq('tenant_id', tid).order('container_name', { ascending: true }),
        supabase.from('liquor_container_movements').select('*, liquor_returnable_containers(container_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(20)
      ])

      setContainers(cRes.data || [])
      setMovements((mRes.data as any) || [])
    } catch (err) {
      console.error('Error loading returnable containers:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateContainer(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('liquor_returnable_containers').insert({
        tenant_id: tenantId,
        container_name: form.container_name,
        deposit_amount: Number(form.deposit_amount) || 0,
        stock_empty_in_store: Number(form.stock_empty_in_store) || 0,
        stock_with_customers: Number(form.stock_with_customers) || 0
      })

      if (error) throw error
      setShowModal(false)
      await loadContainers()
    } catch (err: any) {
      alert(err.message || 'Error al crear envase retornable')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoContainers() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          container_name: 'Canasta Cerveza Águila / Poker (30 Botellas)',
          deposit_amount: 15000,
          stock_empty_in_store: 24,
          stock_with_customers: 10
        },
        {
          tenant_id: tenantId,
          container_name: 'Botella Individual Vidrio 330ml (Casco)',
          deposit_amount: 1000,
          stock_empty_in_store: 120,
          stock_with_customers: 45
        },
        {
          tenant_id: tenantId,
          container_name: 'Canasta Gaseosa Postobón 350ml (30 Botellas)',
          deposit_amount: 12000,
          stock_empty_in_store: 15,
          stock_with_customers: 4
        }
      ]
      await supabase.from('liquor_returnable_containers').insert(demo)
      await loadContainers()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const totalEmptyInStore = containers.reduce((acc, c) => acc + Number(c.stock_empty_in_store || 0), 0)
  const totalWithCustomers = containers.reduce((acc, c) => acc + Number(c.stock_with_customers || 0), 0)
  const totalDepositValue = containers.reduce((acc, c) => acc + (Number(c.stock_with_customers || 0) * Number(c.deposit_amount || 0)), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Catálogo & Inventario</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Envases Retornables</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <RotateCcw size={24} style={{ color: 'var(--accent-green)' }} />
            Control de Envases Retornables, Cascos & Depósitos
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Registro de canastas y botellas en préstamo con clientes, inventario de cascos vacíos y recambio con camión distribuidor.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Tipo de Envase</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Vacíos en Tienda</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green)' }}>{totalEmptyInStore} unds</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Listos para cambio con camión</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>En Calle (Clientes)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{totalWithCustomers} unds</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Garantía: {formatCurrency(totalDepositValue)}</div>
          </div>
        </div>
      </div>

      {/* Containers Grid */}
      {containers.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Beer size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay envases retornables registrados</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra tus canastas de cerveza o gaseosa para llevar el balance de cascos y depósitos en garantía.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoContainers} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Envases Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {containers.map(c => (
            <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{c.container_name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Depósito / Garantía: {formatCurrency(c.deposit_amount)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.78rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Vacíos en Tienda</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-green)', fontSize: '1rem' }}>{c.stock_empty_in_store} unds</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>En Calle / Clientes</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-amber)', fontSize: '1rem' }}>{c.stock_with_customers} unds</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Envase */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 460, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Envase Retornable</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateContainer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Envase / Canasta</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Canasta Cerveza 30x Vidrio"
                  value={form.container_name}
                  onChange={e => setForm({ ...form, container_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Depósito / Garantía (COP)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.deposit_amount}
                  onChange={e => setForm({ ...form, deposit_amount: Number(e.target.value) })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Stock Inicial Vacíos</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock_empty_in_store}
                    onChange={e => setForm({ ...form, stock_empty_in_store: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Prestados a Clientes</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock_with_customers}
                    onChange={e => setForm({ ...form, stock_with_customers: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Guardar Envase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
