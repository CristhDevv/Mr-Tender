'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',   icon: '⊞',  label: 'Inicio' },
  { href: '/pos',         icon: '🛒',  label: 'Punto de Venta' },
  { href: '/products',    icon: '📦',  label: 'Productos' },
  { href: '/inventory',   icon: '🏭',  label: 'Inventario' },
  { href: '/customers',   icon: '👥',  label: 'Clientes' },
  { href: '/suppliers',   icon: '🚚',  label: 'Proveedores' },
  { href: '/purchases',   icon: '🛍',  label: 'Compras' },
  { href: '/cash',        icon: '💰',  label: 'Caja' },
  { href: '/reports',     icon: '📊',  label: 'Reportes' },
  { href: '/accounting',  icon: '📒',  label: 'Contabilidad' },
  { href: '/employees',   icon: '👤',  label: 'Empleados' },
  { href: '/ecommerce',   icon: '🌐',  label: 'E-commerce' },
  { href: '/settings',    icon: '⚙️',  label: 'Configuración' },
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
        <Link href="/dashboard" onClick={() => setSidebarOpen(false)} style={{ textDecoration: 'none', padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20, boxShadow: '4px 4px 10px rgba(74,144,217,0.4)', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Panel de administración</div>
          </div>
        </Link>

        <div className="divider" style={{ margin: '0 16px 12px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={`sidebar-nav-item ${pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
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
          <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', justifyContent: 'center', color: 'var(--accent-coral)' }}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="app-content">
        {/* Topbar */}
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile Sidebar Hamburger Toggle */}
          <button className="btn-neu btn-ghost sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 800 }}>
            ☰ Menú
          </button>

          {/* Clickable Brand logo in Topbar -> /dashboard */}
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, boxShadow: '3px 3px 8px rgba(74,144,217,0.4)', flexShrink: 0 }}>M</div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</span>
          </Link>

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 4px' }} />

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Dashboard'}
            </div>
          </div>

          {pathname !== '/pos' && (
            <Link href="/pos" className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
              + Nueva venta
            </Link>
          )}
        </header>

        {/* Page */}
        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1400, width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
