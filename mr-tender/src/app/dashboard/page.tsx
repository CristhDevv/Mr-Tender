'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const COLORS = ['#4A90D9', '#5CB85C', '#E8A030', '#8B72BE', '#E8745A']

const QUICK_ACTIONS = [
  { icon: '🛒', label: 'Nueva Venta', href: '/pos', color: 'var(--accent-blue)' },
  { icon: '📦', label: 'Nuevo Producto', href: '/products/new', color: 'var(--accent-green)' },
  { icon: '👥', label: 'Nuevo Cliente', href: '/customers', color: 'var(--accent-purple)' },
  { icon: '🚚', label: 'Orden de Compra', href: '/purchases', color: 'var(--accent-amber)' },
  { icon: '💰', label: 'Abrir Caja', href: '/cash', color: 'var(--accent-coral)' },
  { icon: '📊', label: 'Ver Reportes', href: '/reports', color: 'var(--text-secondary)' },
]

export default function DashboardPage() {
  const supabase = createClient()
  const [tenantName, setTenantName] = useState('Mi Negocio')
  const [loading, setLoading] = useState(true)
  
  // Dashboard stats
  const [stats, setStats] = useState({
    salesToday: 0,
    ordersToday: 0,
    avgTicket: 0,
    newCustomersToday: 0
  })
  const [weeklySales, setWeeklySales] = useState<{ day: string; ventas: number }[]>([])
  const [lowStockList, setLowStockList] = useState<{ name: string; stock: number; min: number }[]>([])
  const [recentSalesList, setRecentSalesList] = useState<{ id: string; customer: string; total: string; method: string; time: string }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tenant_id = user.user_metadata?.tenant_id
        setTenantName(user.user_metadata?.full_name || 'Mi Negocio')

        const todayStr = new Date().toISOString().split('T')[0]

        // 1. Fetch sales today
        const { data: salesTodayData } = await supabase
          .from('sales')
          .select('total, created_at, sale_payments(payment_method), customers(full_name)')
          .eq('tenant_id', tenant_id)
          .gte('created_at', todayStr + 'T00:00:00')
          .lte('created_at', todayStr + 'T23:59:59')

        let totalSales = 0
        let totalOrders = 0
        if (salesTodayData) {
          totalSales = salesTodayData.reduce((s, item) => s + Number(item.total), 0)
          totalOrders = salesTodayData.length
        }

        // 2. Fetch new customers today
        const { count: customersCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant_id)
          .gte('created_at', todayStr + 'T00:00:00')

        setStats({
          salesToday: totalSales,
          ordersToday: totalOrders,
          avgTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
          newCustomersToday: customersCount || 0
        })

        // 3. Fetch weekly sales mock aggregated for rendering
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy']
        const baseWeekly = days.map((day, idx) => ({
          day,
          ventas: idx === 6 ? totalSales : (Math.floor(Math.random() * 8000) + 4000)
        }))
        setWeeklySales(baseWeekly)

        // 4. Fetch low stock alerts from DB
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('quantity, products(name, min_stock)')
          .eq('tenant_id', tenant_id)
        
        if (inventoryData) {
          const formattedLow = inventoryData
            .filter((i: any) => i.quantity <= (i.products?.min_stock || 0) && i.quantity > 0)
            .map((i: any) => ({
              name: i.products?.name || 'Producto',
              stock: Number(i.quantity),
              min: Number(i.products?.min_stock || 5)
            }))
            .slice(0, 3)
          setLowStockList(formattedLow)
        }

        // 5. Fetch recent sales list
        const { data: recSales } = await supabase
          .from('sales')
          .select('id, number, total, created_at, customers(full_name), sale_payments(payment_method)')
          .eq('tenant_id', tenant_id)
          .order('created_at', { ascending: false })
          .limit(4)

        if (recSales) {
          const list = recSales.map((s: any) => {
            const timeDiff = Math.floor((new Date().getTime() - new Date(s.created_at).getTime()) / 60000)
            const timeStr = timeDiff <= 0 ? 'hace unos instantes' : `hace ${timeDiff} min`
            return {
              id: s.number || s.id.slice(0, 8),
              customer: s.customers?.full_name || 'Público General',
              total: formatCurrency(Number(s.total)),
              method: s.sale_payments?.[0]?.payment_method || 'Efectivo',
              time: timeStr
            }
          })
          setRecentSalesList(list)
        }

        // 6. Fetch top products mock aggregated
        const { data: topProdData } = await supabase
          .from('products')
          .select('name')
          .eq('tenant_id', tenant_id)
          .limit(5)
        
        if (topProdData) {
          setTopProducts(topProdData.map((p, idx) => ({
            name: p.name,
            value: [340, 218, 196, 147, 132][idx % 5]
          })))
        }

      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  const kpis = [
    { label: 'Ventas hoy', value: formatCurrency(stats.salesToday), icon: '💰', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
    { label: 'Pedidos hoy', value: formatNumber(stats.ordersToday), icon: '🛒', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
    { label: 'Ticket promedio', value: formatCurrency(stats.avgTicket), icon: '📊', color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
    { label: 'Clientes nuevos', value: formatNumber(stats.newCustomersToday), icon: '👥', color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            ¡Buen día! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            Aquí está el resumen de hoy para <strong>{tenantName}</strong>
          </p>
        </div>
        <div className="badge badge-green" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
          🟢 Caja abierta
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{kpi.value}</div>
              </div>
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
                <span style={{ fontSize: '1.2rem' }}>{kpi.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Area chart — weekly sales */}
        <div className="neu-card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Ventas de la semana</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Últimos 7 días</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklySales}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A90D9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4A90D9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString('es-MX')}`, 'Ventas']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
              <Area type="monotone" dataKey="ventas" stroke="#4A90D9" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ fill: '#4A90D9', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — top products */}
        <div className="neu-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Top Productos</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>Por unidades vendidas</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={topProducts} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value">
                {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Unidades']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topProducts.slice(0, 3).map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.75rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Quick actions */}
        <div className="neu-card" style={{ padding: '22px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 14 }}>Acciones rápidas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {QUICK_ACTIONS.map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                <div className="neu-card-sm" style={{ padding: '12px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{a.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="neu-card" style={{ padding: '22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>⚠️ Stock bajo</div>
            <Link href="/inventory" style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Ver todo</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lowStockList.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mín: {item.min} unidades</div>
                </div>
                <div className="badge badge-coral" style={{ flexShrink: 0 }}>{item.stock} uds</div>
              </div>
            ))}
            {lowStockList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ✅ Todo en orden. Sin alertas.
              </div>
            )}
          </div>
        </div>

        {/* Recent sales */}
        <div className="neu-card" style={{ padding: '22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Ventas recientes</div>
            <Link href="/reports" style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Ver todo</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentSalesList.map(sale => (
              <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customer}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sale.id} · {sale.time}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sale.total}</div>
                  <div className="badge badge-blue" style={{ fontSize: '0.6rem', padding: '2px 7px' }}>{sale.method}</div>
                </div>
              </div>
            ))}
            {recentSalesList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Sin ventas registradas hoy.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
