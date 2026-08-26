'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Activity,
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Dumbbell,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Maximize2
} from 'lucide-react'

interface CheckinLog {
  id: string
  member_name: string
  member_number: string
  plan_name: string
  status: 'allowed' | 'expired' | 'blocked'
  timestamp: string
}

export default function GymCheckinPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastCheckin, setLastCheckin] = useState<any>(null)
  const [recentLogs, setRecentLogs] = useState<CheckinLog[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        setTenantId(data.user.user_metadata.tenant_id)
      }
    })
  }, [])

  async function handleSearchMember(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim() || !tenantId) return
    setLoading(true)
    try {
      // Search member by ID, document or QR
      const { data: members, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`id_number.eq.${searchQuery.trim()},member_number.eq.${searchQuery.trim()},full_name.ilike.%${searchQuery.trim()}%`)
        .limit(1)

      if (error) throw error

      if (!members || members.length === 0) {
        setLastCheckin({
          status: 'not_found',
          name: searchQuery,
          message: 'Socio no encontrado en el sistema.'
        })
      } else {
        const m = members[0]
        const isExp = m.status === 'expired' || (m.membership_expires_at && new Date(m.membership_expires_at) < new Date())
        const isAllowed = !isExp && m.status !== 'inactive'

        const result = {
          status: isAllowed ? 'allowed' : 'expired',
          member: m,
          message: isAllowed ? '✓ ACCESO AUTORIZADO - BIENVENIDO' : '⚠️ MEMBRESÍA VENCIDA O INACTIVA'
        }
        setLastCheckin(result)

        // Prepend to logs
        setRecentLogs(prev => [
          {
            id: 'log_' + Date.now(),
            member_name: m.full_name,
            member_number: m.member_number,
            plan_name: m.plan_name || 'Plan Mensual',
            status: isAllowed ? 'allowed' : 'expired',
            timestamp: new Date().toLocaleTimeString('es-CO')
          },
          ...prev.slice(0, 9)
        ])
      }
      setSearchQuery('')
    } catch (err: any) {
      alert('Error en check-in: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Terminal Check-in QR</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={24} style={{ color: 'var(--accent-blue)' }} />
            Terminal de Acceso & Torniquete QR
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Escaneo rápido de código QR, documento de identidad o número de socio al ingresar.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/gym/members"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Dumbbell size={15} />
            <span>Socios & Membresías</span>
          </Link>
          <Link
            href="/gym/classes"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <Users size={15} />
            <span>Clases & Aforo</span>
          </Link>
        </div>
      </div>

      {/* Main Check-in Scanner Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="neu-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Validación de Ingreso</h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Ingresa la cédula o escanea el QR con pistola láser</p>
            </div>
          </div>

          <form onSubmit={handleSearchMember} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              autoFocus
              placeholder="Digita cédula, carnet o escanea QR..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-neu"
              style={{ flex: 1, padding: '12px 14px', fontSize: '0.92rem', fontWeight: 600 }}
            />
            <button type="submit" disabled={loading} className="btn-neu btn-primary" style={{ padding: '12px 18px', fontSize: '0.84rem' }}>
              {loading ? 'Validando...' : 'Validar'}
            </button>
          </form>

          {/* Feedback Screen */}
          {lastCheckin && (
            <div
              className="neu-card animate-scale-in"
              style={{
                padding: 20,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                background: lastCheckin.status === 'allowed' ? 'var(--accent-green-lt)' : 'var(--accent-coral-lt)',
                border: `2px solid ${lastCheckin.status === 'allowed' ? 'var(--accent-green)' : 'var(--accent-coral)'}`
              }}
            >
              {lastCheckin.status === 'allowed' ? (
                <CheckCircle2 size={42} style={{ color: 'var(--accent-green)' }} />
              ) : (
                <XCircle size={42} style={{ color: 'var(--accent-coral)' }} />
              )}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: lastCheckin.status === 'allowed' ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                {lastCheckin.message}
              </h2>
              {lastCheckin.member && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 4 }}>
                  <strong>{lastCheckin.member.full_name}</strong> (Carnet #{lastCheckin.member.member_number})
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Plan: {lastCheckin.member.plan_name || 'General'} • Vence: {formatDate(lastCheckin.member.membership_expires_at)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Check-in Log */}
        <div className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Historial de Accesos Recientes</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Últimos 10 registros</span>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Esperando lecturas de ingreso...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-deep)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.status === 'allowed' ? 'var(--accent-green)' : 'var(--accent-coral)' }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{log.member_name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{log.plan_name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
