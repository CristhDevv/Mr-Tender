'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Pill,
  Calendar,
  Thermometer,
  ShieldAlert,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Download
} from 'lucide-react'

interface Medicine {
  id: string
  trade_name: string
  generic_name: string
  concentration: string
  pharmaceutical_form: string
  laboratory: string
  invima_registration: string
  prescription_type: 'otc' | 'rx' | 'controlled'
  units_per_box: number
  units_per_blister: number
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

interface ThermoLog {
  id: string
  log_date: string
  time_slot: string
  ambient_temperature: number
  relative_humidity: number
  fridge_temperature: number | null
  recorded_by: string
  observations: string | null
}

interface ControlledLog {
  id: string
  log_date: string
  movement_type: string
  quantity: number
  prescription_number: string
  doctor_name: string
  doctor_license: string
  patient_name: string
  patient_id_doc: string
  balance_after: number
  created_at: string
  pharmacy_medicines?: {
    trade_name: string
    generic_name: string
  }
}

export default function PharmacyPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'catalog' | 'lots' | 'thermo' | 'controlled'>('catalog')
  const [loading, setLoading] = useState(true)

  // Data
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [thermoLogs, setThermoLogs] = useState<ThermoLog[]>([])
  const [controlledLogs, setControlledLogs] = useState<ControlledLog[]>([])

  // Search & Filters
  const [search, setSearch] = useState('')
  const [selectedGenericFilter, setSelectedGenericFilter] = useState<string | null>(null)

