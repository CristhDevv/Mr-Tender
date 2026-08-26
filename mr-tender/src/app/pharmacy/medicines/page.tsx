'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  Package,
  Layers,
  Sparkles,
  X,
  Check,
  ChevronRight,
  ShieldAlert,
  Thermometer,
  FileCheck
} from 'lucide-react'

interface Medicine {
  id: string
  tenant_id: string
  trade_name: string
  generic_name: string
  concentration: string
  pharmaceutical_form: string
  laboratory: string
  invima_registration: string | null
  prescription_type: 'otc' | 'rx' | 'controlled'
  units_per_box: number
  units_per_blister: number
  cost_price: number
  unit_price: number
  blister_price: number | null
  box_price: number | null
  requires_prescription: boolean
  is_controlled: boolean
  is_active: boolean
  stock?: number
}

export default function PharmacyMedicinesPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [search, setSearch] = useState('')
  const [filterPrescription, setFilterPrescription] = useState('all')

  const [showMedModal, setShowMedModal] = useState(false)
  const [editingMedId, setEditingMedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [medForm, setMedForm] = useState({
    trade_name: '',
    generic_name: '',
    concentration: '500mg',
    pharmaceutical_form: 'Tabletas',
    laboratory: 'Genfar',
    invima_registration: '',
    prescription_type: 'otc' as 'otc' | 'rx' | 'controlled',
    units_per_box: '30',
    units_per_blister: '10',
    cost_price: '300',
    unit_price: '500',
    blister_price: '4500',
    box_price: '12000'
  })

  useEffect(() => {
    loadMedicines()
  }, [])

  async function loadMedicines() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('pharmacy_medicines')
        .select('*')
        .eq('tenant_id', tid)
        .order('trade_name', { ascending: true })

      if (error) throw error
      setMedicines(data || [])
    } catch (err) {
      console.error('Error loading pharmacy medicines:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveMedicine(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const payload: any = {
        tenant_id: tenantId,
        trade_name: medForm.trade_name,
        generic_name: medForm.generic_name,
        concentration: medForm.concentration,
        pharmaceutical_form: medForm.pharmaceutical_form,
        laboratory: medForm.laboratory,
        invima_registration: medForm.invima_registration || null,
        prescription_type: medForm.prescription_type,
        units_per_box: Number(medForm.units_per_box) || 1,
        units_per_blister: Number(medForm.units_per_blister) || 1,
        cost_price: Number(medForm.cost_price) || 0,
        unit_price: Number(medForm.unit_price) || 0,
        blister_price: Number(medForm.blister_price) || null,
        box_price: Number(medForm.box_price) || null,
        requires_prescription: medForm.prescription_type !== 'otc',
        is_controlled: medForm.prescription_type === 'controlled',
        is_active: true
      }

      if (editingMedId) {
        const { error } = await supabase.from('pharmacy_medicines').update(payload).eq('id', editingMedId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pharmacy_medicines').insert(payload)
        if (error) throw error
      }

      setShowMedModal(false)
      setEditingMedId(null)
      await loadMedicines()
    } catch (err: any) {
      alert(err.message || 'Error al guardar medicamento')
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenEdit(med: Medicine) {
    setEditingMedId(med.id)
    setMedForm({
      trade_name: med.trade_name,
      generic_name: med.generic_name,
      concentration: med.concentration,
      pharmaceutical_form: med.pharmaceutical_form,
      laboratory: med.laboratory,
      invima_registration: med.invima_registration || '',
      prescription_type: med.prescription_type,
      units_per_box: String(med.units_per_box || 30),
      units_per_blister: String(med.units_per_blister || 10),
      cost_price: String(med.cost_price || 0),
      unit_price: String(med.unit_price || 0),
      blister_price: String(med.blister_price || 0),
      box_price: String(med.box_price || 0)
    })
    setShowMedModal(true)
  }

  async function handleSeedDemoMedicines() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          trade_name: 'Dolex Forte 500mg/65mg',
          generic_name: 'Acetaminofén + Cafeína',
          concentration: '500mg / 65mg',
          pharmaceutical_form: 'Tabletas Recubiertas',
          laboratory: 'GSK',
          invima_registration: 'INVIMA 2018M-0001234-R2',
          prescription_type: 'otc',
          units_per_box: 24,
          units_per_blister: 8,
          cost_price: 600,
          unit_price: 1000,
          blister_price: 7500,
          box_price: 22000,
          requires_prescription: false,
          is_controlled: false,
          is_active: true
        },
        {
          tenant_id: tenantId,
          trade_name: 'Amoxicilina MK 500mg',
          generic_name: 'Amoxicilina Trihidrato',
          concentration: '500mg',
          pharmaceutical_form: 'Cápsulas',
          laboratory: 'MK / Tecnoquímicas',
          invima_registration: 'INVIMA 2020M-0005678-R1',
          prescription_type: 'rx',
          units_per_box: 50,
          units_per_blister: 10,
          cost_price: 450,
          unit_price: 800,
          blister_price: 7000,
          box_price: 32000,
          requires_prescription: true,
          is_controlled: false,
          is_active: true
        },
        {
          tenant_id: tenantId,
          trade_name: 'Tramadol Clorhidrato 50mg',
          generic_name: 'Tramadol',
          concentration: '50mg',
          pharmaceutical_form: 'Cápsulas',
          laboratory: 'Genfar',
          invima_registration: 'INVIMA 2019M-0009876-R3',
          prescription_type: 'controlled',
          units_per_box: 30,
          units_per_blister: 10,
          cost_price: 800,
          unit_price: 1500,
          blister_price: 14000,
          box_price: 38000,
          requires_prescription: true,
          is_controlled: true,
          is_active: true
        }
      ]
      await supabase.from('pharmacy_medicines').insert(demo)
      await loadMedicines()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMeds = medicines.filter(m => {
    const matchQuery = !search ||
      m.trade_name.toLowerCase().includes(search.toLowerCase()) ||
      m.generic_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.invima_registration && m.invima_registration.toLowerCase().includes(search.toLowerCase()))
    const matchPresc = filterPrescription === 'all' || m.prescription_type === filterPrescription
    return matchQuery && matchPresc
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumbs Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Catálogo & Inventario</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Medicamentos & INVIMA</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill size={24} style={{ color: 'var(--accent-blue)' }} />
            Catálogo Farmacéutico & Registro Sanitario
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Principios activos, laboratorio, clasificación (OTC / Rx / Controlado) y precios por fracción.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/pharmacy/lots"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber)' }}
          >
            <Clock size={15} />
            <span>Control de Lotes & FEFO</span>
          </Link>
          <Link
            href="/pharmacy/temperature"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
          >
            <Thermometer size={15} />
            <span>Termohigrometría</span>
          </Link>
          <button
            onClick={() => {
              setEditingMedId(null)
              setMedForm({
                trade_name: '',
                generic_name: '',
                concentration: '500mg',
                pharmaceutical_form: 'Tabletas',
                laboratory: 'Genfar',
                invima_registration: '',
                prescription_type: 'otc',
                units_per_box: '30',
                units_per_blister: '10',
                cost_price: '300',
                unit_price: '500',
                blister_price: '4500',
                box_price: '12000'
              })
              setShowMedModal(true)
            }}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Medicamento</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, maxWidth: 460 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nombre comercial, principio activo o INVIMA..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-neu"
              style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'otc', label: 'Venta Libre (OTC)' },
            { id: 'rx', label: 'Bajo Fórmula (Rx)' },
            { id: 'controlled', label: 'Controlados 🔒' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterPrescription(f.id)}
              className={`btn-neu ${filterPrescription === f.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: '0.76rem', borderRadius: 20 }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medicines Table / Cards */}
      {filteredMeds.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No se encontraron medicamentos</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Puedes cargar medicamentos colombianos demo o registrar tus productos farmacéuticos.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoMedicines} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Cargar Medicamentos Demo
            </button>
          </div>
        </div>
      ) : (
        <div className="neu-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Medicamento & Principio Activo</th>
                  <th style={{ padding: '12px 14px' }}>Laboratorio / INVIMA</th>
                  <th style={{ padding: '12px 14px' }}>Tipo Venta</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>P. Unidad</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>P. Blíster</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>P. Caja</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{m.trade_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                        {m.generic_name} ({m.concentration}) • {m.pharmaceutical_form}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{m.laboratory}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.invima_registration || 'Sin INVIMA'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: m.prescription_type === 'controlled' ? 'var(--accent-coral-lt)' : m.prescription_type === 'rx' ? 'var(--accent-amber-lt)' : 'var(--accent-green-lt)',
                        color: m.prescription_type === 'controlled' ? 'var(--accent-coral)' : m.prescription_type === 'rx' ? 'var(--accent-amber)' : 'var(--accent-green)'
                      }}>
                        {m.prescription_type === 'controlled' ? 'Controlado 🔒' : m.prescription_type === 'rx' ? 'Fórmula Rx' : 'Venta Libre'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(m.unit_price)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                      {m.blister_price ? formatCurrency(m.blister_price) : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {m.box_price ? formatCurrency(m.box_price) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="btn-neu btn-ghost"
                        style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Medicamento */}
      {showMedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 560, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {editingMedId ? 'Editar Medicamento' : 'Nuevo Medicamento en Catálogo'}
              </h3>
              <button onClick={() => setShowMedModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Dolex Forte, Advil Max..."
                    value={medForm.trade_name}
                    onChange={e => setMedForm({ ...medForm, trade_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Principio Activo Genérico</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Acetaminofén, Ibuprofeno..."
                    value={medForm.generic_name}
                    onChange={e => setMedForm({ ...medForm, generic_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Concentración</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 500mg, 10ml..."
                    value={medForm.concentration}
                    onChange={e => setMedForm({ ...medForm, concentration: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Forma Farmacéutica</label>
                  <input
                    type="text"
                    required
                    placeholder="Tabletas, Jarabe..."
                    value={medForm.pharmaceutical_form}
                    onChange={e => setMedForm({ ...medForm, pharmaceutical_form: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Laboratorio</label>
                  <input
                    type="text"
                    required
                    placeholder="Genfar, MK, Lafrancol..."
                    value={medForm.laboratory}
                    onChange={e => setMedForm({ ...medForm, laboratory: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Registro Sanitario INVIMA</label>
                  <input
                    type="text"
                    placeholder="INVIMA 2022M-XXXXXX"
                    value={medForm.invima_registration}
                    onChange={e => setMedForm({ ...medForm, invima_registration: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Prescripción</label>
                  <select
                    value={medForm.prescription_type}
                    onChange={e => setMedForm({ ...medForm, prescription_type: e.target.value as any })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="otc">Venta Libre (OTC)</option>
                    <option value="rx">Bajo Fórmula Médica (Rx)</option>
                    <option value="controlled">Medicamento Controlado 🔒</option>
                  </select>
                </div>
              </div>

              {/* Precios diferenciados por fracción */}
              <div style={{ background: 'var(--bg-deep)', padding: 14, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>Precios por Fracción (Venta al Público)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Precio Unidad / Pastilla</label>
                    <input
                      type="number"
                      required
                      value={medForm.unit_price}
                      onChange={e => setMedForm({ ...medForm, unit_price: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 2, padding: '6px 8px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Precio Blíster / Tira</label>
                    <input
                      type="number"
                      value={medForm.blister_price}
                      onChange={e => setMedForm({ ...medForm, blister_price: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 2, padding: '6px 8px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Precio Caja Completa</label>
                    <input
                      type="number"
                      value={medForm.box_price}
                      onChange={e => setMedForm({ ...medForm, box_price: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 2, padding: '6px 8px', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowMedModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : editingMedId ? 'Actualizar Medicamento' : 'Guardar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
