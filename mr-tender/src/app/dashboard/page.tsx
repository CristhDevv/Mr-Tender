'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  DollarSign,
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  Truck,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Plus,
  TrendingUp
} from 'lucide-react'

const COLORS = ['#4A90D9', '#5CB85C', '#E8A030', '#8B72BE', '#E8745A']

const QUICK_ACTIONS = [
  { Icon: ShoppingCart, label: 'Nueva Venta', href: '/pos', color: 'var(--accent-blue)' },
  { Icon: Package, label: 'Nuevo Producto', href: '/products/new', color: 'var(--accent-green)' },
  { Icon: Users, label: 'Nuevo Cliente', href: '/customers', color: 'var(--accent-purple)' },
  { Icon: Truck, label: 'Orden de Compra', href: '/purchases', color: 'var(--accent-amber)' },
  { Icon: DollarSign, label: 'Abrir Caja', href: '/cash', color: 'var(--accent-coral)' },
  { Icon: BarChart3, label: 'Ver Reportes', href: '/reports', color: 'var(--text-secondary)' },
]

export default function DashboardPage() {
  const supabase = createClient()
  const [tenantName, setTenantName] = useState('Mi Negocio')
  const [loading, setLoading] = useState(true)

  // Dashboard stats
  const [stats, setStats] = useState({
    salesToday: 0,
    ordersToday: 0,
    profitToday: 0,
    avgTicket: 0,
    grossMargin: 0,
    pendingCredit: 0
  })
  const [cajaStatus, setCajaStatus] = useState<boolean>(false)
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
        if (!tenant_id) return
        setTenantName(user.user_metadata?.full_name || 'Mi Negocio')

        const todayStr = new Date().toISOString().split('T')[0]
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        // 1. Fetch sales today with items for margin calculation
        const [salesTodayRes, allSalesRes, custRes, regRes, invRes, topItemsRes] = await Promise.all([
          supabase
            .from('sales')
            .select(`
              total, created_at,
              sale_payments (payment_method),
              customers (full_name),
              sale_items (quantity, cost_price, total)
            `)
            .eq('tenant_id', tenant_id)
            .gte('created_at', todayStr + 'T00:00:00')
            .lte('created_at', todayStr + 'T23:59:59'),
          supabase
            .from('sales')
            .select('total, created_at')
            .eq('tenant_id', tenant_id)
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: true }),
          supabase
            .from('customers')
            .select('credit_used')
            .eq('tenant_id', tenant_id),
          supabase
            .from('cash_registers')
            .select('current_session_id')
            .eq('tenant_id', tenant_id)
            .limit(1),
          supabase
            .from('inventory')
            .select('quantity, products (name, min_stock)')
            .eq('tenant_id', tenant_id),
          supabase
            .from('sale_items')
            .select('product_name, quantity, total')
            .limit(100)
        ])

        // Sales today KPIs
        const salesTodayData = salesTodayRes.data || []
        const totalSales = salesTodayData.reduce((s, item) => s + Number(item.total || 0), 0)
        const totalOrders = salesTodayData.length
        
        let totalCost = 0
        salesTodayData.forEach((s: any) => {
          (s.sale_items || []).forEach((item: any) => {
            totalCost += (Number(item.cost_price || 0) * Number(item.quantity || 1))
          })
        })
        const totalProfit = totalSales - totalCost
        const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0
        const totalPendingCredit = (custRes.data || []).reduce((s, c) => s + Number(c.credit_used || 0), 0)

        setStats({
          salesToday: totalSales,
          ordersToday: totalOrders,
          profitToday: totalProfit,
          avgTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
          grossMargin,
          pendingCredit: totalPendingCredit
        })

        // Cash status
        setCajaStatus(!!(regRes.data?.[0]?.current_session_id))

        // 7-day Real Trend
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const past7DaysMap: Record<string, { label: string; ventas: number }> = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = d.toISOString().split('T')[0]
          past7DaysMap[key] = { label: i === 0 ? 'Hoy' : dayNames[d.getDay()], ventas: 0 }
        }

        (allSalesRes.data || []).forEach((s: any) => {
          const sKey = s.created_at.split('T')[0]
          if (past7DaysMap[sKey]) {
            past7DaysMap[sKey].ventas += Number(s.total || 0)
          }
        })

        setWeeklySales(Object.values(past7DaysMap).map(v => ({ day: v.label, ventas: v.ventas })))

        // Low stock list
        if (invRes.data) {
          const formattedLow = invRes.data
            .filter((i: any) => Number(i.quantity) <= (i.products?.min_stock || 5) && Number(i.quantity) > 0)
            .map((i: any) => ({
              name: i.products?.name || 'Producto',
              stock: Number(i.quantity),
              min: Number(i.products?.min_stock || 5)
            }))
            .slice(0, 4)
          setLowStockList(formattedLow)
        }

        // Recent sales list
        const recList = salesTodayData.slice(0, 5).map((s: any) => {
          const timeDiff = Math.floor((new Date().getTime() - new Date(s.created_at).getTime()) / 60000)
          const timeStr = timeDiff <= 0 ? 'hace instantes' : `hace ${timeDiff} min`
          return {
            id: s.number || 'V-Ref',
            customer: s.customers?.full_name || 'Público General',
            total: formatCurrency(Number(s.total)),
            method: s.sale_payments?.[0]?.payment_method || 'Efectivo',
            time: timeStr
          }
        })
        setRecentSalesList(recList)

        // Real Top Selling Products
        const prodCountMap: Record<string, number> = {}
        ;(topItemsRes.data || []).forEach((ti: any) => {
          if (ti.product_name) {
            prodCountMap[ti.product_name] = (prodCountMap[ti.product_name] || 0) + Number(ti.quantity || 1)
          }
        })
        const sortedTop = Object.entries(prodCountMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }))

        setTopProducts(sortedTop.length > 0 ? sortedTop : [
          { name: 'Sin ventas aún', value: 1 }
        ])

      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  const kpis = [
    { label: 'Ventas hoy', value: formatCurrency(stats.salesToday), Icon: DollarSign, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
    { label: 'Utilidad total', value: formatCurrency(stats.profitToday), Icon: TrendingUp, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
    { label: 'Pedidos hoy', value: formatNumber(stats.ordersToday), Icon: ShoppingCart, color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
    { label: 'Margen bruto est.', value: `${stats.grossMargin.toFixed(1)}%`, Icon: BarChart3, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
    { label: 'Fiados por cobrar', value: formatCurrency(stats.pendingCredit), Icon: Users, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            ¡Buen día!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
            Panel gerencial para <strong>{tenantName}</strong>
          </p>
        </div>
        <div className={`badge ${cajaStatus ? 'badge-green' : 'badge-coral'}`} style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cajaStatus ? 'var(--accent-green)' : 'var(--accent-coral)' }} />
          <span>{cajaStatus ? 'Caja abierta' : 'Caja cerrada'}</span>
        </div>
      </div>

      {/* KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {kpis.map(kpi => {
          const Icon = kpi.Icon
          return (
            <div key={kpi.label} className="kpi-card animate-fade-in" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{kpi.value}</div>
                </div>
                <div className="kpi-icon-wrap" style={{ background: kpi.bg, width: 34, height: 34 }}>
                  <Icon size={16} strokeWidth={2} style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Area chart — weekly sales */}
        <div className="neu-card" style={{ padding: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Ventas de la semana</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Últimos 7 días</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={weeklySales}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A90D9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4A90D9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString('es-MX')}`, 'Ventas']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
              <Area type="monotone" dataKey="ventas" stroke="#4A90D9" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ fill: '#4A90D9', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — top products */}
        <div className="neu-card" style={{ padding: '16px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Top Productos</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Por unidades vendidas</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={topProducts} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Unidades']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topProducts.slice(0, 3).map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

        {/* Quick actions */}
        <div className="neu-card" style={{ padding: '16px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 10 }}>Acciones rápidas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {QUICK_ACTIONS.map(a => {
              const ActionIcon = a.Icon
              return (
                <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                  <div className="neu-card-sm" style={{ padding: '10px 6px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <ActionIcon size={18} strokeWidth={2} style={{ color: a.color }} />
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.label}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="neu-card" style={{ padding: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} strokeWidth={2} style={{ color: 'var(--accent-amber)' }} />
              <span>Stock bajo</span>
            </div>
            <Link href="/inventory" style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Ver todo</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lowStockList.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Mín: {item.min} unidades</div>
                </div>
                <div className="badge badge-coral" style={{ flexShrink: 0, fontSize: '0.7rem' }}>{item.stock} uds</div>
              </div>
            ))}
            {lowStockList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--accent-green)' }} />
                <span>Todo en orden. Sin alertas.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent sales */}
        <div className="neu-card" style={{ padding: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Ventas recientes</div>
            <Link href="/reports" style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Ver todo</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSalesList.map(sale => (
              <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.customer}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{sale.id} · {sale.time}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sale.total}</div>
                  <div className="badge badge-blue" style={{ fontSize: '0.58rem', padding: '2px 6px' }}>{sale.method}</div>
                </div>
              </div>
            ))}
            {recentSalesList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Sin ventas registradas hoy.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
