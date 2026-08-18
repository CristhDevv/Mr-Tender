'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  Plus
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',   Icon: LayoutDashboard, label: 'Inicio' },
  { href: '/pos',         Icon: ShoppingCart,    label: 'Punto de Venta' },
  { href: '/products',    Icon: Package,         label: 'Productos' },
  { href: '/inventory',   Icon: Boxes,           label: 'Inventario' },
  { href: '/customers',   Icon: Users,           label: 'Clientes' },
  { href: '/suppliers',   Icon: Truck,           label: 'Proveedores' },
  { href: '/purchases',   Icon: ShoppingBag,     label: 'Compras' },
  { href: '/cash',        Icon: DollarSign,      label: 'Caja' },
  { href: '/reports',     Icon: BarChart3,       label: 'Reportes' },
  { href: '/accounting',  Icon: BookOpen,        label: 'Contabilidad' },
  { href: '/employees',   Icon: UserCheck,       label: 'Empleados' },
  { href: '/ecommerce',   Icon: Globe,           label: 'E-commerce' },
  { href: '/settings',    Icon: Settings,        label: 'Configuración' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ full_name?: string; email?: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ full_name: data.user.user_metadata?.full_name, email: data.user.email })
    })
  }, [])

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
          {NAV_ITEMS.map(item => {
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

        {/* User */}
        <div className="divider" style={{ margin: '12px 16px 0' }} />
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-blue)', boxShadow: 'var(--neu-subtle)' }}>
              {getInitials(user?.full_name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || 'Administrador'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
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
              {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Dashboard'}
            </div>
          </div>

          {pathname !== '/pos' && (
            <Link href="/pos" className="btn-neu btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva venta</span>
            </Link>
          )}
        </header>

        {/* Page */}
        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1400, width: '100%', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
