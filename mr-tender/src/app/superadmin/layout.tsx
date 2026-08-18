'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  { href: '/superadmin',               Icon: LayoutDashboard,  label: 'Dashboard' },
  { href: '/superadmin/tenants',       Icon: Store,            label: 'Negocios' },
  { href: '/superadmin/plans',         Icon: ClipboardList,    label: 'Planes' },
  { href: '/superadmin/subscriptions', Icon: CreditCard,       label: 'Suscripciones' },
  { href: '/superadmin/payments',      Icon: CircleDollarSign, label: 'Pagos' },
  { href: '/superadmin/coupons',       Icon: Tag,              label: 'Cupones' },
  { href: '/superadmin/support',       Icon: Headphones,       label: 'Soporte' },
  { href: '/superadmin/logs',          Icon: FileText,         label: 'Logs' },
]

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="app-layout">
      
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <Link href="/superadmin" style={{ textDecoration: 'none', padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Mr Tender" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-purple)', fontWeight: 600 }}>⚡ Superadmin</div>
          </div>
        </Link>

        <div className="divider" style={{ margin: '0 16px 12px' }} />

        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SUPERADMIN_NAV.map(item => {
            const Icon = item.Icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={2} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="divider" style={{ margin: '12px 16px 0' }} />

        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Superadmin de plataforma</div>
          <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', justifyContent: 'center', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={16} strokeWidth={2} />
            <span>Cerrar sesión</span>
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
