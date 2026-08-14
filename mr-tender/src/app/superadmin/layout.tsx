'use client'
import { useState, useEffect } from 'react'
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20, boxShadow: '4px 4px 10px rgba(139,114,190,0.4)', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-purple)', fontWeight: 600 }}>⚡ Superadmin</div>
          </div>
        </div>
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
          <button className="btn-neu btn-ghost" onClick={handleLogout} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', justifyContent: 'center', color: 'var(--accent-coral)' }}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {SUPERADMIN_NAV.find(i => i.href === pathname)?.label || 'Superadmin'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-purple)', fontWeight: 600 }}>Panel de Plataforma</div>
          </div>
        </header>
        <main style={{ flex: 1, padding: '28px', maxWidth: 1400, width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
