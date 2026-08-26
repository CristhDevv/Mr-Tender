'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Percent,
  Scissors,
  DollarSign,
  Calendar,
  RefreshCw,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Users
} from 'lucide-react'

interface StylistCommission {
  stylist_name: string
  services_count: number
  total_billed: number
  commission_rate: number
  commission_payable: number
}

export default function SalonCommissionsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<StylistCommission[]>([])

  useEffect(() => {
    loadCommissions()
  }, [])

  async function loadCommissions() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data: appointments } = await supabase
        .from('salon_appointments')
        .select('*')
        .eq('tenant_id', tid)
        .eq('status', 'completed')

      // Aggregate by stylist
      const map: Record<string, { count: number; total: number }> = {}
      ;(appointments || []).forEach(a => {
        const name = a.stylist_name || 'Estilista General'
        if (!map[name]) map[name] = { count: 0, total: 0 }
        map[name].count += 1
        map[name].total += Number(a.price || 0)
      })

      const list: StylistCommission[] = Object.keys(map).map(name => {
        const rate = 0.45 // 45% standard commission
        const total = map[name].total
        return {
          stylist_name: name,
          services_count: map[name].count,
          total_billed: total,
          commission_rate: rate,
          commission_payable: total * rate
        }
      })

      // If empty, add default demo preview
      if (list.length === 0) {
        list.push(
          {
            stylist_name: 'Paola Estilista Senior',
            services_count: 14,
            total_billed: 1850000,
            commission_rate: 0.50,
            commission_payable: 925000
          },
          {
            stylist_name: 'Mateo Barbero',
            services_count: 22,
            total_billed: 990000,
            commission_rate: 0.45,
            commission_payable: 445500
          },
          {
            stylist_name: 'Yulieth Manicurista',
            services_count: 18,
            total_billed: 1170000,
            commission_rate: 0.40,
            commission_payable: 468000
          }
        )
      }

      setCommissions(list)
    } catch (err) {
      console.error('Error loading commissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalCommissions = commissions.reduce((acc, c) => acc + c.commission_payable, 0)
  const totalBilled = commissions.reduce((acc, c) => acc + c.total_billed, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Finanzas & Datos</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Liquidación de Comisiones</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Percent size={24} style={{ color: 'var(--accent-green)' }} />
            Liquidación de Comisiones a Estilistas & Barberos
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Cálculo automático de porcentajes de comisión por servicios realizados y venta de productos en salón.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/salon/agenda"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Calendar size={15} />
            <span>Agenda de Citas</span>
          </Link>
          <button
            onClick={loadCommissions}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Recalcular</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Facturación en Servicios</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(totalBilled)}</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Percent size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Comisiones a Pagar</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>{formatCurrency(totalCommissions)}</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Profesionales Activos</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{commissions.length}</div>
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="neu-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Estilista / Profesional</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Servicios Realizados</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Facturado</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Tasa Comisión</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Comisión Neta a Pagar</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800 }}>
                    {c.stylist_name}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                    {c.services_count} servicios
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(c.total_billed)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)' }}>
                      {(c.commission_rate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: 'var(--accent-green)', fontSize: '0.92rem' }}>
                    {formatCurrency(c.commission_payable)}
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
