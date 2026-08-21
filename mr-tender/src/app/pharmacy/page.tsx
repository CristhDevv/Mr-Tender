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
  Download,
  RefreshCw,
  Clock,
  FileText,
  X,
  Check
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

  // Form states
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
    unit_price: '500',
    blister_price: '4500',
    box_price: '12000'
  })

  const [lotForm, setLotForm] = useState({
    medicine_id: '',
    lot_number: '',
    expiration_date: '',
    initial_quantity: '50'
  })

  const [thermoForm, setThermoForm] = useState({
    ambient_temperature: '21.5',
    relative_humidity: '58.0',
    fridge_temperature: '4.2',
    time_slot: 'morning',
    recorded_by: 'Regente Farmacéutico',
    observations: ''
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
      alert('Medicamento registrado con éxito')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar medicamento')
    } finally {
      setSubmitting(false)
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
      alert('Lote farmacéutico registrado')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al registrar lote')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle thermo log
  async function handleCreateThermo(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('pharmacy_thermo_logs')
        .insert({
          tenant_id: tenantId,
          log_date: today,
          time_slot: thermoForm.time_slot,
          ambient_temperature: parseFloat(thermoForm.ambient_temperature),
          relative_humidity: parseFloat(thermoForm.relative_humidity),
          fridge_temperature: thermoForm.fridge_temperature ? parseFloat(thermoForm.fridge_temperature) : null,
          recorded_by: thermoForm.recorded_by.trim(),
          observations: thermoForm.observations.trim() || null
        })
        .select('*')
        .single()

      if (error) throw error

      setThermoLogs(prev => [data, ...prev])
      setShowThermoModal(false)
      alert('Registro de temperatura y humedad guardado')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al guardar temperatura')
    } finally {
      setSubmitting(false)
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

      // Add lots
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
      alert('Catálogo farmacéutico cargado con éxito')
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
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
              Control sanitario INVIMA, trazabilidad de lotes FEFO y registro de termohigrometría
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {medicines.length === 0 && (
            <button className="btn-neu" onClick={handleSeedDemoData} disabled={submitting} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}>
              <Sparkles size={15} />
              <span>Cargar Catálogo Ejemplo</span>
            </button>
          )}

          {activeTab === 'catalog' && (
            <button className="btn-neu btn-primary" onClick={() => setShowMedModal(true)} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
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
          {activeTab === 'thermo' && (
            <>
              <button className="btn-neu btn-ghost" onClick={exportThermoCSV} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
              <button className="btn-neu btn-primary" onClick={() => setShowThermoModal(true)} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={15} strokeWidth={2.5} />
                <span>Toma de Temperatura</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="neu-flat" style={{ padding: 4, borderRadius: 10, display: 'inline-flex', gap: 4, overflowX: 'auto', maxWidth: '100%' }}>
        {[
          { id: 'catalog', label: 'Medicamentos y Genéricos', Icon: Pill, count: medicines.length },
          { id: 'lots', label: 'Lotes y Vencimientos (FEFO)', Icon: Calendar, count: lots.length },
          { id: 'thermo', label: 'Termohigrometría', Icon: Thermometer, count: thermoLogs.length },
          { id: 'controlled', label: 'Control Especial (FNE)', Icon: ShieldAlert, count: controlledLogs.length },
        ].map(tab => {
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`btn-neu ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={14} />
              <span>{tab.label} ({tab.count})</span>
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: MEDICINES CATALOG ── */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                        style={{ padding: '5px 9px', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Ver todos los genéricos de esta molécula"
                      >
                        <RefreshCw size={12} />
                        <span>Ver Genéricos</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMeds.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
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
                  </tr>
                ))}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay lotes registrados actualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: THERMOHYGROMETRY ── */}
      {activeTab === 'thermo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Jornada</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Temp. Ambiente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Humedad Relativa</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nevera (2°C - 8°C)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {thermoLogs.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatDate(t.log_date)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                        {t.time_slot === 'morning' ? 'Mañana' : 'Tarde'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.ambient_temperature}°C</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.relative_humidity}%</td>
                    <td style={{ padding: '12px 16px' }}>{t.fridge_temperature ? `${t.fridge_temperature}°C` : 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{t.recorded_by}</td>
                  </tr>
                ))}
                {thermoLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay registros de temperatura. Registra la primera toma con el botón "+ Toma de Temperatura".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: CONTROLLED MEDICINES LOG ── */}
      {activeTab === 'controlled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medicamento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Movimiento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Recetario Oficial</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Médico / Paciente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Saldo Final</th>
                </tr>
              </thead>
              <tbody>
                {controlledLogs.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatDate(c.log_date)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800 }}>{c.pharmacy_medicines?.trade_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-coral)' }}>{c.pharmacy_medicines?.generic_name}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${c.movement_type === 'dispensed' ? 'badge-coral' : 'badge-green'}`} style={{ fontSize: '0.68rem' }}>
                        {c.movement_type === 'dispensed' ? `Dispensado (-${c.quantity})` : `Entrada (+${c.quantity})`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.prescription_number}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dr. {c.doctor_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pac: {c.patient_name}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {c.balance_after} und
                    </td>
                  </tr>
                ))}
                {controlledLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay registros en el libro de control especial del FNE.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO MEDICAMENTO ── */}
      {showMedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Registrar Medicamento</h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowMedModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre Comercial *</label>
                  <input type="text" className="input-neu" placeholder="Dolex Forte" value={medForm.trade_name} onChange={e => setMedForm({ ...medForm, trade_name: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Principio Activo (Genérico) *</label>
                  <input type="text" className="input-neu" placeholder="Acetaminofén + Cafeína" value={medForm.generic_name} onChange={e => setMedForm({ ...medForm, generic_name: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Concentración *</label>
                  <input type="text" className="input-neu" placeholder="500mg / 65mg" value={medForm.concentration} onChange={e => setMedForm({ ...medForm, concentration: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Forma Farmacéutica *</label>
                  <input type="text" className="input-neu" placeholder="Tabletas, Jarabe, etc." value={medForm.pharmaceutical_form} onChange={e => setMedForm({ ...medForm, pharmaceutical_form: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Laboratorio *</label>
                  <input type="text" className="input-neu" placeholder="GSK / Genfar / MK" value={medForm.laboratory} onChange={e => setMedForm({ ...medForm, laboratory: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Registro Sanitario INVIMA *</label>
                  <input type="text" className="input-neu" placeholder="INVIMA 2020M-0001234" value={medForm.invima_registration} onChange={e => setMedForm({ ...medForm, invima_registration: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Pastilla ($)</label>
                  <input type="number" className="input-neu" value={medForm.unit_price} onChange={e => setMedForm({ ...medForm, unit_price: e.target.value })} required style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Blíster ($)</label>
                  <input type="number" className="input-neu" value={medForm.blister_price} onChange={e => setMedForm({ ...medForm, blister_price: e.target.value })} style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precio Caja ($)</label>
                  <input type="number" className="input-neu" value={medForm.box_price} onChange={e => setMedForm({ ...medForm, box_price: e.target.value })} style={{ width: '100%', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowMedModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
                  {submitting ? 'Guardando...' : 'Guardar Medicamento'}
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
                  style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-deep)' }}
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

      {/* ── MODAL: TOMA DE TEMPERATURA ── */}
      {showThermoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Thermometer size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Registro de Termohigrometría</h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowThermoModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateThermo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Jornada *</label>
                <select
                  className="input-neu"
                  value={thermoForm.time_slot}
                  onChange={e => setThermoForm({ ...thermoForm, time_slot: e.target.value })}
                  style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-deep)' }}
                >
                  <option value="morning">Mañana (08:00 AM)</option>
                  <option value="afternoon">Tarde (04:00 PM)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Temp. Ambiente (°C) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-neu"
                    value={thermoForm.ambient_temperature}
                    onChange={e => setThermoForm({ ...thermoForm, ambient_temperature: e.target.value })}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Humedad Relativa (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-neu"
                    value={thermoForm.relative_humidity}
                    onChange={e => setThermoForm({ ...thermoForm, relative_humidity: e.target.value })}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Temp. Nevera (°C) (Opcional)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-neu"
                  value={thermoForm.fridge_temperature}
                  onChange={e => setThermoForm({ ...thermoForm, fridge_temperature: e.target.value })}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Responsable *</label>
                <input
                  type="text"
                  className="input-neu"
                  value={thermoForm.recorded_by}
                  onChange={e => setThermoForm({ ...thermoForm, recorded_by: e.target.value })}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowThermoModal(false)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
                  {submitting ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
