'use client'
import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface DBCustomer {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  total_purchases: number
  total_orders: number
  points_balance: number
  credit_limit: number
  credit_used: number
  last_purchase_at: string | null
  is_active: boolean
}

export default function CustomersPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [customers, setCustomers] = useState<DBCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomers() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id

        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenant_id)
          .order('full_name', { ascending: true })

        if (error) throw error
        if (data) {
          setCustomers(data as any)
          if (data.length > 0) setSelected(data[0].id)
        }
      } catch (err) {
        console.error('Error loading customers:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCustomers()
  }, [])

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  )

  const selectedCustomer = customers.find(c => c.id === selected)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando clientes...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {/* List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Clientes</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{customers.length} clientes registrados</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>⬆ Importar</button>
            <button className="btn-neu btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>+ Nuevo cliente</button>
          </div>
        </div>

        <div className="input-group">
          <span className="input-icon">🔍</span>
          <input className="input-neu" placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="neu-card" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <table className="table-neu">
            <thead>
              <tr>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Compras totales</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'center' }}>Puntos</th>
                <th>Última compra</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => (
                <tr key={customer.id} onClick={() => setSelected(customer.id)} style={{ cursor: 'pointer', background: selected === customer.id ? 'var(--accent-blue-lt)' : undefined }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-purple)', flexShrink: 0 }}>
                        {customer.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{customer.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{customer.phone || 'Sin teléfono'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(customer.total_purchases)}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge badge-gray">{customer.total_orders}</span></td>
                  <td style={{ textAlign: 'center' }}><span className="badge badge-amber">⭐ {customer.points_balance}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{customer.last_purchase_at ? formatDate(customer.last_purchase_at) : 'Nunca'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No se encontraron clientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedCustomer && (
        <div className="neu-card animate-scale-in" style={{ width: 300, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-purple)', margin: '0 auto 12px', boxShadow: 'var(--neu-raised)' }}>
              {selectedCustomer.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedCustomer.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{selectedCustomer.email || 'Sin correo electrónico'}</div>
          </div>

          <div className="divider" />

          {[
            { label: 'Compras totales', value: formatCurrency(selectedCustomer.total_purchases), icon: '💰' },
            { label: 'Pedidos', value: selectedCustomer.total_orders, icon: '🛒' },
            { label: 'Puntos acumulados', value: `⭐ ${selectedCustomer.points_balance}`, icon: '🏆' },
            { label: 'Crédito disponible', value: formatCurrency(selectedCustomer.credit_limit - selectedCustomer.credit_used), icon: '💳' },
          ].map(item => (
            <div key={item.label} className="neu-flat" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.icon} {item.label}</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.value}</span>
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn-neu btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', justifyContent: 'center' }}>🛒 Nueva venta</button>
            <button className="btn-neu" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', justifyContent: 'center' }}>✏️ Editar cliente</button>
            <button className="btn-neu" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', justifyContent: 'center' }}>📋 Ver historial</button>
          </div>
        </div>
      )}
    </div>
  )
}
