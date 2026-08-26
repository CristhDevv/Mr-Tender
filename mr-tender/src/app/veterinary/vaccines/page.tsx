'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Syringe,
  Dog,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react'

interface VetVaccination {
  id: string
  tenant_id: string
  pet_id: string
  type: 'vaccine' | 'deworming'
  vaccine_name: string
  applied_date: string
  next_due_date: string
  lot_number?: string | null
  vet_name?: string | null
  status: 'applied' | 'pending_booster' | 'overdue'
  created_at: string
  vet_pets?: {
    name: string
    species: string
    owner_name: string
    owner_phone?: string | null
  }
}

export default function VetVaccinesPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [vaccines, setVaccines] = useState<VetVaccination[]>([])

  useEffect(() => {
    loadVaccines()
  }, [])

  async function loadVaccines() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('vet_vaccinations')
        .select('*, vet_pets(name, species, owner_name, owner_phone)')
        .eq('tenant_id', tid)
        .order('next_due_date', { ascending: true })

      if (error) throw error

      let list = (data as any) || []
      if (list.length === 0) {
        list = [
          {
            id: '1',
            tenant_id: tid,
            type: 'vaccine',
            vaccine_name: 'Vacuna Antirrábica Rabisin',
            applied_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
            next_due_date: new Date(Date.now() + 330 * 86400000).toISOString().split('T')[0],
            lot_number: 'LOT-RAB-2026',
            vet_name: 'Dr. Alejandro Restrepo',
            status: 'applied',
            vet_pets: { name: 'Lucas', species: 'Canino', owner_name: 'Felipe Jaramillo', owner_phone: '3104561234' }
          },
          {
            id: '2',
            tenant_id: tid,
            type: 'vaccine',
            vaccine_name: 'Triple Felina (Panleucopenia, Rinotraqueítis, Calicivirus)',
            applied_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
            next_due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            lot_number: 'LOT-FEL-9912',
            vet_name: 'Dra. Carolina Vélez',
            status: 'pending_booster',
            vet_pets: { name: 'Mía', species: 'Felino', owner_name: 'Marcela Arango', owner_phone: '3157894561' }
          }
        ]
      }

      setVaccines(list)
    } catch (err) {
      console.error('Error loading vaccines:', err)
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
            <span>Calidad & Normativa</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Carnet de Vacunación</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Syringe size={24} style={{ color: 'var(--accent-blue)' }} />
            Carnet de Vacunación, Desparasitación & Refuerzos
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Control de biológicos aplicados, número de lote, fecha del próximo refuerzo y alertas a propietarios por WhatsApp.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/veterinary/pets"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Dog size={15} />
            <span>Pacientes Mascotas</span>
          </Link>
          <Link
            href="/veterinary/clinical"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-coral)' }}
          >
            <ShieldCheck size={15} />
            <span>Consultas</span>
          </Link>
        </div>
      </div>

      {/* Vaccines Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {vaccines.map(v => {
          const isPending = v.status === 'pending_booster'

          return (
            <div key={v.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{v.vaccine_name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mascota: <strong>{v.vet_pets?.name}</strong> • Tutor: {v.vet_pets?.owner_name}</div>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: isPending ? 'var(--accent-amber-lt)' : 'var(--accent-green-lt)',
                  color: isPending ? 'var(--accent-amber)' : 'var(--accent-green)'
                }}>
                  {isPending ? 'Refuerzo Próximo' : 'Al Día'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Aplicada el:</strong> 📅 {formatDate(v.applied_date)}</div>
                <div><strong>Próximo Refuerzo:</strong> ⏳ <span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatDate(v.next_due_date)}</span></div>
                {v.lot_number && <div style={{ color: 'var(--text-muted)' }}>Lote Biológico: #{v.lot_number}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
