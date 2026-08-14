'use client'
import { useState, useEffect } from 'react'
import { createPlatformClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  paid_at: string;
  tenants: { name: string } | null;
}

export default function PaymentsAdminPage() {
  const supabase = createPlatformClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  async function fetchPayments() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payments')
        .select('*, tenants(name)')
        .order('paid_at', { ascending: false })

      if (error) throw error
      setPayments(data as any || [])
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Historial de Pagos
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Trazabilidad y conciliación de todas las transacciones procesadas en la plataforma
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando pagos...</div>
      ) : payments.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💰</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No hay pagos registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Las transacciones aparecerán aquí una vez que se procesen los cobros automáticos de Stripe.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>ID Pago</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Negocio (Tenant)</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Monto</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Método</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Fecha de Pago</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    #{p.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.tenants?.name || 'Inquilino desconocido'}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(p.amount)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.currency}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                    💳 {p.payment_method}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {formatDate(p.paid_at)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: p.status === 'paid' ? 'rgba(74,186,134,0.12)' : 'rgba(235,94,85,0.12)',
                      color: p.status === 'paid' ? 'var(--accent-emerald)' : 'var(--accent-coral)'
                    }}>
                      {p.status === 'paid' ? 'Completado' : 'Fallido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
