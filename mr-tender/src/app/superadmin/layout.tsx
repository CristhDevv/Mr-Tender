'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SUPERADMIN_NAV = [
  { href: '/superadmin', icon: '⊞', label: 'Dashboard' },
  { href: '/superadmin/tenants', icon: '🏪', label: 'Negocios' },
  { href: '/superadmin/plans', icon: '📋', label: 'Planes' },
  { href: '/superadmin/subscriptions', icon: '💳', label: 'Suscripciones' },
  { href: '/superadmin/payments', icon: '💰', label: 'Pagos' },
  { href: '/superadmin/coupons', icon: '🏷', label: 'Cupones' },
  { href: '/superadmin/support', icon: '🎧', label: 'Soporte' },
  { href: '/superadmin/logs', icon: '📋', label: 'Logs' },
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
        <Link href="/superadmin" style={{ textDecoration: 'none', padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20, boxShadow: '4px 4px 10px rgba(139,114,190,0.4)', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-purple)', fontWeight: 600 }}>⚡ Superadmin</div>
          </div>
        </Link>

        <div className="divider" style={{ margin: '0 16px 12px' }} />

        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SUPERADMIN_NAV.map(item => (
            <Link key={item.href} href={item.href} className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}>
              <span style={{ fontSize: '1rem', width: 22, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="divider" style={{ margin: '12px 16px 0' }} />

        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Superadmin de plataforma</div>
          <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', justifyContent: 'center', color: 'var(--accent-coral)' }}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content & Topbar */}
      <div className="app-content">
        
        {/* Topbar visible on all screens (especially Mobile) */}
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Link href="/superadmin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, boxShadow: '3px 3px 8px rgba(139,114,190,0.4)' }}>M</div>
            </Link>
            <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {SUPERADMIN_NAV.find(i => i.href === pathname)?.label || 'Superadmin'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent-purple)', fontWeight: 600 }}>Panel de Plataforma</div>
            </div>
          </div>

          {/* Right actions: Navigation selector & Logout button on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-neu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ padding: '7px 12px', fontSize: '0.78rem', fontWeight: 700 }}>
              ☰ Menú
            </button>
            <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ padding: '7px 12px', fontSize: '0.78rem', color: 'var(--accent-coral)', fontWeight: 700 }}>
              🚪 Salir
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="neu-card animate-scale-in" style={{ margin: '10px 16px 0', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 50 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
              Navegación Superadmin
            </div>
            {SUPERADMIN_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <span style={{ fontSize: '1rem', width: 22 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="divider" style={{ margin: '6px 0' }} />
            <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '10px', fontSize: '0.82rem', justifyContent: 'center', color: 'var(--accent-coral)', fontWeight: 700 }}>
              🚪 Cerrar sesión
            </button>
          </div>
        )}

        <main style={{ flex: 1, padding: '20px', maxWidth: 1400, width: '100%' }}>
          {children}
        </main>
      </div>

    </div>
  )
}
