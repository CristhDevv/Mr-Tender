'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/hooks/usePermissions'
import CopilotWidget from '@/components/CopilotWidget'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingBag,
  DollarSign,
  BarChart3,
  BookOpen,
  UserCheck,
  Globe,
  Settings,
  LogOut,
  Menu,
  Plus,
  Pill,
  ShieldAlert,
  Lock
} from 'lucide-react'

interface NavItemDef {
  href: string
  Icon: any
  label: string
  moduleKey?: string
  requiredPermission?: string
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  { href: '/dashboard',   Icon: LayoutDashboard, label: 'Inicio' },
  { href: '/pos',         Icon: ShoppingCart,    label: 'Punto de Venta', moduleKey: 'pos',         requiredPermission: 'pos.view' },
  { href: '/products',    Icon: Package,         label: 'Productos',                                requiredPermission: 'products.view' },
  { href: '/pharmacy',    Icon: Pill,            label: 'Droguería 💊',  moduleKey: 'pharmacy',     requiredPermission: 'products.view' },
  { href: '/inventory',   Icon: Boxes,           label: 'Inventario',     moduleKey: 'inventory',    requiredPermission: 'inventory.view' },
  { href: '/customers',   Icon: Users,           label: 'Clientes',       moduleKey: 'customers',    requiredPermission: 'customers.view' },
  { href: '/suppliers',   Icon: Truck,           label: 'Proveedores',    moduleKey: 'suppliers',    requiredPermission: 'suppliers.view' },
  { href: '/purchases',   Icon: ShoppingBag,     label: 'Compras',        moduleKey: 'purchases',    requiredPermission: 'purchases.view' },
  { href: '/cash',        Icon: DollarSign,      label: 'Caja',           moduleKey: 'cash',         requiredPermission: 'cash.view' },
  { href: '/reports',     Icon: BarChart3,       label: 'Reportes',       moduleKey: 'reports',      requiredPermission: 'reports.sales' },
  { href: '/accounting',  Icon: BookOpen,        label: 'Contabilidad',   moduleKey: 'accounting',   requiredPermission: 'accounting.view' },
  { href: '/employees',   Icon: UserCheck,       label: 'Empleados',      moduleKey: 'employees',    requiredPermission: 'employees.view' },
  { href: '/settings',    Icon: Settings,        label: 'Configuración',                            requiredPermission: 'settings.view' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { roleName, color, isAdmin, hasPermission, loading: permsLoading } = usePermissions()
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ full_name?: string; email?: string } | null>(null)
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
    pos: true, inventory: true, cash: true, customers: true,
    suppliers: true, purchases: true, employees: true,
    accounting: true, reports: true, ecommerce: false,
    pharmacy: false, restaurant: false
  })

  useEffect(() => {
    async function loadUserAndModules() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ full_name: user.user_metadata?.full_name, email: user.email })
        const tid = user.user_metadata?.tenant_id
        if (tid) {
          const { data: tData } = await supabase
            .from('tenant_settings')
            .select('enabled_modules')
            .eq('tenant_id', tid)
            .limit(1)

          if (tData?.[0]?.enabled_modules) {
            setEnabledModules(prev => ({ ...prev, ...tData[0].enabled_modules }))
          }
        }
      }
    }
    loadUserAndModules()
  }, [])

  // Filter navigation items by Tenant enabled modules AND User Role permissions
  const navItems = ALL_NAV_ITEMS.filter(item => {
    // 1. Module disabled globally for tenant
    if (item.moduleKey && enabledModules[item.moduleKey] === false) return false
    // 2. Permission check
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false
    return true
  })

  // Check if current page is authorized for user
  const currentNavItem = ALL_NAV_ITEMS.find(i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))
  const isPageAuthorized = !currentNavItem?.requiredPermission || hasPermission(currentNavItem.requiredPermission)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name?: string) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Clickable Brand Logo -> /dashboard */}
        <Link href="/dashboard" onClick={() => setSidebarOpen(false)} style={{ textDecoration: 'none', padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Mr Tender" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Panel de administración</div>
          </div>
        </Link>

        <div className="divider" style={{ margin: '0 16px 12px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const Icon = item.Icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <Icon size={18} strokeWidth={2} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile & Dynamic Role Badge */}
        <div className="divider" style={{ margin: '12px 16px 0' }} />
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-blue)', boxShadow: 'var(--neu-subtle)' }}>
              {getInitials(user?.full_name)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || 'Usuario'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Dynamic Role Pill */}
          <div style={{ marginBottom: 10 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              background: `${color}18`,
              color: color,
              border: `1px solid ${color}35`
            }}>
              <span>●</span>
              <span>{roleName}</span>
            </span>
          </div>

          <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', justifyContent: 'center', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={16} strokeWidth={2} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="app-content">
        {/* Topbar Header */}
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {/* Mobile Sidebar Hamburger Toggle */}
            <button className="btn-neu btn-ghost sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: '7px 10px', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Menu size={16} strokeWidth={2} />
              <span>Menú</span>
            </button>

            {/* Clickable Brand Logo (IMAGE LOGO) */}
            <Link href="/dashboard" title="Mr Tender - Ir a Inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img src="/logo.png" alt="Mr Tender" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
            </Link>

            <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

            {/* Current Page Title */}
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ALL_NAV_ITEMS.find(i => i.href === pathname)?.label || 'Dashboard'}
            </div>
          </div>

          {pathname !== '/pos' && hasPermission('pos.create_sale') && (
            <Link href="/pos" className="btn-neu btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva venta</span>
            </Link>
          )}
        </header>

        {/* Page or Access Denied Guard */}
        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1400, width: '100%', overflowX: 'hidden' }}>
          {!permsLoading && !isPageAuthorized ? (
            <div className="neu-card animate-scale-in" style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '60px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-coral-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-coral)' }}>
                <Lock size={28} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Acceso Restringido</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Tu rol actual (<strong>{roleName}</strong>) no tiene permisos para acceder a esta sección administrativa.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Link href="/pos" className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  Ir al Punto de Venta
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Omnipresent AI Assistant Widget */}
      <CopilotWidget />
    </div>
  )
}

