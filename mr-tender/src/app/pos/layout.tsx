'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/hooks/usePermissions'
import CopilotWidget from '@/components/CopilotWidget'
import {
  ArrowLeft,
  Maximize,
  Minimize,
  LogOut,
  Lock,
  Store
} from 'lucide-react'

export default function POSPageLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const { roleName, color, isAdmin, hasPermission, loading: permsLoading } = usePermissions()

  const [user, setUser] = useState<{ full_name?: string; email?: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ full_name: user.user_metadata?.full_name, email: user.email })
      }
    }
    loadUser()

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAuthorized = isAdmin || hasPermission('pos.view')
  const getInitials = (name?: string) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'C'

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden'
    }}>
      {/* ── DEDICATED POS TOPBAR ── */}
      <header style={{
        height: 52,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--neu-subtle)',
        flexShrink: 0,
        zIndex: 30
      }}>
        {/* Left: Brand Identity & POS Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/logo.png" alt="Mr Tender" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Mr Tender
            </span>
          </div>

          <span className="pos-topbar-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'var(--accent-blue-lt)',
            color: 'var(--accent-blue)',
            fontWeight: 800,
            fontSize: '0.74rem',
            whiteSpace: 'nowrap'
          }}>
            <Store size={13} strokeWidth={2.5} />
            <span className="pos-topbar-text">Punto de Venta</span>
          </span>

          <div className="pos-topbar-divider" style={{ width: 1, height: 18, background: 'var(--border-color)' }} />

          {/* Quick Exit to Dashboard */}
          <Link
            href="/dashboard"
            className="btn-neu btn-ghost"
            title="Regresar al Panel Principal de Administración"
            style={{
              padding: '5px 8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--text-secondary)'
            }}
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span className="pos-topbar-text">Volver al Panel</span>
          </Link>
        </div>

        {/* Right: Cashier, Fullscreen & Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="btn-neu btn-ghost pos-fullscreen-btn"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Modo pantalla completa (F11)'}
            style={{
              padding: '6px 9px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--text-secondary)'
            }}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            <span>{isFullscreen ? 'Ventana' : 'Pantalla Completa'}</span>
          </button>

          <div className="pos-topbar-divider" style={{ width: 1, height: 18, background: 'var(--border-color)' }} />

          {/* Cashier Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              title={user?.full_name || 'Cajero'}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'var(--accent-blue-lt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.75rem',
                color: 'var(--accent-blue)',
                boxShadow: 'var(--neu-subtle)'
              }}
            >
              {getInitials(user?.full_name)}
            </div>

            <div className="pos-cashier-details" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || 'Cajero'}
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: color || 'var(--accent-blue)'
              }}>
                ● {roleName || 'Usuario'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn-neu btn-ghost"
            title="Cerrar sesión"
            style={{
              padding: '6px 8px',
              color: 'var(--accent-coral)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── MAIN POS VIEWPORT ── */}
      <main style={{
        flex: 1,
        height: 'calc(100dvh - 52px)',
        maxHeight: 'calc(100dvh - 52px)',
        padding: '6px 8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {!permsLoading && !isAuthorized ? (
          <div className="neu-card animate-scale-in" style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '60px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-coral-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-coral)' }}>
              <Lock size={28} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Acceso Restringido</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Tu rol actual (<strong>{roleName}</strong>) no tiene permisos para acceder al Punto de Venta.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Link href="/dashboard" className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                Ir al Panel Principal
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* AI Assistant Widget */}
      <CopilotWidget />
    </div>
  )
}
