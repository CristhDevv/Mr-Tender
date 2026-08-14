'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MRR_DATA = [
  { month: 'Mar', mrr: 2100, tenants: 28 },
  { month: 'Abr', mrr: 3400, tenants: 41 },
  { month: 'May', mrr: 5200, tenants: 58 },
  { month: 'Jun', mrr: 7800, tenants: 79 },
  { month: 'Jul', mrr: 11200, tenants: 102 },
  { month: 'Ago', mrr: 14800, tenants: 127 },
]

const RECENT_TENANTS = [
  { id: '1', name: 'Tienda La Esperanza', owner: 'Juan García', plan: 'Profesional', country: '🇲🇽', status: 'active', created: '2026-08-13' },
  { id: '2', name: 'Farmacia San Miguel', owner: 'Rosa Mendez', plan: 'Básico', country: '🇨🇴', status: 'active', created: '2026-08-12' },
  { id: '3', name: 'Restaurante El Fogón', owner: 'Carlos Ruiz', plan: 'Profesional', country: '🇲🇽', status: 'trial', created: '2026-08-11' },
  { id: '4', name: 'Ropa y Moda Chic', owner: 'Ana Torres', plan: 'Gratis', country: '🇵🇪', status: 'active', created: '2026-08-10' },
]

const planColors: Record<string, string> = { 'Profesional': 'badge-purple', 'Básico': 'badge-blue', 'Gratis': 'badge-gray', 'Empresarial': 'badge-amber' }

export default function SuperadminDashboard() {
  const [stats, setStats] = useState({ totalTenants: 127, activeTenants: 112, mrr: 14800, churn: 2.1 })

  const kpis = [
    { label: 'MRR', value: formatCurrency(stats.mrr, 'USD', 'en-US'), delta: '+32.1%', icon: '💰', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
    { label: 'Negocios totales', value: stats.totalTenants, delta: '+24.5%', icon: '🏪', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
    { label: 'Activos', value: stats.activeTenants, delta: '+22.0%', icon: '✅', color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
    { label: 'Churn mensual', value: `${stats.churn}%`, delta: '-0.4pp', icon: '📉', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Dashboard de Plataforma</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 3 }}>Métricas globales de Mr Tender</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>{kpi.value}</div>
              </div>
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
                <span style={{ fontSize: '1.2rem' }}>{kpi.icon}</span>
              </div>
            </div>
            <span className="delta-up">{kpi.delta} vs mes anterior</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="neu-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>MRR — Últimos 6 meses</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Monthly Recurring Revenue (USD)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MRR_DATA}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B72BE" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8B72BE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'MRR']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
              <Area type="monotone" dataKey="mrr" stroke="#8B72BE" strokeWidth={2.5} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="neu-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Negocios registrados</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Nuevos tenants por mes</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MRR_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
              <Bar dataKey="tenants" fill="#4A90D9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tenants */}
      <div className="neu-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-deep)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Negocios recientes</div>
          <a href="/superadmin/tenants" style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
        </div>
        <table className="table-neu">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Propietario</th>
              <th>Plan</th>
              <th>País</th>
              <th>Registro</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_TENANTS.map(tenant => (
              <tr key={tenant.id}>
                <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tenant.name}</span></td>
                <td><span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{tenant.owner}</span></td>
                <td><span className={`badge ${planColors[tenant.plan] || 'badge-gray'}`}>{tenant.plan}</span></td>
                <td style={{ fontSize: '1.2rem' }}>{tenant.country}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{formatDate(tenant.created)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${tenant.status === 'active' ? 'badge-green' : tenant.status === 'trial' ? 'badge-amber' : 'badge-gray'}`}>
                    {tenant.status === 'active' ? 'Activo' : tenant.status === 'trial' ? 'Trial' : 'Suspendido'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn-neu btn-icon-sm" title="Ver detalle">👁</button>
                    <button className="btn-neu btn-icon-sm" title="Suspender" style={{ color: 'var(--accent-coral)' }}>⏸</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
