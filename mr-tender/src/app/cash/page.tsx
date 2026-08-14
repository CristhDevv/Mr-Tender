'use client'
import { useState, useEffect } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface DBCashSession {
  id: string
  status: string
  opening_amount: number
  expected_amount: number
  total_sales: number
  total_expenses: number
  opened_at: string
}

interface DBCashMovement {
  id: string
  movement_type: string
  amount: number
  description: string
  created_at: string
}

export default function CashPage() {
  const supabase = createClient()
  const [session, setSession] = useState<DBCashSession | null>(null)
  const [movements, setMovements] = useState<DBCashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCashData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id

        // Load active session
        const { data: sessions, error: sessErr } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('tenant_id', tenant_id)
          .eq('status', 'open')
          .limit(1)

        if (sessErr) throw sessErr

        if (sessions && sessions.length > 0) {
          const currentSession = sessions[0]
          setSession(currentSession as any)

          // Load movements for this session
          const { data: movs, error: movsErr } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('session_id', currentSession.id)
            .order('created_at', { ascending: false })

          if (movsErr) throw movsErr
          if (movs) setMovements(movs as any)
        }
      } catch (err: any) {
        console.error(err)
        setError('Error al cargar datos de caja')
      } finally {
        setLoading(false)
      }
    }
    loadCashData()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando caja...</div>
      </div>
    )
  }

  const totalSales = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + Number(m.amount), 0)
  const totalExpenses = Math.abs(movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'withdrawal').reduce((s, m) => s + Number(m.amount), 0))
  const opening = session ? Number(session.opening_amount) : 0
  const expected = opening + totalSales - totalExpenses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Caja</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {session ? `Turno abierto desde las ${new Date(session.opened_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Caja cerrada'}
          </p>
        </div>
        {session ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>+ Ingreso</button>
            <button className="btn-neu" style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--accent-coral)' }}>− Egreso</button>
            <button className="btn-neu btn-danger" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>🔒 Cerrar caja</button>
          </div>
        ) : (
          <button className="btn-neu btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>🔓 Abrir turno de caja</button>
        )}
      </div>

      {session && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Fondo inicial', value: formatCurrency(opening), icon: '💰', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
              { label: 'Ventas del turno', value: formatCurrency(totalSales), icon: '🛒', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
              { label: 'Egresos', value: formatCurrency(totalExpenses), icon: '📤', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
              { label: 'Efectivo esperado', value: formatCurrency(expected), icon: '🏦', color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
            ].map(s => (
              <div key={s.label} className="kpi-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <div className="kpi-icon-wrap" style={{ background: s.bg }}><span style={{ fontSize: '1.2rem' }}>{s.icon}</span></div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="neu-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--bg-deep)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Movimientos del turno</div>
            <table className="table-neu">
              <thead><tr><th>Hora</th><th>Descripción</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {new Date(m.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.description}</span></td>
                    <td><span className={`badge ${m.movement_type === 'sale' ? 'badge-green' : m.movement_type === 'opening' ? 'badge-blue' : 'badge-coral'}`}>{m.movement_type}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: m.amount < 0 ? 'var(--accent-coral)' : 'var(--accent-green)' }}>
                      {m.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(m.amount))}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No se han registrado movimientos en este turno
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!session && (
        <div className="neu-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>💰</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>El turno de caja está cerrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Abre un turno con un monto inicial para comenzar a vender en el POS.</p>
          <button className="btn-neu btn-primary" style={{ padding: '12px 28px' }}>Abrir caja ahora</button>
        </div>
      )}
    </div>
  )
}
