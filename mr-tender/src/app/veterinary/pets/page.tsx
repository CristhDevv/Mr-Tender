'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Dog,
  HeartPulse,
  Syringe,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  Phone,
  Calendar,
  X
} from 'lucide-react'

interface VetPet {
  id: string
  tenant_id: string
  name: string
  species: string
  breed: string
  gender: string
  birth_date?: string | null
  weight_kg: number
  microchip_number?: string | null
  owner_name: string
  owner_phone?: string | null
  owner_email?: string | null
  medical_notes?: string | null
  is_active: boolean
  created_at: string
}

export default function VeterinaryPetsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pets, setPets] = useState<VetPet[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    species: 'Canino (Perro)',
    breed: 'Golden Retriever',
    gender: 'Macho',
    birth_date: '2022-05-10',
    weight_kg: 28.5,
    microchip_number: '',
    owner_name: '',
    owner_phone: '',
    medical_notes: 'Vacunación al día. Alergia leve a pulgas.'
  })

  useEffect(() => {
    loadPets()
  }, [])

  async function loadPets() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('vet_pets')
        .select('*')
        .eq('tenant_id', tid)
        .order('name', { ascending: true })

      if (error) throw error
      setPets(data || [])
    } catch (err) {
      console.error('Error loading vet pets:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePet(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('vet_pets').insert({
        tenant_id: tenantId,
        name: form.name,
        species: form.species,
        breed: form.breed,
        gender: form.gender,
        birth_date: form.birth_date || null,
        weight_kg: Number(form.weight_kg) || 0,
        microchip_number: form.microchip_number || null,
        owner_name: form.owner_name,
        owner_phone: form.owner_phone || null,
        medical_notes: form.medical_notes || null,
        is_active: true
      })

      if (error) throw error
      setShowModal(false)
      await loadPets()
    } catch (err: any) {
      alert(err.message || 'Error al registrar paciente')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoPets() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          name: 'Lucas',
          species: 'Canino (Perro)',
          breed: 'Golden Retriever',
          gender: 'Macho',
          birth_date: '2021-08-15',
          weight_kg: 32.0,
          microchip_number: '985141002987654',
          owner_name: 'Felipe Jaramillo',
          owner_phone: '3104561234',
          medical_notes: 'Paciente sano, esterilizado.',
          is_active: true
        },
        {
          tenant_id: tenantId,
          name: 'Mía',
          species: 'Felino (Gato)',
          breed: 'Persa Blanco',
          gender: 'Hembra',
          birth_date: '2023-01-20',
          weight_kg: 4.2,
          microchip_number: null,
          owner_name: 'Marcela Arango',
          owner_phone: '3157894561',
          medical_notes: 'Dieta renal medicada.',
          is_active: true
        }
      ]
      await supabase.from('vet_pets').insert(demo)
      await loadPets()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPets = pets.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    p.breed.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Clientes & Pacientes</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Pacientes & Mascotas</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Dog size={24} style={{ color: 'var(--accent-green)' }} />
            Expediente de Pacientes & Mascotas
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Registro de mascotas, razas, propietarios, microchip, carnet de vacunas y alertas médicas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar mascota por nombre, dueño o raza..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Pets Grid */}
      {filteredPets.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dog size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay mascotas registradas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra los pacientes caninos, felinos o exóticos de tu veterinaria.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoPets} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Pacientes Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredPets.map(p => (
            <div key={p.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{p.name} 🐾</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{p.species} • {p.breed} ({p.gender})</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-green-lt)', color: 'var(--accent-green)' }}>
                  {p.weight_kg} kg
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div><strong>Dueño / Tutor:</strong> {p.owner_name}</div>
                {p.owner_phone && <div><strong>WhatsApp:</strong> 📞 {p.owner_phone}</div>}
                {p.microchip_number && <div><strong>Microchip:</strong> #{p.microchip_number}</div>}
              </div>

              {p.medical_notes && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <strong>Notas Clínicas:</strong> {p.medical_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuevo Paciente */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Mascota / Paciente</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreatePet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre de la Mascota</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Lucas, Mía..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Especie</label>
                  <select
                    value={form.species}
                    onChange={e => setForm({ ...form, species: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="Canino (Perro)">Canino (Perro)</option>
                    <option value="Felino (Gato)">Felino (Gato)</option>
                    <option value="Ave">Ave</option>
                    <option value="Exótico / Roedor">Exótico / Roedor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Raza</label>
                  <input
                    type="text"
                    required
                    value={form.breed}
                    onChange={e => setForm({ ...form, breed: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sexo</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight_kg}
                    onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Propietario / Tutor</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={form.owner_name}
                    onChange={e => setForm({ ...form, owner_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WhatsApp Propietario</label>
                  <input
                    type="tel"
                    placeholder="310..."
                    value={form.owner_phone}
                    onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Antecedentes & Notas Médicas</label>
                <textarea
                  rows={2}
                  value={form.medical_notes}
                  onChange={e => setForm({ ...form, medical_notes: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Registrar Mascota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
