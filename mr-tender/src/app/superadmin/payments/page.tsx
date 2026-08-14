'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  paid_at: string;
  external_payment_id: string;
  platform_tenants: { name: string } | null;
}

export default function PaymentsAdminPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  async function fetchPayments() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('platform_payments')
        .select('*, platform_tenants(name)')
        .order('paid_at', { ascending: false })

      if (error) throw error
      setPayments(data as any || [])
    } catch (err: any) {
      console.error('Error fetching payments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filterStatus === 'all' ? payments : payments.filter(p => p.status === filterStatus)

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
  const totalFailed = payments.filter(p => p.status === 'failed').length
  const totalRefunded = payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + Number(p.amount), 0)

  const getStatusStyle = (status: string) => {
    const map: Record<string, { bg: string, color: string, label: string }> = {
      paid: { bg: 'rgba(74,186,134,0.12)', color: 'var(--accent-emerald)', label: 'Completado' },
      failed: { bg: 'rgba(235,94,85,0.12)', color: 'var(--accent-coral)', label: 'Fallido' },
      refunded: { bg: 'rgba(242,193,78,0.12)', color: 'var(--accent-gold)', label: 'Reembolsado' },
      pending: { bg: 'rgba(74,144,226,0.12)', color: 'var(--accent-blue)', label: 'Pendiente' },
    }
    return map[status] || { bg: 'var(--border-color)', color: 'var(--text-muted)', label: status }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Historial de Pagos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Trazabilidad y conciliación de todas las transacciones procesadas en la plataforma
          </p>
        </div>
        <button onClick={fetchPayments} className="btn-neu btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Ingresos Totales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>{formatCurrency(totalRevenue)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>USD cobrados</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Transacciones</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{payments.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>total registradas</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Pagos Fallidos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-coral)' }}>{totalFailed}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>requieren atención</div>
        </div>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Reembolsados</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-gold)' }}>{formatCurrency(totalRefunded)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>devueltos</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'paid', label: 'Completados' },
          { key: 'failed', label: 'Fallidos' },
          { key: 'refunded', label: 'Reembolsos' },
          { key: 'pending', label: 'Pendientes' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className="btn-neu btn-ghost"
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: filterStatus === f.key ? 700 : 500, color: filterStatus === f.key ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
            {f.label} {filterStatus === f.key && filtered.length > 0 && `(${filtered.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="neu-card" style={{ padding: '16px 20px', background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando pagos...</div>
      ) : filtered.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💰</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay transacciones en este filtro</h2>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-deep)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>ID Pago</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Negocio</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Monto</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Método</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Fecha de Pago</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const ss = getStatusStyle(p.status)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-deep)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      #{p.id.slice(0, 8).toUpperCase()}
                      {p.external_payment_id && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.7 }}>{p.external_payment_id}</div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(p as any).platform_tenants?.name || 'Inquilino desconocido'}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: p.status === 'paid' ? 'var(--accent-emerald)' : p.status === 'failed' ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                      {formatCurrency(p.amount)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{p.currency}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      💳 {p.payment_method}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {p.paid_at ? formatDate(p.paid_at) : '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.color }}>
                        {ss.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
