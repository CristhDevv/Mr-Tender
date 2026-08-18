'use client'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BarChart3,
  Package,
  Users,
  DollarSign,
  ClipboardList,
  Truck,
  FileSpreadsheet,
  FileText
} from 'lucide-react'

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
  { Icon: BarChart3, title: 'Ventas por período', desc: 'Reporte detallado de ventas con filtros de fecha, vendedor, producto y cliente.', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
  { Icon: Package, title: 'Inventario', desc: 'Estado del stock, movimientos, rotación ABC y valorización del inventario.', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
  { Icon: Users, title: 'Clientes', desc: 'Ranking de clientes, frecuencia de compra, ticket promedio y retención.', color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
  { Icon: DollarSign, title: 'Caja y arqueos', desc: 'Historial de cierres de caja, diferencias y resumen por método de pago.', color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
  { Icon: ClipboardList, title: 'Estado de resultados', desc: 'Ingresos, costos, gastos y utilidad bruta/neta del período.', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
  { Icon: Truck, title: 'Proveedores y compras', desc: 'Órdenes de compra, gastos por proveedor y cuentas por pagar.', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
]

export default function ReportsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reportes y Analítica</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>Datos actualizados al {new Date().toLocaleDateString('es-CO')}</p>
      </div>

      <div className="neu-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Ventas mensuales 2026</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>*Agosto parcial</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-neu" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>
            <button className="btn-neu" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={14} />
              <span>PDF</span>
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MONTHLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`$${Number(v).toLocaleString('es-CO')}`, 'Ventas']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
            <Bar dataKey="ventas" fill="#4A90D9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {REPORT_TYPES.map(r => {
          const ReportIcon = r.Icon
          return (
            <button key={r.title} className="neu-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', border: 'none', width: '100%', textAlign: 'left' }}>
              <div className="kpi-icon-wrap" style={{ background: r.bg, width: 36, height: 36, flexShrink: 0 }}>
                <ReportIcon size={18} strokeWidth={2} style={{ color: r.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, fontSize: '0.9rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
