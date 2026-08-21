'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Pill,
  Calendar,
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
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface Medicine {
  id: string
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
}

interface Lot {
  id: string
  medicine_id: string
  lot_number: string
  expiration_date: string
  current_quantity: number
  initial_quantity: number
  status: string
  pharmacy_medicines?: {
    trade_name: string
    generic_name: string
    concentration: string
  }
}

export default function PharmacyPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'catalog' | 'lots'>('catalog')
  const [loading, setLoading] = useState(true)

  // Data
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [lots, setLots] = useState<Lot[]>([])

  // Search & Filter
  const [search, setSearch] = useState('')
  const [selectedGenericFilter, setSelectedGenericFilter] = useState<string | null>(null)

  // Medicine Create / Edit Modal states
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

  // Lot Create Modal states
  const [showLotModal, setShowLotModal] = useState(false)
  const [lotForm, setLotForm] = useState({
    medicine_id: '',
    lot_number: '',
    expiration_date: '',
    initial_quantity: '50'
  })

  useEffect(() => {
    loadPharmacyData()
  }, [])

  async function loadPharmacyData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [medsRes, lotsRes] = await Promise.all([
        supabase.from('pharmacy_medicines').select('*').eq('tenant_id', tid).order('trade_name', { ascending: true }),
        supabase.from('pharmacy_lots').select('*, pharmacy_medicines(trade_name, generic_name, concentration)').eq('tenant_id', tid).order('expiration_date', { ascending: true })
      ])

      setMedicines(medsRes.data || [])
      setLots(lotsRes.data as any || [])
    } catch (err) {
      console.error('Error loading pharmacy data:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreateMedModal() {
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
  }

  function openEditMedModal(med: Medicine) {
    setEditingMedId(med.id)
    setMedForm({
      trade_name: med.trade_name,
      generic_name: med.generic_name,
      concentration: med.concentration || '',
      pharmaceutical_form: med.pharmaceutical_form || 'Tabletas',
      laboratory: med.laboratory || '',
      invima_registration: med.invima_registration || '',
      prescription_type: med.prescription_type || 'otc',
      units_per_box: String(med.units_per_box || 30),
      units_per_blister: String(med.units_per_blister || 10),
      cost_price: String(med.cost_price || 0),
      unit_price: String(med.unit_price || 0),
      blister_price: med.blister_price ? String(med.blister_price) : '',
      box_price: med.box_price ? String(med.box_price) : ''
    })
    setShowMedModal(true)
  }

  // Save / Update Medicine
  async function handleSaveMedicine(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!medForm.trade_name.trim() || !medForm.generic_name.trim()) {
      alert('Por favor completa el nombre comercial y el genérico.')
      return
    }

    setSubmitting(true)

    try {
      const isControlled = medForm.prescription_type === 'controlled'
      const requiresRx = medForm.prescription_type === 'rx' || isControlled

      const payload = {
        tenant_id: tenantId,
        trade_name: medForm.trade_name.trim(),
        generic_name: medForm.generic_name.trim(),
        concentration: medForm.concentration.trim(),
        pharmaceutical_form: medForm.pharmaceutical_form.trim(),
        laboratory: medForm.laboratory.trim(),
        invima_registration: medForm.invima_registration.trim() || null,
        prescription_type: medForm.prescription_type,
        units_per_box: parseInt(medForm.units_per_box) || 1,
        units_per_blister: parseInt(medForm.units_per_blister) || 1,
        cost_price: parseFloat(medForm.cost_price) || 0,
        unit_price: parseFloat(medForm.unit_price) || 0,
        blister_price: medForm.blister_price ? parseFloat(medForm.blister_price) : null,
        box_price: medForm.box_price ? parseFloat(medForm.box_price) : null,
        requires_prescription: requiresRx,
        is_controlled: isControlled,
        is_active: true
      }

      if (editingMedId) {
        // Update
        const { error } = await supabase
          .from('pharmacy_medicines')
          .update(payload)
          .eq('id', editingMedId)

        if (error) throw error
        setMedicines(prev => prev.map(m => m.id === editingMedId ? { ...m, ...payload } : m))
      } else {
        // Insert
        const { data, error } = await supabase
          .from('pharmacy_medicines')
          .insert(payload)
          .select('*')
          .single()

        if (error) throw error
        setMedicines(prev => [...prev, data as any])
      }

      setShowMedModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar medicamento')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Medicine
  async function handleDeleteMedicine(medId: string, name: string) {
    if (!confirm(`¿Estás seguro de eliminar "${name}" del catálogo?`)) return
    try {
      const { error } = await supabase.from('pharmacy_medicines').delete().eq('id', medId)
      if (error) throw error
      setMedicines(prev => prev.filter(m => m.id !== medId))
      setLots(prev => prev.filter(l => l.medicine_id !== medId))
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  // Handle register lot
  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting || !lotForm.medicine_id) return
    setSubmitting(true)

    try {
      const qty = parseInt(lotForm.initial_quantity) || 0
      const { data, error } = await supabase
        .from('pharmacy_lots')
        .insert({
          tenant_id: tenantId,
          medicine_id: lotForm.medicine_id,
          lot_number: lotForm.lot_number.trim().toUpperCase(),
          expiration_date: lotForm.expiration_date,
          initial_quantity: qty,
          current_quantity: qty,
          status: 'active'
        })
        .select('*, pharmacy_medicines(trade_name, generic_name, concentration)')
        .single()

      if (error) throw error

      setLots(prev => [...prev, data as any].sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()))
      setShowLotModal(false)
      setLotForm({ medicine_id: '', lot_number: '', expiration_date: '', initial_quantity: '50' })
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al registrar lote')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteLot(lotId: string, lotNumber: string) {
    if (!confirm(`¿Eliminar el lote ${lotNumber}?`)) return
    try {
      const { error } = await supabase.from('pharmacy_lots').delete().eq('id', lotId)
      if (error) throw error
      setLots(prev => prev.filter(l => l.id !== lotId))
    } catch (err: any) {
      alert('Error al eliminar lote: ' + err.message)
    }
  }

  // Quick Seed Demo Data if empty
  async function handleSeedDemoData() {
    if (!tenantId || submitting) return
    setSubmitting(true)

    try {
      const demoMeds = [
        {
          tenant_id: tenantId,
          trade_name: 'Dolex 500mg',
          generic_name: 'Acetaminofén',
          concentration: '500 mg',
          pharmaceutical_form: 'Tabletas',
          laboratory: 'GSK',
          invima_registration: 'INVIMA 2019M-0001234',
          prescription_type: 'otc',
          units_per_box: 100,
          units_per_blister: 10,
          cost_price: 350,
          unit_price: 600,
          blister_price: 5500,
          box_price: 50000,
          requires_prescription: false,
          is_controlled: false
        },
        {
          tenant_id: tenantId,
          trade_name: 'Acetaminofén Genfar',
          generic_name: 'Acetaminofén',
          concentration: '500 mg',
          pharmaceutical_form: 'Tabletas',
          laboratory: 'Genfar',
          invima_registration: 'INVIMA 2021M-0009876',
          prescription_type: 'otc',
          units_per_box: 100,
          units_per_blister: 10,
          cost_price: 180,
          unit_price: 300,
          blister_price: 2800,
          box_price: 25000,
          requires_prescription: false,
          is_controlled: false
        },
        {
          tenant_id: tenantId,
          trade_name: 'Amoxicilina MK 500mg',
          generic_name: 'Amoxicilina',
          concentration: '500 mg',
          pharmaceutical_form: 'Cápsulas',
          laboratory: 'MK / Tecnoquímicas',
          invima_registration: 'INVIMA 2020M-0005432',
          prescription_type: 'rx',
          units_per_box: 50,
          units_per_blister: 10,
          cost_price: 750,
          unit_price: 1200,
          blister_price: 11000,
          box_price: 52000,
          requires_prescription: true,
          is_controlled: false
        },
        {
          tenant_id: tenantId,
          trade_name: 'Clonazepam 2mg Lafrancol',
          generic_name: 'Clonazepam',
          concentration: '2 mg',
          pharmaceutical_form: 'Tabletas Ranuradas',
          laboratory: 'Lafrancol',
          invima_registration: 'INVIMA 2018M-0003344',
          prescription_type: 'controlled',
          units_per_box: 30,
          units_per_blister: 10,
          cost_price: 1500,
          unit_price: 2500,
          blister_price: 22000,
          box_price: 60000,
          requires_prescription: true,
          is_controlled: true
        }
      ]

      const { data: insertedMeds, error: medErr } = await supabase
        .from('pharmacy_medicines')
        .insert(demoMeds)
        .select('*')

      if (medErr) throw medErr

      if (insertedMeds && insertedMeds.length > 0) {
        const dolex = insertedMeds.find(m => m.trade_name.includes('Dolex'))
        const acetGenfar = insertedMeds.find(m => m.trade_name.includes('Genfar'))
        const amox = insertedMeds.find(m => m.trade_name.includes('Amoxicilina'))

        const demoLots = [
          {
            tenant_id: tenantId,
            medicine_id: dolex?.id || insertedMeds[0].id,
            lot_number: 'LOT-DOL-2026A',
            expiration_date: '2026-11-15',
            initial_quantity: 80,
            current_quantity: 80,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            medicine_id: acetGenfar?.id || insertedMeds[1].id,
            lot_number: 'LOT-GENF-2027B',
            expiration_date: '2027-04-20',
            initial_quantity: 120,
            current_quantity: 120,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            medicine_id: amox?.id || insertedMeds[2].id,
            lot_number: 'LOT-AMX-2026C',
            expiration_date: '2026-09-30',
            initial_quantity: 40,
            current_quantity: 40,
            status: 'active'
          }
        ]

        await supabase.from('pharmacy_lots').insert(demoLots)
      }

      await loadPharmacyData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando catálogo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered meds
  const filteredMeds = medicines.filter(m => {
    const q = search.toLowerCase()
    const matchesSearch = m.trade_name.toLowerCase().includes(q) ||
      m.generic_name.toLowerCase().includes(q) ||
      (m.invima_registration && m.invima_registration.toLowerCase().includes(q)) ||
      (m.laboratory && m.laboratory.toLowerCase().includes(q))

    if (selectedGenericFilter) {
      return matchesSearch && m.generic_name.toLowerCase() === selectedGenericFilter.toLowerCase()
    }
    return matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0 }}>
            <Pill size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Droguería y Farmacia
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2, margin: 0 }}>
              Catálogo de medicamentos, costos, precios fraccionados y rotación de lotes FEFO
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {medicines.length === 0 && (
            <button className="btn-neu" onClick={handleSeedDemoData} disabled={submitting} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}>
              <Sparkles size={15} />
              <span>Cargar Catálogo Inicial</span>
            </button>
          )}

          {activeTab === 'catalog' && (
            <button className="btn-neu btn-primary" onClick={openCreateMedModal} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Medicamento</span>
            </button>
          )}

          {activeTab === 'lots' && (
            <button className="btn-neu btn-primary" onClick={() => setShowLotModal(true)} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Registrar Lote</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar (Only 2 Essential Tabs) */}
      <div className="neu-flat" style={{ padding: 4, borderRadius: 10, display: 'inline-flex', gap: 4, overflowX: 'auto', maxWidth: '100%' }}>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`btn-neu ${activeTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Pill size={14} />
          <span>Medicamentos y Genéricos ({medicines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lots')}
          className={`btn-neu ${activeTab === 'lots' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Calendar size={14} />
          <span>Lotes y Vencimientos FEFO ({lots.length})</span>
        </button>
      </div>

      {/* ── TAB 1: MEDICINES CATALOG ── */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Search bar & Active filter */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <input
                type="text"
                className="input-neu"
                placeholder="Buscar por nombre comercial, principio activo (ej. Acetaminofén), INVIMA o laboratorio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.82rem' }}
              />
            </div>
            {selectedGenericFilter && (
              <button className="btn-neu btn-ghost" onClick={() => setSelectedGenericFilter(null)} style={{ color: 'var(--accent-purple)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Molécula: <strong>{selectedGenericFilter}</strong></span>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Medicines Interactive Table */}
          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicamento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Principio Activo & Concentración</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Laboratorio / INVIMA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Prescripción</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Costo Compra</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Precios Venta (Pastilla / Blíster / Caja)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map(m => {
                  const cost = Number(m.cost_price || 0)
                  const unitPrice = Number(m.unit_price || 0)
                  const margin = unitPrice > 0 ? (((unitPrice - cost) / unitPrice) * 100) : 0

                  return (
                    <tr
                      key={m.id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                    >
                      {/* Name & Form */}
                      <td
                        onClick={() => openEditMedModal(m)}
                        style={{ padding: '12px 16px', cursor: 'pointer' }}
                        title="Haz clic para editar este medicamento"
                      >
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{m.trade_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.pharmaceutical_form}</div>
                      </td>

                      {/* Generic Molecule */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{m.generic_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{m.concentration}</div>
                      </td>

                      {/* Laboratory & INVIMA */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: 'var(--text-primary)' }}>{m.laboratory || 'Genérico'}</div>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {m.invima_registration ? m.invima_registration : <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin INVIMA</span>}
                        </div>
                      </td>

                      {/* Prescription */}
                      <td style={{ padding: '12px 16px' }}>
                        {m.prescription_type === 'controlled' ? (
                          <span className="badge badge-coral" style={{ fontSize: '0.68rem' }}>
                            Control Especial
                          </span>
                        ) : m.prescription_type === 'rx' ? (
                          <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                            Bajo Fórmula (RX)
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                            Venta Libre (OTC)
                          </span>
                        )}
                      </td>

                      {/* Cost Price & Margin */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency(cost)}
                        </div>
                        {cost > 0 && unitPrice > 0 && (
                          <div style={{ fontSize: '0.68rem', color: margin >= 30 ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 700 }}>
                            Margen: {margin.toFixed(0)}%
                          </div>
                        )}
                      </td>

                      {/* Sale Prices */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                          Unidad: {formatCurrency(m.unit_price)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {m.blister_price ? `Blíster: ${formatCurrency(m.blister_price)} | ` : ''}
                          {m.box_price ? `Caja: ${formatCurrency(m.box_price)}` : ''}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => setSelectedGenericFilter(m.generic_name)}
                            className="btn-neu btn-ghost"
                            style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-purple)' }}
                            title="Filtrar genéricos de esta molécula"
                          >
                            <RefreshCw size={13} />
                          </button>

                          <button
                            onClick={() => openEditMedModal(m)}
                            className="btn-neu btn-ghost"
                            style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-blue)' }}
                            title="Editar medicamento"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteMedicine(m.id, m.trade_name)}
                            className="btn-neu btn-ghost"
                            style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-coral)' }}
                            title="Eliminar medicamento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredMeds.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron medicamentos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: LOTS & FEFO EXPIRATION ── */}
      {activeTab === 'lots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 14, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0 }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Regla FEFO (First Expired, First Out)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Los lotes están ordenados automáticamente por fecha de vencimiento más próxima para garantizar la rotación y evitar mermas.</div>
            </div>
          </div>

          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicamento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>N° Lote</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha Vencimiento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Stock Disponible</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Estado Sanitario</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{l.pharmacy_medicines?.trade_name || 'Medicamento'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-purple)' }}>{l.pharmacy_medicines?.generic_name} {l.pharmacy_medicines?.concentration}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {l.lot_number}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {formatDate(l.expiration_date)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{l.current_quantity} unidades</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Inicial: {l.initial_quantity}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                        Vigente
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteLot(l.id, l.lot_number)}
                        className="btn-neu btn-ghost"
                        style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-coral)' }}
                        title="Eliminar lote"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay lotes registrados actualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR / EDITAR MEDICAMENTO ── */}
      {showMedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingMedId ? `Editar: ${medForm.trade_name}` : 'Registrar Medicamento'}
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowMedModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {/* Product Info Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre Comercial *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej. Dolex Forte"
                    value={medForm.trade_name}
                    onChange={e => setMedForm({ ...medForm, trade_name: e.target.value })}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Principio Activo (Genérico) *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej. Acetaminofén + Cafeína"
                    value={medForm.generic_name}
                    onChange={e => setMedForm({ ...medForm, generic_name: e.target.value })}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Concentración *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej. 500mg / 65mg"
                    value={medForm.concentration}
                    onChange={e => setMedForm({ ...medForm, concentration: e.target.value })}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Forma Farmacéutica</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Tabletas, Jarabe, etc."
                    value={medForm.pharmaceutical_form}
                    onChange={e => setMedForm({ ...medForm, pharmaceutical_form: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Laboratorio</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="GSK / Genfar / MK"
                    value={medForm.laboratory}
                    onChange={e => setMedForm({ ...medForm, laboratory: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Registro Sanitario INVIMA <span style={{ fontWeight: 400, opacity: 0.8 }}>(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Opcional - Ej: INVIMA 2020M-0001234"
                    value={medForm.invima_registration}
                    onChange={e => setMedForm({ ...medForm, invima_registration: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tipo de Venta / Prescripción</label>
                  <select
                    className="input-neu"
                    value={medForm.prescription_type}
                    onChange={e => setMedForm({ ...medForm, prescription_type: e.target.value as any })}
                    style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-deep)', cursor: 'pointer' }}
                  >
                    <option value="otc">Venta Libre (OTC)</option>
                    <option value="rx">Bajo Fórmula Médica (RX)</option>
                    <option value="controlled">Medicamento de Control</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Fractionation Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Costos y Precios de Venta Fraccionada
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Costo Compra ($)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.cost_price}
                      onChange={e => setMedForm({ ...medForm, cost_price: e.target.value })}
                      placeholder="350"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Pastilla ($) *</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.unit_price}
                      onChange={e => setMedForm({ ...medForm, unit_price: e.target.value })}
                      required
                      placeholder="600"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Blíster ($)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.blister_price}
                      onChange={e => setMedForm({ ...medForm, blister_price: e.target.value })}
                      placeholder="5500"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Caja ($)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.box_price}
                      onChange={e => setMedForm({ ...medForm, box_price: e.target.value })}
                      placeholder="50000"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowMedModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={15} strokeWidth={2.5} />
                  <span>{submitting ? 'Guardando...' : editingMedId ? 'Actualizar Medicamento' : 'Guardar Medicamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR LOTE FEFO ── */}
      {showLotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Registrar Lote Farmacéutico</h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowLotModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Seleccionar Medicamento *</label>
                <select
                  className="input-neu"
                  value={lotForm.medicine_id}
                  onChange={e => setLotForm({ ...lotForm, medicine_id: e.target.value })}
                  required
                  style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-deep)', cursor: 'pointer' }}
                >
                  <option value="">Selecciona un medicamento...</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.trade_name} ({m.generic_name} {m.concentration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Número de Lote *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="LOT-2026-X"
                  value={lotForm.lot_number}
                  onChange={e => setLotForm({ ...lotForm, lot_number: e.target.value })}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fecha de Vencimiento *</label>
                <input
                  type="date"
                  className="input-neu"
                  value={lotForm.expiration_date}
                  onChange={e => setLotForm({ ...lotForm, expiration_date: e.target.value })}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cantidad Inicial de Unidades *</label>
                <input
                  type="number"
                  className="input-neu"
                  value={lotForm.initial_quantity}
                  onChange={e => setLotForm({ ...lotForm, initial_quantity: e.target.value })}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowLotModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
                  {submitting ? 'Guardando...' : 'Guardar Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
