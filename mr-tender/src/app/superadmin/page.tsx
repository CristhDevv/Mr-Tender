'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Store,
  CreditCard,
  Layers,
  Tag,
  ArrowRight,
  Plus,
  Zap,
  Activity,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { ALL_SYSTEM_MODULES } from '@/lib/constants/modules'

interface Tenant {
  id: string
  name: string
  slug: string
  owner_name: string
  owner_email: string
  business_type: string
  country: string
  status: string
  created_at: string
}

export default function SuperadminDashboard() {
  const supabase = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [subscriptionsCount, setSubscriptionsCount] = useState(0)
  const [couponsCount, setCouponsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [tenantsRes, subsRes, coupRes] = await Promise.all([
        supabase.from('platform_tenants').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('platform_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('platform_coupons').select('id', { count: 'exact', head: true })
      ])

      setTenants(tenantsRes.data || [])
      setSubscriptionsCount(subsRes.count || 0)
      setCouponsCount(coupRes.count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeTenantsCount = tenants.filter(t => t.status === 'active').length
  const trialTenantsCount = tenants.filter(t => t.status === 'trial').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', overflowX: 'hidden' }}>
      
      {/* Top Welcome & Shortcuts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Panel de Control Superadmin
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '3px 0 0' }}>
            Gestión global, monitoreo multi-inquilino y control modular de la plataforma.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/superadmin/tenants/new"
            className="btn-neu btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} strokeWidth={2} />
            <span>Crear Negocio</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards - Monochrome & Minimalist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Inquilinos Totales
            </span>
            <Store size={16} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {tenants.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {activeTenantsCount} activos • {trialTenantsCount} en prueba
          </div>
        </div>

        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suscripciones
            </span>
            <CreditCard size={16} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {subscriptionsCount || tenants.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Ciclos de facturación
          </div>
        </div>

        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Módulos del Sistema
            </span>
            <Layers size={16} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {ALL_SYSTEM_MODULES.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            10 Base + 11 Verticales
          </div>
        </div>

        <div className="neu-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cupones Activos
            </span>
            <Tag size={16} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {couponsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Campañas promocionales
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <Link
          href="/superadmin/tenants"
          className="neu-card"
          style={{ textDecoration: 'none', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, transition: '0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Gestión de Negocios</strong>
            </div>
            <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Administra comercios, asigna módulos, credenciales y estados.
          </p>
        </Link>

        <Link
          href="/superadmin/plans"
          className="neu-card"
          style={{ textDecoration: 'none', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, transition: '0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Planes de Suscripción</strong>
            </div>
            <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Configura tarifas, límites de usuarios y capacidades de servicio.
          </p>
        </Link>

        <Link
          href="/superadmin/subscriptions"
          className="neu-card"
          style={{ textDecoration: 'none', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, transition: '0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Suscripciones</strong>
            </div>
            <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Control de vigencias, renovaciones y períodos de prueba.
          </p>
        </Link>

        <Link
          href="/superadmin/coupons"
          className="neu-card"
          style={{ textDecoration: 'none', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, transition: '0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Cupones</strong>
            </div>
            <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Generador de códigos con descuento en porcentaje o monto fijo.
          </p>
        </Link>
      </div>

      {/* Recent Tenants Table */}
      <div className="neu-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Últimos Comercios Registrados
          </div>
          <Link href="/superadmin/tenants" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none' }}>
            Ver todos →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Comercio</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Propietario</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Giro</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>País</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <Link href={`/superadmin/tenants/${t.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                      {t.name}
                    </Link>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {t.slug}.mrtender.com
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>{t.owner_name || '—'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.owner_email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {t.business_type || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {t.country}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: 'var(--bg-deep)',
                      color: 'var(--text-primary)'
                    }}>
                      {t.status === 'active' ? 'Activo' : t.status === 'trial' ? 'En Prueba' : 'Suspendido'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/superadmin/tenants/${t.id}`}
                      className="btn-neu"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', background: 'var(--bg)', color: 'var(--text-primary)' }}
                    >
                      Gestionar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