  // Modals
  const [showMedModal, setShowMedModal] = useState(false)
  const [showLotModal, setShowLotModal] = useState(false)
  const [showThermoModal, setShowThermoModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [medForm, setMedForm] = useState({
    trade_name: '', generic_name: '', concentration: '500mg',
    pharmaceutical_form: 'Tabletas', laboratory: 'Genfar', invima_registration: '',
    prescription_type: 'otc' as 'otc' | 'rx' | 'controlled',
    units_per_box: '30', units_per_blister: '10', unit_price: '500', blister_price: '4500', box_price: '12000'
  })

  const [lotForm, setLotForm] = useState({
    medicine_id: '', lot_number: '', expiration_date: '', quantity: '50', cost_price: '300'
  })

  const [thermoForm, setThermoForm] = useState({
    time_slot: 'morning', ambient_temperature: '21.5', relative_humidity: '55', fridge_temperature: '4.2', recorded_by: '', observations: ''
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
      setTenantId(tid)

      const [medsRes, lotsRes, thermoRes, ctrlRes] = await Promise.all([
        supabase.from('pharmacy_medicines').select('*').eq('tenant_id', tid).order('trade_name', { ascending: true }),
        supabase.from('pharmacy_lots').select('*, pharmacy_medicines(trade_name, generic_name, concentration)').eq('tenant_id', tid).order('expiration_date', { ascending: true }),
        supabase.from('pharmacy_thermo_logs').select('*').eq('tenant_id', tid).order('log_date', { ascending: false }).limit(30),
        supabase.from('pharmacy_controlled_logs').select('*, pharmacy_medicines(trade_name, generic_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(30)
      ])

      setMedicines(medsRes.data || [])
      setLots(lotsRes.data as any || [])
      setThermoLogs(thermoRes.data || [])
      setControlledLogs(ctrlRes.data as any || [])
    } catch (err) {
      console.error('Error loading pharmacy data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle create medicine
  async function handleCreateMedicine(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)

    try {
      const isControlled = medForm.prescription_type === 'controlled'
      const requiresRx = medForm.prescription_type === 'rx' || isControlled

      const { data, error } = await supabase
        .from('pharmacy_medicines')
        .insert({
          tenant_id: tenantId,
          trade_name: medForm.trade_name.trim(),
          generic_name: medForm.generic_name.trim(),
          concentration: medForm.concentration.trim(),
          pharmaceutical_form: medForm.pharmaceutical_form.trim(),
          laboratory: medForm.laboratory.trim(),
          invima_registration: medForm.invima_registration.trim(),
          prescription_type: medForm.prescription_type,
          units_per_box: parseInt(medForm.units_per_box) || 1,
          units_per_blister: parseInt(medForm.units_per_blister) || 1,
          unit_price: parseFloat(medForm.unit_price) || 0,
          blister_price: parseFloat(medForm.blister_price) || null,
          box_price: parseFloat(medForm.box_price) || null,
          requires_prescription: requiresRx,
          is_controlled: isControlled,
          is_active: true
        })
        .select('*')
        .single()

      if (error) throw error

      setMedicines(prev => [...prev, data as any])
      setShowMedModal(false)
      setMedForm({
        trade_name: '', generic_name: '', concentration: '500mg',
        pharmaceutical_form: 'Tabletas', laboratory: 'Genfar', invima_registration: '',
        prescription_type: 'otc', units_per_box: '30', units_per_blister: '10',
        unit_price: '500', blister_price: '4500', box_price: '12000'
      })
      alert('✅ Medicamento registrado con éxito')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar medicamento')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle create Lot
  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting || !lotForm.medicine_id) return
    setSubmitting(true)

    try {
      const qty = parseFloat(lotForm.quantity) || 0
      const { data, error } = await supabase
        .from('pharmacy_lots')
        .insert({
          tenant_id: tenantId,
          medicine_id: lotForm.medicine_id,
          lot_number: lotForm.lot_number.trim().toUpperCase(),
          expiration_date: lotForm.expiration_date,
          initial_quantity: qty,
          current_quantity: qty,
          cost_price: parseFloat(lotForm.cost_price) || 0,
          status: 'active'
        })
        .select('*, pharmacy_medicines(trade_name, generic_name, concentration)')
        .single()

      if (error) throw error

      setLots(prev => [data as any, ...prev])
      setShowLotModal(false)
      setLotForm({ medicine_id: '', lot_number: '', expiration_date: '', quantity: '50', cost_price: '300' })
      alert('✅ Lote registrado con éxito')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al registrar lote')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle record Thermo log
  async function handleRecordThermo(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('pharmacy_thermo_logs')
        .insert({
          tenant_id: tenantId,
          time_slot: thermoForm.time_slot,
          ambient_temperature: parseFloat(thermoForm.ambient_temperature) || 20,
          relative_humidity: parseFloat(thermoForm.relative_humidity) || 50,
          fridge_temperature: thermoForm.fridge_temperature ? parseFloat(thermoForm.fridge_temperature) : null,
          recorded_by: thermoForm.recorded_by || user?.user_metadata?.full_name || 'Regente de Farmacia',
          observations: thermoForm.observations || null
        })
        .select('*')
        .single()

      if (error) throw error

      setThermoLogs(prev => [data, ...prev])
      setShowThermoModal(false)
      alert('✅ Registro de temperatura y humedad guardado')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar registro')
    } finally {
      setSubmitting(false)
    }
  }

  // Helpers: Expiration badge
  function getExpirationBadge(expDateStr: string) {
    const today = new Date()
    const exp = new Date(expDateStr)
    const diffMonths = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44)

    if (diffMonths <= 0) {
      return <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(235,94,85,0.15)', color: 'var(--accent-coral)' }}>🔴 VENCIDO</span>
    } else if (diffMonths <= 3) {
      return <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(242,193,78,0.15)', color: 'var(--accent-gold)' }}>🟡 Vence en {Math.ceil(diffMonths)}m</span>
    } else {
      return <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(74,186,134,0.15)', color: 'var(--accent-emerald)' }}>🟢 Vigente ({formatDate(expDateStr)})</span>
    }
  }

  // Filtered medicines
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

  // Export Thermo to CSV
  function exportThermoCSV() {
    if (thermoLogs.length === 0) return alert('No hay registros para exportar')
    let csv = '\uFEFF'
    csv += 'PLANILLA OFICIAL DE CONTROL DE TEMPERATURA Y HUMEDAD RELATIVA\n'
    csv += `Generado: ${new Date().toLocaleString('es-CO')}\n\n`
    csv += 'Fecha,Jornada,Temp. Ambiente (C),Humedad Relativa (%),Temp. Nevera (C),Responsable,Observaciones\n'
    thermoLogs.forEach(l => {
      csv += `"${l.log_date}","${l.time_slot === 'morning' ? 'Mañana' : 'Tarde'}","${l.ambient_temperature}","${l.relative_humidity}","${l.fridge_temperature || 'N/A'}","${l.recorded_by}","${l.observations || ''}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Termohigrometria_Farmacia_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.5rem' }}>💊</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Módulo de Droguería & Farmacia
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 3 }}>
            Control sanitario INVIMA, lotes FEFO, genéricos y registro de termohigrometría
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'catalog' && (
            <button className="btn-neu btn-primary" onClick={() => setShowMedModal(true)} style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} strokeWidth={2.5} />
              <span>Nuevo Medicamento</span>
            </button>
          )}
          {activeTab === 'lots' && (
            <button className="btn-neu btn-primary" onClick={() => setShowLotModal(true)} style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} strokeWidth={2.5} />
              <span>Registrar Lote</span>
            </button>
          )}
          {activeTab === 'thermo' && (
            <>
              <button className="btn-neu btn-ghost" onClick={exportThermoCSV} style={{ padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={15} />
                <span>Exportar Planilla CSV</span>
              </button>
              <button className="btn-neu btn-primary" onClick={() => setShowThermoModal(true)} style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} strokeWidth={2.5} />
                <span>Toma de Temperatura</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, overflowX: 'auto' }}>
        {[
          { id: 'catalog', label: '💊 Medicamentos & Genéricos', count: medicines.length },
          { id: 'lots', label: '⏳ Lotes & Vencimientos (FEFO)', count: lots.length },
          { id: 'thermo', label: '🌡️ Termohigrometría & Frío', count: thermoLogs.length },
          { id: 'controlled', label: '📋 Libro Control Especial (FNE)', count: controlledLogs.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`btn-neu ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', borderRadius: 10 }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* TAB 1: MEDICINES CATALOG */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <input
                type="text"
                className="input-neu"
                placeholder="🔍 Buscar por nombre, principio activo (ej. Acetaminofén), INVIMA o laboratorio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px' }}
              />
            </div>
            {selectedGenericFilter && (
              <button className="btn-neu btn-ghost" onClick={() => setSelectedGenericFilter(null)} style={{ color: 'var(--accent-purple)', fontSize: '0.8rem' }}>
                Filtro Molécula: <strong>{selectedGenericFilter}</strong> ✕
              </button>
            )}
          </div>

          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicamento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Principio Activo & Concentración</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Laboratorio / INVIMA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tipo Prescripción</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Precios (Pastilla / Blíster / Caja)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{m.trade_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.pharmaceutical_form}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{m.generic_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{m.concentration}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{m.laboratory || 'Genérico'}</div>
                      <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{m.invima_registration || 'INVIMA N/A'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.prescription_type === 'controlled' ? (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: 'rgba(235,94,85,0.15)', color: 'var(--accent-coral)' }}>
                          🔒 Control Especial
                        </span>
                      ) : m.prescription_type === 'rx' ? (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(242,193,78,0.15)', color: 'var(--accent-gold)' }}>
                          📋 Bajo Fórmula (RX)
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(74,186,134,0.15)', color: 'var(--accent-emerald)' }}>
                          🟢 Venta Libre (OTC)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Unidad: {formatCurrency(m.unit_price)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {m.blister_price ? `Blíster: ${formatCurrency(m.blister_price)} | ` : ''}
                        {m.box_price ? `Caja: ${formatCurrency(m.box_price)}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedGenericFilter(m.generic_name)}
                        className="btn-neu btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}
                        title="Ver todos los genéricos de esta molécula"
                      >
                        🔄 Ver Genéricos
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMeds.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron medicamentos. ¡Registra el primero con el botón "+ Nuevo Medicamento"!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LOTS & FEFO EXPIRATION */}
      {activeTab === 'lots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 14, background: 'rgba(139,114,190,0.06)', border: '1px solid rgba(139,114,190,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.6rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Regla FEFO (First Expired, First Out)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Los lotes están ordenados automáticamente por fecha de vencimiento más próxima para garantizar la rotación y evitar pérdidas.</div>
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
                      {getExpirationBadge(l.expiration_date)}
                    </td>
                  </tr>
                ))}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay lotes registrados. Haz clic en "+ Registrar Lote" para ingresar existencias con fecha de caducidad.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: THERMOHYGROMETRY */}
      {activeTab === 'thermo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="neu-card" style={{ padding: 14, borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rango Temp. Ambiente</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 4 }}>15°C a 25°C</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Norma Secretaría de Salud</div>
            </div>
            <div className="neu-card" style={{ padding: 14, borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rango Humedad Relativa</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 4 }}>40% a 70%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Control ambiental</div>
            </div>
            <div className="neu-card" style={{ padding: 14, borderLeft: '4px solid var(--accent-purple)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cadena de Frío (Nevera)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: 4 }}>2°C a 8°C</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Insulinas y Biológicos</div>
            </div>
          </div>

          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Jornada</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Temp. Ambiente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Humedad (%)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Temp. Nevera</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {thermoLogs.map(tl => (
                  <tr key={tl.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatDate(tl.log_date)}</td>
                    <td style={{ padding: '12px 16px' }}>{tl.time_slot === 'morning' ? '🌅 Mañana' : '🌇 Tarde'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: tl.ambient_temperature > 25 ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                      {tl.ambient_temperature}°C
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: tl.relative_humidity > 70 ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                      {tl.relative_humidity}%
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-purple)' }}>
                      {tl.fridge_temperature ? `${tl.fridge_temperature}°C` : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{tl.recorded_by}</td>
                  </tr>
                ))}
                {thermoLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay tomas registradas este mes. Registra la primera con el botón "+ Toma de Temperatura".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONTROLLED MEDICINES BOOK */}
      {activeTab === 'controlled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 14, background: 'rgba(235,94,85,0.06)', border: '1px solid rgba(235,94,85,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.6rem' }}>🔒</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Libro Oficial de Medicamentos de Control Especial (FNE)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Auditoría legal obligatoria para sustancias sometidas a fiscalización con recetario médico oficial.</div>
            </div>
          </div>

          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha & Hora</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicamento Controlado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>N° Fórmula / Recetario</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Médico Tratante</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Paciente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {controlledLogs.map(cl => (
                  <tr key={cl.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>{new Date(cl.created_at).toLocaleString('es-CO')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                      {cl.pharmacy_medicines?.trade_name} ({cl.pharmacy_medicines?.generic_name})
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700 }}>{cl.prescription_number}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{cl.doctor_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reg: {cl.doctor_license}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{cl.patient_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>C.C. {cl.patient_id_doc}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800 }}>{cl.quantity} uds</td>
                  </tr>
                ))}
                {controlledLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay movimientos de medicamentos de control registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NEW MEDICINE */}
      {showMedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>💊 Nuevo Medicamento</h2>
              <button onClick={() => setShowMedModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateMedicine} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Nombre Comercial *</label>
                  <input type="text" className="input-neu" placeholder="ej. Dolex Gripa" value={medForm.trade_name} onChange={e => setMedForm(p => ({ ...p, trade_name: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Principio Activo (Molécula) *</label>
                  <input type="text" className="input-neu" placeholder="ej. Acetaminofén" value={medForm.generic_name} onChange={e => setMedForm(p => ({ ...p, generic_name: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Concentración</label>
                  <input type="text" className="input-neu" placeholder="ej. 500mg, 10mg/5ml" value={medForm.concentration} onChange={e => setMedForm(p => ({ ...p, concentration: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Forma Farmacéutica</label>
                  <select className="input-neu" value={medForm.pharmaceutical_form} onChange={e => setMedForm(p => ({ ...p, pharmaceutical_form: e.target.value }))} style={{ width: '100%', marginTop: 4 }}>
                    {['Tabletas', 'Cápsulas', 'Jarabe', 'Suspensión', 'Ampollas / Inyectable', 'Crema / Pomada', 'Gotas Oftálmicas', 'Inhalador'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Laboratorio / Marca</label>
                  <input type="text" className="input-neu" placeholder="Genfar, MK, Lafrancol..." value={medForm.laboratory} onChange={e => setMedForm(p => ({ ...p, laboratory: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Registro Sanitario INVIMA *</label>
                  <input type="text" className="input-neu" placeholder="INVIMA 2021M-000..." value={medForm.invima_registration} onChange={e => setMedForm(p => ({ ...p, invima_registration: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tipo de Venta / Prescripción</label>
                <select className="input-neu" value={medForm.prescription_type} onChange={e => setMedForm(p => ({ ...p, prescription_type: e.target.value as any }))} style={{ width: '100%', marginTop: 4 }}>
                  <option value="otc">🟢 Venta Libre (OTC)</option>
                  <option value="rx">📋 Bajo Fórmula Médica (RX)</option>
                  <option value="controlled">🔒 Medicamento de Control Especial (FNE)</option>
                </select>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Precios y Venta Fraccionada</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Precio Pastilla ($)</label>
                    <input type="number" className="input-neu" value={medForm.unit_price} onChange={e => setMedForm(p => ({ ...p, unit_price: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Precio Blíster ($)</label>
                    <input type="number" className="input-neu" value={medForm.blister_price} onChange={e => setMedForm(p => ({ ...p, blister_price: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Precio Caja ($)</label>
                    <input type="number" className="input-neu" value={medForm.box_price} onChange={e => setMedForm(p => ({ ...p, box_price: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowMedModal(false)} className="btn-neu btn-ghost" style={{ padding: '10px 16px' }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ padding: '10px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW LOT */}
      {showLotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>⏳ Registrar Lote y Vencimiento</h2>
              <button onClick={() => setShowLotModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Medicamento *</label>
                <select className="input-neu" value={lotForm.medicine_id} onChange={e => setLotForm(p => ({ ...p, medicine_id: e.target.value }))} required style={{ width: '100%', marginTop: 4 }}>
                  <option value="">Selecciona un medicamento...</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.trade_name} - {m.generic_name} ({m.concentration})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>N° de Lote *</label>
                  <input type="text" className="input-neu" placeholder="LOT-2026-A" value={lotForm.lot_number} onChange={e => setLotForm(p => ({ ...p, lot_number: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Fecha de Caducidad *</label>
                  <input type="date" className="input-neu" value={lotForm.expiration_date} onChange={e => setLotForm(p => ({ ...p, expiration_date: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Cantidad de Unidades</label>
                  <input type="number" className="input-neu" value={lotForm.quantity} onChange={e => setLotForm(p => ({ ...p, quantity: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Costo Unitario ($)</label>
                  <input type="number" className="input-neu" value={lotForm.cost_price} onChange={e => setLotForm(p => ({ ...p, cost_price: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowLotModal(false)} className="btn-neu btn-ghost" style={{ padding: '10px 16px' }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ padding: '10px 20px' }}>
                  {submitting ? 'Guardando...' : 'Registrar Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THERMO LOG */}
      {showThermoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>🌡️ Toma de Temperatura y Humedad</h2>
              <button onClick={() => setShowThermoModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleRecordThermo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Jornada</label>
                <select className="input-neu" value={thermoForm.time_slot} onChange={e => setThermoForm(p => ({ ...p, time_slot: e.target.value }))} style={{ width: '100%', marginTop: 4 }}>
                  <option value="morning">🌅 Mañana (08:00 a 10:00)</option>
                  <option value="afternoon">🌇 Tarde (14:00 a 16:00)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Temp. Ambiente (°C) *</label>
                  <input type="number" step="0.1" className="input-neu" value={thermoForm.ambient_temperature} onChange={e => setThermoForm(p => ({ ...p, ambient_temperature: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Humedad Relativa (%) *</label>
                  <input type="number" step="0.1" className="input-neu" value={thermoForm.relative_humidity} onChange={e => setThermoForm(p => ({ ...p, relative_humidity: e.target.value }))} required style={{ width: '100%', marginTop: 4 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Temp. Nevera / Refrigerador (°C)</label>
                <input type="number" step="0.1" className="input-neu" placeholder="4.0" value={thermoForm.fridge_temperature} onChange={e => setThermoForm(p => ({ ...p, fridge_temperature: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Responsable de la Toma</label>
                <input type="text" className="input-neu" placeholder="Nombre del regente o auxiliar" value={thermoForm.recorded_by} onChange={e => setThermoForm(p => ({ ...p, recorded_by: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowThermoModal(false)} className="btn-neu btn-ghost" style={{ padding: '10px 16px' }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submitting} style={{ padding: '10px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Toma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
