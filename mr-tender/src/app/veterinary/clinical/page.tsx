'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  HeartPulse,
  Dog,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  Stethoscope,
  X
} from 'lucide-react'

interface ClinicalRecord {
  id: string
  tenant_id: string
  pet_id: string
  vet_name: string
  visit_date: string
  reason_for_visit: string
  symptoms?: string | null
  diagnosis: string
  treatment_plan?: string | null
  next_appointment_date?: string | null
  created_at: string
  vet_pets?: {
    name: string
    species: string
    owner_name: string
    owner_phone?: string | null
  }
}

export default function VetClinicalPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<ClinicalRecord[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    pet_name: 'Lucas (Golden Retriever)',
    vet_name: 'Dr. Alejandro Restrepo (Médico Veterinario)',
    visit_date: new Date().toISOString().split('T')[0],
    reason_for_visit: 'Control general y cojera en pata posterior derecha',
    symptoms: 'Dolor leve a la palpación en rodilla derecha. Sin fiebre.',
    diagnosis: 'Distensión ligamentosa leve. Buen estado nutricional.',
    treatment_plan: 'Antiinflamatorio canino por 5 días, reposo moderado.',
    next_appointment_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  })

  useEffect(() => {
    loadClinicalRecords()
  }, [])

  async function loadClinicalRecords() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('vet_clinical_records')
        .select('*, vet_pets(name, species, owner_name, owner_phone)')
        .eq('tenant_id', tid)
        .order('visit_date', { ascending: false })

      if (error) throw error

      let list = (data as any) || []
      if (list.length === 0) {
        list = [
          {
            id: '1',
            tenant_id: tid,
            pet_id: 'p1',
            vet_name: 'Dr. Alejandro Restrepo',
            visit_date: new Date().toISOString().split('T')[0],
            reason_for_visit: 'Control post-operatorio de esterilización',
            symptoms: 'Herida quirúrgica limpia, sin signos de infección.',
            diagnosis: 'Evolución satisfactoria de herida quirúrgica.',
            treatment_plan: 'Retiro de puntos en 5 días. Mantener collar isabelino.',
            vet_pets: { name: 'Mía', species: 'Felino', owner_name: 'Marcela Arango', owner_phone: '3157894561' }
          },
          {
            id: '2',
            tenant_id: tid,
            pet_id: 'p2',
            vet_name: 'Dra. Carolina Vélez',
            visit_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
            reason_for_visit: 'Vacunación y desparasitación anual',
            symptoms: 'Constantes vitales normales. T: 38.5°C, FC: 110 lpm.',
            diagnosis: 'Paciente clínicamente sano apto para vacunar.',
            treatment_plan: 'Aplicación Séxtuple Canina + Rabia.',
            vet_pets: { name: 'Lucas', species: 'Canino', owner_name: 'Felipe Jaramillo', owner_phone: '3104561234' }
          }
        ]
      }

      setRecords(list)
    } catch (err) {
      console.error('Error loading clinical records:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = records.filter(r =>
    !search ||
    r.vet_pets?.name.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
    r.reason_for_visit.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Clientes & Pacientes</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>Consultas & Historias Clínicas</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Stethoscope size={24} style={{ color: 'var(--accent-coral)' }} />
            Consultas Médicas & Historias Clínicas Veterinarias
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Evolución médica de mascotas, constantes vitales, diagnósticos y plan farmacológico prescrito.
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
            href="/veterinary/vaccines"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)' }}
          >
            <HeartPulse size={15} />
            <span>Vacunación</span>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar consulta por mascota, diagnóstico..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Records Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map(r => (
          <div key={r.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {r.vet_pets?.name || 'Mascota'} 🐾
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Tutor: {r.vet_pets?.owner_name} • Dr(a): {r.vet_name}
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)' }}>
                📅 {formatDate(r.visit_date)}
              </span>
            </div>

            <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Motivo:</strong> {r.reason_for_visit}</div>
              <div><strong>Diagnóstico:</strong> <span style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>{r.diagnosis}</span></div>
              {r.treatment_plan && <div style={{ color: 'var(--text-secondary)' }}><strong>Tratamiento:</strong> {r.treatment_plan}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
