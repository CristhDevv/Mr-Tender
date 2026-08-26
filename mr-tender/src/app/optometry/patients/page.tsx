'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Glasses,
  Eye,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  FileText,
  X
} from 'lucide-react'

interface OptometryPrescription {
  id: string
  tenant_id: string
  patient_name: string
  patient_id_doc: string
  patient_phone?: string | null
  exam_date: string
  optometrist_name: string
  od_sphere: number
  od_cylinder: number
  od_axis: number
  od_addition?: number | null
  oi_sphere: number
  oi_cylinder: number
  oi_axis: number
  oi_addition?: number | null
  pupillary_distance?: number | null
  lens_type_recommended?: string | null
  observations?: string | null
  created_at: string
}

export default function OptometryPatientsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [prescriptions, setPrescriptions] = useState<OptometryPrescription[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    patient_name: '',
    patient_id_doc: '',
    patient_phone: '',
    exam_date: new Date().toISOString().split('T')[0],
    optometrist_name: 'Dra. Elena Vargas (Optómetra ULS)',
    od_sphere: -1.75,
    od_cylinder: -0.50,
    od_axis: 90,
    od_addition: 1.50,
    oi_sphere: -2.00,
    oi_cylinder: -0.75,
    oi_axis: 85,
    oi_addition: 1.50,
    pupillary_distance: 62,
    lens_type_recommended: 'Progresivo Digital Antirreflejo Blue Protect',
    observations: 'Control anual por fatiga visual en computador.'
  })

  useEffect(() => {
    loadPrescriptions()
  }, [])

  async function loadPrescriptions() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('optometry_prescriptions')
        .select('*')
        .eq('tenant_id', tid)
        .order('exam_date', { ascending: false })

      if (error) throw error
      setPrescriptions(data || [])
    } catch (err) {
      console.error('Error loading optometry prescriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePrescription(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('optometry_prescriptions').insert({
        tenant_id: tenantId,
        patient_name: form.patient_name,
        patient_id_doc: form.patient_id_doc,
        patient_phone: form.patient_phone || null,
        exam_date: form.exam_date,
        optometrist_name: form.optometrist_name,
        od_sphere: Number(form.od_sphere) || 0,
        od_cylinder: Number(form.od_cylinder) || 0,
        od_axis: Number(form.od_axis) || 0,
        od_addition: form.od_addition ? Number(form.od_addition) : null,
        oi_sphere: Number(form.oi_sphere) || 0,
        oi_cylinder: Number(form.oi_cylinder) || 0,
        oi_axis: Number(form.oi_axis) || 0,
        oi_addition: form.oi_addition ? Number(form.oi_addition) : null,
        pupillary_distance: form.pupillary_distance ? Number(form.pupillary_distance) : null,
        lens_type_recommended: form.lens_type_recommended || null,
        observations: form.observations || null
      })

      if (error) throw error
      setShowModal(false)
      await loadPrescriptions()
    } catch (err: any) {
      alert(err.message || 'Error al guardar fórmula')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoPrescriptions() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const demo = [
        {
          tenant_id: tenantId,
          patient_name: 'Camila Montoya',
          patient_id_doc: '1098456123',
          patient_phone: '3119874561',
          exam_date: today,
          optometrist_name: 'Dra. Elena Vargas',
          od_sphere: -2.25,
          od_cylinder: -0.75,
          od_axis: 180,
          od_addition: 0,
          oi_sphere: -2.00,
          oi_cylinder: -1.00,
          oi_axis: 175,
          oi_addition: 0,
          pupillary_distance: 63,
          lens_type_recommended: 'Monofocal Policarbonato Antirreflejo Verde',
          observations: 'Miopía y astigmatismo miópico compuesto. Buena agudeza visual 20/20.'
        },
        {
          tenant_id: tenantId,
          patient_name: 'Gonzalo Pardo',
          patient_id_doc: '19456789',
          patient_phone: '3156789012',
          exam_date: today,
          optometrist_name: 'Dra. Elena Vargas',
          od_sphere: 1.50,
          od_cylinder: -0.50,
          od_axis: 90,
          od_addition: 2.25,
          oi_sphere: 1.25,
          oi_cylinder: -0.50,
          oi_axis: 85,
          oi_addition: 2.25,
          pupillary_distance: 65,
          lens_type_recommended: 'Progresivo FreeForm Fotocromático Transición',
          observations: 'Presbicia y ligera hipermetropía. Requiere lentes para sol y lectura.'
        }
      ]
      await supabase.from('optometry_prescriptions').insert(demo)
      await loadPrescriptions()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = prescriptions.filter(p =>
    !search ||
    p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id_doc.includes(search)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Clientes & Pacientes</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Historias Clínicas OD/OI</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Glasses size={24} style={{ color: 'var(--accent-blue)' }} />
            Historias Clínicas & Fórmulas de Refracción Oftálmica
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Registro de examen visual, refracción Ojo Derecho (OD) / Ojo Izquierdo (OI), distancia pupilar y tipo de lente sugerido.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/optometry/lab"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <Eye size={15} />
            <span>Laboratorio & Talla</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Consulta</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar paciente por nombre o documento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Prescriptions Grid */}
      {filtered.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Glasses size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay historias de refracción</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra los exámenes visuales de tus pacientes para emitir fórmulas y enviar a laboratorio.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoPrescriptions} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Fórmulas Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <div key={p.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{p.patient_name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>C.C. {p.patient_id_doc} • Exam: {formatDate(p.exam_date)}</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)' }}>
                  DP: {p.pupillary_distance || 62} mm
                </span>
              </div>

              {/* Prescription Table */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.76rem' }}>
                <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 0' }}>OJO</th>
                      <th>ESF</th>
                      <th>CIL</th>
                      <th>EJE</th>
                      <th>ADD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>
                      <td style={{ textAlign: 'left', padding: '6px 0', color: 'var(--accent-blue)' }}>OD (Derecho)</td>
                      <td>{p.od_sphere > 0 ? `+${p.od_sphere}` : p.od_sphere}</td>
                      <td>{p.od_cylinder}</td>
                      <td>{p.od_axis}°</td>
                      <td>{p.od_addition ? `+${p.od_addition}` : '-'}</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td style={{ textAlign: 'left', padding: '6px 0', color: 'var(--accent-purple)' }}>OI (Izquierdo)</td>
                      <td>{p.oi_sphere > 0 ? `+${p.oi_sphere}` : p.oi_sphere}</td>
                      <td>{p.oi_cylinder}</td>
                      <td>{p.oi_axis}°</td>
                      <td>{p.oi_addition ? `+${p.oi_addition}` : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {p.lens_type_recommended && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <strong>Lente sugerido:</strong> {p.lens_type_recommended}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nueva Consulta */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 540, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Examen Visual & Refracción</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreatePrescription} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Paciente</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={form.patient_name}
                    onChange={e => setForm({ ...form, patient_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Documento</label>
                  <input
                    type="text"
                    required
                    placeholder="C.C."
                    value={form.patient_id_doc}
                    onChange={e => setForm({ ...form, patient_id_doc: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Ojo Derecho */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: 6 }}>Ojo Derecho (OD)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Esfera</label>
                    <input type="number" step="0.25" value={form.od_sphere} onChange={e => setForm({ ...form, od_sphere: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cilindro</label>
                    <input type="number" step="0.25" value={form.od_cylinder} onChange={e => setForm({ ...form, od_cylinder: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Eje (°)</label>
                    <input type="number" value={form.od_axis} onChange={e => setForm({ ...form, od_axis: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Adición</label>
                    <input type="number" step="0.25" value={form.od_addition} onChange={e => setForm({ ...form, od_addition: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                </div>
              </div>

              {/* Ojo Izquierdo */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent-purple)', marginBottom: 6 }}>Ojo Izquierdo (OI)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Esfera</label>
                    <input type="number" step="0.25" value={form.oi_sphere} onChange={e => setForm({ ...form, oi_sphere: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cilindro</label>
                    <input type="number" step="0.25" value={form.oi_cylinder} onChange={e => setForm({ ...form, oi_cylinder: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Eje (°)</label>
                    <input type="number" value={form.oi_axis} onChange={e => setForm({ ...form, oi_axis: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Adición</label>
                    <input type="number" step="0.25" value={form.oi_addition} onChange={e => setForm({ ...form, oi_addition: Number(e.target.value) })} className="input-neu" style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Distancia Pupilar (mm)</label>
                  <input
                    type="number"
                    value={form.pupillary_distance}
                    onChange={e => setForm({ ...form, pupillary_distance: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Lente Recomendado</label>
                  <input
                    type="text"
                    value={form.lens_type_recommended}
                    onChange={e => setForm({ ...form, lens_type_recommended: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Guardar Fórmula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
