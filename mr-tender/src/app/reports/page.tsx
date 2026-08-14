'use client'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const MONTHLY = [
  { month: 'Feb', ventas: 88200, pedidos: 342 },
  { month: 'Mar', ventas: 104500, pedidos: 398 },
  { month: 'Abr', ventas: 96800, pedidos: 371 },
  { month: 'May', ventas: 118000, pedidos: 447 },
  { month: 'Jun', ventas: 132400, pedidos: 502 },
  { month: 'Jul', ventas: 149800, pedidos: 568 },
  { month: 'Ago*', ventas: 78200, pedidos: 298 },
]

const REPORT_TYPES = [
  { icon: '📊', title: 'Ventas por período', desc: 'Reporte detallado de ventas con filtros de fecha, vendedor, producto y cliente.' },
  { icon: '📦', title: 'Inventario', desc: 'Estado del stock, movimientos, rotación ABC y valorización del inventario.' },
  { icon: '👥', title: 'Clientes', desc: 'Ranking de clientes, frecuencia de compra, ticket promedio y retención.' },
  { icon: '💰', title: 'Caja y arqueos', desc: 'Historial de cierres de caja, diferencias y resumen por método de pago.' },
  { icon: '📋', title: 'Estado de resultados', desc: 'Ingresos, costos, gastos y utilidad bruta/neta del período.' },
  { icon: '🚚', title: 'Proveedores y compras', desc: 'Órdenes de compra, gastos por proveedor y cuentas por pagar.' },
]

export default function ReportsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reportes y Analítica</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 3 }}>Datos actualizados al {new Date().toLocaleDateString('es-MX')}</p>
      </div>

      <div className="neu-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Ventas mensuales 2026</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>*Agosto parcial</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-neu" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>📥 Excel</button>
            <button className="btn-neu" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>📄 PDF</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={MONTHLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`$${Number(v).toLocaleString('es-MX')}`, 'Ventas']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
            <Bar dataKey="ventas" fill="#4A90D9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {REPORT_TYPES.map(r => (
          <button key={r.title} className="neu-card" style={{ padding: '20px 22px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', border: 'none', width: '100%', textAlign: 'left' }}>
            <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: '0.95rem' }}>{r.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
