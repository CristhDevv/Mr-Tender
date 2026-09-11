'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { performLogout } from '@/lib/auth-client'
import {
  LayoutDashboard,
  Store,
  ClipboardList,
  CreditCard,
  CircleDollarSign,
  Tag,
  Headphones,
  FileText,
  Menu,
  LogOut
} from 'lucide-react'

const SUPERADMIN_NAV = [
  { href: '/superadmin',               Icon: LayoutDashboard,  label: 'Dashboard Global' },
  { href: '/superadmin/tenants',       Icon: Store,            label: 'Negocios & Comercios' },
  { href: '/superadmin/plans',         Icon: ClipboardList,    label: 'Planes SaaS' },
  { href: '/superadmin/subscriptions', Icon: CreditCard,       label: 'Suscripciones' },
  { href: '/superadmin/payments',      Icon: CircleDollarSign, label: 'Pagos Plataforma' },
  { href: '/superadmin/coupons',       Icon: Tag,              label: 'Cupones Descuento' },
  { href: '/superadmin/support',       Icon: Headphones,       label: 'Soporte & Tickets' },
  { href: '/superadmin/logs',          Icon: FileText,         label: 'Logs Auditoría' },
]

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('camilovelascoofficial@gmail.com')
  const [userName, setUserName] = useState<string>('Camilo Velasco')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || 'superadmin@mrtender.com')
        setUserName(user.user_metadata?.full_name || 'Super Administrador')
      }
    })
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await performLogout(supabase, '/login')
  }

  return (
    <div className="app-layout">
      
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <Link href="/superadmin" style={{ textDecoration: 'none', padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Mr Tender" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</div>
            <div style={{ fontSize: '0.68rem', color: '#BE185D', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>👑 Panel Superadmin</div>
          </div>
        </Link>

        <div className="divider" style={{ margin: '0 16px 12px' }} />

        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.05em' }}>
            Herramientas Globales
          </div>
          {SUPERADMIN_NAV.map(item => {
            const Icon = item.Icon
            const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`} style={isActive ? { fontWeight: 700 } : undefined}>
                <Icon size={18} strokeWidth={2} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="divider" style={{ margin: '12px 16px 0' }} />

        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FDF2F8', color: '#BE185D', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              👑
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#BE185D', fontWeight: 700 }}>
                Super Administrador
              </div>
            </div>
          </div>
          <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '7px', fontSize: '0.78rem', justifyContent: 'center', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            <LogOut size={14} strokeWidth={2} />
            <span>{loggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content & Topbar */}
      <div className="app-content">
        
        {/* Topbar visible on all screens (especially Mobile) */}
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Link href="/superadmin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img src="/logo.png" alt="Mr Tender" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
            </Link>
            <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {SUPERADMIN_NAV.find(i => i.href === pathname)?.label || 'Superadmin'}
              </div>
            </div>
          </div>

          {/* Right actions: Navigation selector & Logout button on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button className="btn-neu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ padding: '7px 10px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Menu size={14} strokeWidth={2} />
              <span>Menú</span>
            </button>
            <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ padding: '7px 10px', fontSize: '0.78rem', color: 'var(--accent-coral)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <LogOut size={14} strokeWidth={2} />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="neu-card animate-scale-in" style={{ margin: '10px 16px 0', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 50 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
              Navegación Superadmin
            </div>
            {SUPERADMIN_NAV.map(item => {
              const Icon = item.Icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <div className="divider" style={{ margin: '6px 0' }} />
            <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '10px', fontSize: '0.82rem', justifyContent: 'center', color: 'var(--accent-coral)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={16} strokeWidth={2} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        <main style={{ flex: 1, padding: '20px', maxWidth: 1400, width: '100%', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

    </div>
  )
}
