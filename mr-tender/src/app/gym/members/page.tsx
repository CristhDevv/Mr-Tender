'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  Dumbbell,
  Users,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Activity,
  Calendar,
  Scale,
  X,
  Phone
} from 'lucide-react'

interface GymMember {
  id: string
  tenant_id: string
  member_number: string
  full_name: string
  id_number: string
  phone?: string | null
  email?: string | null
  status: 'active' | 'expired' | 'frozen' | 'inactive'
  plan_name: string
  membership_start: string
  membership_expires_at: string
  weight_kg?: number | null
  body_fat_percent?: number | null
  muscle_mass_kg?: number | null
  created_at: string
}

export default function GymMembersPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<GymMember[]>([])
  const [search, setSearch] = useState('')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [memberForm, setMemberForm] = useState({
    full_name: '',
    id_number: '',
    phone: '',
    plan_name: 'Plan Mensual Ilimitado',
    membership_start: new Date().toISOString().split('T')[0],
    membership_expires_at: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    weight_kg: 72,
    body_fat_percent: 18.5,
    muscle_mass_kg: 33.2
  })

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('tenant_id', tid)
        .order('full_name', { ascending: true })

      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error('Error loading gym members:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const memberNumber = 'GYM-' + Math.floor(1000 + Math.random() * 9000)
      const { error } = await supabase.from('gym_members').insert({
        tenant_id: tenantId,
        member_number: memberNumber,
        full_name: memberForm.full_name,
        id_number: memberForm.id_number,
        phone: memberForm.phone || null,
        plan_name: memberForm.plan_name,
        status: 'active',
        membership_start: memberForm.membership_start,
        membership_expires_at: memberForm.membership_expires_at,
        weight_kg: Number(memberForm.weight_kg) || null,
        body_fat_percent: Number(memberForm.body_fat_percent) || null,
        muscle_mass_kg: Number(memberForm.muscle_mass_kg) || null
      })

      if (error) throw error
      setShowMemberModal(false)
      await loadMembers()
    } catch (err: any) {
      alert(err.message || 'Error al inscribir socio')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoMembers() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

      const demo = [
        {
          tenant_id: tenantId,
          member_number: 'GYM-1001',
          full_name: 'Santiago Arboleda',
          id_number: '1098765432',
          phone: '3104567890',
          plan_name: 'Plan Mensual Crossfit & Gym',
          status: 'active',
          membership_start: today,
          membership_expires_at: nextMonth,
          weight_kg: 78.5,
          body_fat_percent: 15.2,
          muscle_mass_kg: 38.0
        },
        {
          tenant_id: tenantId,
          member_number: 'GYM-1002',
          full_name: 'Valentina Restrepo',
          id_number: '1023456789',
          phone: '3157891234',
          plan_name: 'Plan Trimestral VIP',
          status: 'active',
          membership_start: today,
          membership_expires_at: nextMonth,
          weight_kg: 58.0,
          body_fat_percent: 21.0,
          muscle_mass_kg: 24.5
        },
        {
          tenant_id: tenantId,
          member_number: 'GYM-1003',
          full_name: 'Mateo Cárdenas',
          id_number: '79876543',
          phone: '3123456789',
          plan_name: 'Tiquetera 10 Clases',
          status: 'expired',
          membership_start: lastMonth,
          membership_expires_at: today,
          weight_kg: 84.0,
          body_fat_percent: 24.0,
          muscle_mass_kg: 35.0
        }
      ]
      await supabase.from('gym_members').insert(demo)
      await loadMembers()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMembers = members.filter(m =>
    !search ||
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.id_number.includes(search) ||
    m.member_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumbs Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Clientes & Pacientes</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Socios & Membresías</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Dumbbell size={24} style={{ color: 'var(--accent-blue)' }} />
            Directorio de Socios, Membresías & Antropometría
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Planes activos, vencimientos, renovación de membresías y seguimiento de composición corporal.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/gym/checkin"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Activity size={15} />
            <span>Terminal Check-in QR</span>
          </Link>
          <Link
            href="/gym/classes"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <Users size={15} />
            <span>Clases & Aforo</span>
          </Link>
          <button
            onClick={() => setShowMemberModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Socio</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por nombre, documento o carnet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay socios registrados</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Inscribe a los miembros de tu gimnasio o carga datos demo de prueba.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoMembers} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Cargar Socios Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredMembers.map(m => {
            const isExp = m.status === 'expired' || new Date(m.membership_expires_at) < new Date()

            return (
              <div key={m.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>C.C. {m.id_number} • Carnet: {m.member_number}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isExp ? 'var(--accent-coral-lt)' : 'var(--accent-green-lt)',
                    color: isExp ? 'var(--accent-coral)' : 'var(--accent-green)'
                  }}>
                    {isExp ? 'Vencida' : 'Activa'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Plan:</strong> {m.plan_name}</div>
                  <div><strong>Vence:</strong> 📅 {formatDate(m.membership_expires_at)}</div>
                  {m.phone && <div style={{ color: 'var(--text-muted)' }}><strong>Tel:</strong> {m.phone}</div>}
                </div>

                {/* Antropometría */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, textAlign: 'center', background: 'var(--bg-surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Peso</div>
                    <div style={{ fontWeight: 800 }}>{m.weight_kg ? `${m.weight_kg} kg` : '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>% Grasa</div>
                    <div style={{ fontWeight: 800 }}>{m.body_fat_percent ? `${m.body_fat_percent}%` : '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>M. Muscular</div>
                    <div style={{ fontWeight: 800 }}>{m.muscle_mass_kg ? `${m.muscle_mass_kg} kg` : '-'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Nuevo Socio */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Inscribir Nuevo Socio</h3>
              <button onClick={() => setShowMemberModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Gómez"
                  value={memberForm.full_name}
                  onChange={e => setMemberForm({ ...memberForm, full_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cédula / Documento</label>
                  <input
                    type="text"
                    required
                    placeholder="1098765432"
                    value={memberForm.id_number}
                    onChange={e => setMemberForm({ ...memberForm, id_number: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="WhatsApp"
                    value={memberForm.phone}
                    onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Plan / Membresía</label>
                  <input
                    type="text"
                    required
                    value={memberForm.plan_name}
                    onChange={e => setMemberForm({ ...memberForm, plan_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Vencimiento</label>
                  <input
                    type="date"
                    required
                    value={memberForm.membership_expires_at}
                    onChange={e => setMemberForm({ ...memberForm, membership_expires_at: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Antropometría */}
              <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800 }}>Ficha Antropométrica Inicial</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={memberForm.weight_kg}
                      onChange={e => setMemberForm({ ...memberForm, weight_kg: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>% Grasa</label>
                    <input
                      type="number"
                      step="0.1"
                      value={memberForm.body_fat_percent}
                      onChange={e => setMemberForm({ ...memberForm, body_fat_percent: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Masa M. (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={memberForm.muscle_mass_kg}
                      onChange={e => setMemberForm({ ...memberForm, muscle_mass_kg: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Inscribiendo...' : 'Guardar Socio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
