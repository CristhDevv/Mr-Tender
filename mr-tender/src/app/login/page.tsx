'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if session already exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const isSuperadmin = session.user.user_metadata?.role === 'superadmin' || session.user.app_metadata?.role === 'superadmin'
        window.location.href = isSuperadmin ? '/superadmin' : '/dashboard'
      }
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    try {
      // 9s timeout promise to prevent infinite spinner
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('El servidor tardó en responder. Por favor intenta de nuevo.')), 9000)
      )

      const authPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      const res = await Promise.race([authPromise, timeoutPromise])
      const { data, error: authErr } = res

      if (authErr) {
        throw authErr
      }

      if (!data?.user) {
        throw new Error('No se pudo verificar la sesión. Por favor intenta de nuevo.')
      }

      const role = data.user.app_metadata?.role || data.user.user_metadata?.role
      const isSuperadmin = role === 'superadmin'

      if (isSuperadmin) {
        window.location.href = '/superadmin'
        return
      }

      // Check user permissions with quick timeout
      let targetPath = '/dashboard'
      try {
        const permPromise = supabase.rpc('get_user_permissions', { p_user_id: data.user.id })
        const permTimeout = new Promise<any>((resolve) => setTimeout(() => resolve({ data: null }), 1200))
        const permRes = await Promise.race([permPromise, permTimeout])
        
        if (permRes?.data && permRes.data.is_admin === false) {
          const perms = permRes.data.permissions || []
          if (perms.includes('pos.view') && !perms.includes('reports.financial') && !perms.includes('*')) {
            targetPath = '/pos'
          } else if (perms.includes('inventory.view') && !perms.includes('pos.view') && !perms.includes('*')) {
            targetPath = '/inventory'
          }
        }
      } catch (e) {
        // Fallback to dashboard
      }

      // Hard redirect guarantees cookie delivery and fresh SSR state
      window.location.href = targetPath
    } catch (err: any) {
      console.error('Login error:', err)
      setError(
        err.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos. Por favor verifica tus datos.'
          : err.message || 'Error al iniciar sesión. Intenta nuevamente.'
      )
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: '40px 36px', background: '#FFFFFF' }}>

        {/* Logo & Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/logo-isotipo.png"
            alt="Mr Tender"
            style={{ width: 68, height: 68, margin: '0 auto 14px', display: 'block', objectFit: 'contain' }}
          />
          <h1 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Bienvenido de vuelta
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 6, margin: 0 }}>
            Ingresa a tu cuenta de Mr Tender
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input
              className="input-neu"
              type="email"
              autoComplete="username email"
              placeholder="tu@negocio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              className="input-neu"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '10px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 600 }}>
               {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-neu btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 4, padding: '12px', fontSize: '0.92rem', fontWeight: 800 }}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ height: 1, background: '#E2E8F0', margin: '24px 0' }} />
        
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: '#00D6BC', fontWeight: 700, textDecoration: 'none' }}>
            Registrarte gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
