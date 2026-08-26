'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Dumbbell,
  Activity,
  X
} from 'lucide-react'

interface GymClass {
  id: string
  tenant_id: string
  class_name: string
  instructor_name: string
  day_of_week: string
  start_time: string
  duration_minutes: number
  max_capacity: number
  current_enrolled: number
  room_name: string
}

export default function GymClassesPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<GymClass[]>([])
  const [showClassModal, setShowClassModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [classForm, setClassForm] = useState({
    class_name: 'Spinning / Indoor Cycling',
    instructor_name: 'David Vélez',
    day_of_week: 'Lunes a Viernes',
    start_time: '06:30',
    duration_minutes: 50,
    max_capacity: 20,
    current_enrolled: 14,
    room_name: 'Salón de Spinning 1'
  })

  useEffect(() => {
    loadClasses()
  }, [])

  async function loadClasses() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('gym_classes')
        .select('*')
        .eq('tenant_id', tid)
        .order('start_time', { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error loading gym classes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('gym_classes').insert({
        tenant_id: tenantId,
        class_name: classForm.class_name,
        instructor_name: classForm.instructor_name,
        day_of_week: classForm.day_of_week,
        start_time: classForm.start_time,
        duration_minutes: Number(classForm.duration_minutes) || 60,
        max_capacity: Number(classForm.max_capacity) || 20,
        current_enrolled: Number(classForm.current_enrolled) || 0,
        room_name: classForm.room_name
      })

      if (error) throw error
      setShowClassModal(false)
      await loadClasses()
    } catch (err: any) {
      alert(err.message || 'Error al agendar clase')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoClasses() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          class_name: 'Spinning de Alta Intensidad',
          instructor_name: 'Mariana Ospina',
          day_of_week: 'Lunes, Miércoles y Viernes',
          start_time: '06:30',
          duration_minutes: 50,
          max_capacity: 25,
          current_enrolled: 22,
          room_name: 'Salón Ciclo'
        },
        {
          tenant_id: tenantId,
          class_name: 'Crossfit / WOD de Fuerza',
          instructor_name: 'Carlos ' + 'Toro',
          day_of_week: 'Lunes a Sábado',
          start_time: '18:00',
          duration_minutes: 60,
          max_capacity: 18,
          current_enrolled: 15,
          room_name: 'Box Principal'
        },
        {
          tenant_id: tenantId,
          class_name: 'Yoga Restaurativo & Movilidad',
          instructor_name: 'Camila Rojas',
          day_of_week: 'Martes y Jueves',
          start_time: '19:15',
          duration_minutes: 55,
          max_capacity: 15,
          current_enrolled: 8,
          room_name: 'Salón Zen'
        }
      ]
      await supabase.from('gym_classes').insert(demo)
      await loadClasses()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Clases & Aforo</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: 'var(--accent-purple)' }} />
            Programación de Clases Grupales & Control de Aforo
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Horarios semanales de clases dirigidas, instructores asignados y control de cupos en tiempo real.
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
            href="/gym/members"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Dumbbell size={15} />
            <span>Socios</span>
          </Link>
          <button
            onClick={() => setShowClassModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Clase</span>
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay clases grupales programadas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Configura las clases semanales de spinning, crossfit, yoga o pilates de tu gimnasio.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoClasses} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Clases Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {classes.map(c => {
            const isFull = c.current_enrolled >= c.max_capacity

            return (
              <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{c.class_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Instructor: {c.instructor_name} • {c.room_name}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isFull ? 'var(--accent-coral-lt)' : 'var(--accent-green-lt)',
                    color: isFull ? 'var(--accent-coral)' : 'var(--accent-green)'
                  }}>
                    {isFull ? 'Aforo Completo' : 'Cupos Disponibles'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Días:</strong> 📅 {c.day_of_week}</div>
                  <div><strong>Horario:</strong> ⏰ {c.start_time} ({c.duration_minutes} min)</div>
                  <div><strong>Aforo Ocupado:</strong> {c.current_enrolled} / {c.max_capacity} personas</div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (c.current_enrolled / (c.max_capacity || 1)) * 100)}%`,
                    height: '100%',
                    background: isFull ? 'var(--accent-coral)' : 'var(--accent-purple)',
                    borderRadius: 3
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Crear Clase */}
      {showClassModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 460, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Programar Clase Grupal</h3>
              <button onClick={() => setShowClassModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre de la Clase</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Spinning, Crossfit, Yoga..."
                  value={classForm.class_name}
                  onChange={e => setClassForm({ ...classForm, class_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Instructor</label>
                  <input
                    type="text"
                    required
                    value={classForm.instructor_name}
                    onChange={e => setClassForm({ ...classForm, instructor_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Salón / Espacio</label>
                  <input
                    type="text"
                    value={classForm.room_name}
                    onChange={e => setClassForm({ ...classForm, room_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Días de la Semana</label>
                  <input
                    type="text"
                    required
                    value={classForm.day_of_week}
                    onChange={e => setClassForm({ ...classForm, day_of_week: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={classForm.start_time}
                    onChange={e => setClassForm({ ...classForm, start_time: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Duración (minutos)</label>
                  <input
                    type="number"
                    min="15"
                    required
                    value={classForm.duration_minutes}
                    onChange={e => setClassForm({ ...classForm, duration_minutes: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Capacidad Máxima</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={classForm.max_capacity}
                    onChange={e => setClassForm({ ...classForm, max_capacity: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowClassModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Programando...' : 'Programar Clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
