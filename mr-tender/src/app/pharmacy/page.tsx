'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
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
  AlertCircle,
  Thermometer,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  Droplets,
  Building,
  UserCheck
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

interface Lot {
  id: string
  tenant_id: string
  medicine_id: string
  lot_number: string
  expiration_date: string
  initial_quantity: number
  current_quantity: number
  status: string
  pharmacy_medicines?: {
    trade_name: string
    generic_name: string
    concentration: string
  }
}

interface ThermoLog {
  id: string
  tenant_id: string
  log_date: string
  time_slot: 'morning' | 'afternoon'
  ambient_temperature: number
  relative_humidity: number
  fridge_temperature?: number | null
  recorded_by: string
  observations?: string | null
  created_at: string
}

interface ControlledLog {
  id: string
  tenant_id: string
  medicine_id: string
  lot_id?: string | null
  movement_type: 'entry' | 'dispense' | 'adjustment'
  quantity: number
  prescription_number?: string | null
  doctor_name?: string | null
  doctor_license?: string | null
  patient_name?: string | null
  patient_id_doc?: string | null
  patient_phone?: string | null
  balance_after: number
  notes?: string | null
  created_at: string
  pharmacy_medicines?: {
    trade_name: string
    generic_name: string
    concentration: string
  }
}

export default function PharmacyPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'catalog' | 'lots' | 'thermo' | 'controlled'>('catalog')
  const [loading, setLoading] = useState(true)

  // Data lists
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [thermoLogs, setThermoLogs] = useState<ThermoLog[]>([])
  const [controlledLogs, setControlledLogs] = useState<ControlledLog[]>([])

  // Search & Filter
  const [search, setSearch] = useState('')
  const [selectedGenericFilter, setSelectedGenericFilter] = useState<string | null>(null)
  const [filterPrescription, setFilterPrescription] = useState('all')

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

  // Thermo Log Modal states
  const [showThermoModal, setShowThermoModal] = useState(false)
  const [thermoForm, setThermoForm] = useState({
    log_date: new Date().toISOString().split('T')[0],
    time_slot: 'morning' as 'morning' | 'afternoon',
    ambient_temperature: '21.5',
    relative_humidity: '55',
    fridge_temperature: '4.5',
    recorded_by: 'Regente de Farmacia',
    observations: 'Parámetros dentro del rango óptimo sanitario.'
  })

  // Controlled Log Modal states
  const [showControlledModal, setShowControlledModal] = useState(false)
  const [controlledForm, setControlledForm] = useState({
    medicine_id: '',
    lot_id: '',
    movement_type: 'dispense' as 'entry' | 'dispense' | 'adjustment',
    quantity: '10',
    prescription_number: '',
    doctor_name: '',
    doctor_license: '',
    patient_name: '',
    patient_id_doc: '',
    patient_phone: '',
    notes: 'Dispensación bajo prescripción médica verificada'
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

      const [medsRes, lotsRes, thermoRes, controlledRes] = await Promise.all([
        supabase.from('pharmacy_medicines').select('*').eq('tenant_id', tid).order('trade_name', { ascending: true }),
        supabase.from('pharmacy_lots').select('*, pharmacy_medicines(trade_name, generic_name, concentration)').eq('tenant_id', tid).order('expiration_date', { ascending: true }),
        supabase.from('pharmacy_thermo_logs').select('*').eq('tenant_id', tid).order('log_date', { ascending: false }).order('created_at', { ascending: false }).limit(30),
        supabase.from('pharmacy_controlled_logs').select('*, pharmacy_medicines(trade_name, generic_name, concentration)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(50)
      ])

      setMedicines(medsRes.data || [])
      setLots((lotsRes.data as any) || [])
      setThermoLogs((thermoRes.data as any) || [])
      setControlledLogs((controlledRes.data as any) || [])
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

  // Save Medicine
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
        const { error } = await supabase.from('pharmacy_medicines').update(payload).eq('id', editingMedId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pharmacy_medicines').insert(payload)
        if (error) throw error
      }

      setShowMedModal(false)
      await loadPharmacyData()
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

  // Create Lot
  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting || !lotForm.medicine_id) return
    setSubmitting(true)

    try {
      const qty = parseInt(lotForm.initial_quantity) || 0
      const { error } = await supabase
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

      if (error) throw error
      setShowLotModal(false)
      setLotForm({ medicine_id: '', lot_number: '', expiration_date: '', initial_quantity: '50' })
      await loadPharmacyData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al registrar lote')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Lot
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

  // Save Thermo Log
  async function handleSaveThermoLog(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        log_date: thermoForm.log_date,
        time_slot: thermoForm.time_slot,
        ambient_temperature: Number(thermoForm.ambient_temperature),
        relative_humidity: Number(thermoForm.relative_humidity),
        fridge_temperature: thermoForm.fridge_temperature ? Number(thermoForm.fridge_temperature) : null,
        recorded_by: thermoForm.recorded_by,
        observations: thermoForm.observations || null
      }
      const { error } = await supabase.from('pharmacy_thermo_logs').insert(payload)
      if (error) throw error
      setShowThermoModal(false)
      await loadPharmacyData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar toma termohigrométrica')
    } finally {
      setSubmitting(false)
    }
  }

  // Save Controlled Log
  async function handleSaveControlledLog(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting || !controlledForm.medicine_id) return
    setSubmitting(true)
    try {
      const med = medicines.find(m => m.id === controlledForm.medicine_id)
      const qty = Number(controlledForm.quantity) || 0
      const currentStock = med?.stock || 0
      const newBalance = controlledForm.movement_type === 'entry'
        ? currentStock + qty
        : Math.max(0, currentStock - qty)

      const payload = {
        tenant_id: tenantId,
        medicine_id: controlledForm.medicine_id,
        lot_id: controlledForm.lot_id || null,
        movement_type: controlledForm.movement_type,
        quantity: qty,
        prescription_number: controlledForm.prescription_number || null,
        doctor_name: controlledForm.doctor_name || null,
        doctor_license: controlledForm.doctor_license || null,
        patient_name: controlledForm.patient_name || null,
        patient_id_doc: controlledForm.patient_id_doc || null,
        patient_phone: controlledForm.patient_phone || null,
        balance_after: newBalance,
        notes: controlledForm.notes || null
      }

      const { error } = await supabase.from('pharmacy_controlled_logs').insert(payload)
      if (error) throw error

      setShowControlledModal(false)
      setControlledForm({
        medicine_id: '',
        lot_id: '',
        movement_type: 'dispense',
        quantity: '10',
        prescription_number: '',
        doctor_name: '',
        doctor_license: '',
        patient_name: '',
        patient_id_doc: '',
        patient_phone: '',
        notes: 'Dispensación bajo prescripción médica verificada'
      })
      await loadPharmacyData()
    } catch (err: any) {
      alert(err.message || 'Error al asentar registro en el libro de controlados')
    } finally {
      setSubmitting(false)
    }
  }

  // Seed Demo Data if empty
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
          is_controlled: false,
          stock: 120
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
          is_controlled: false,
          stock: 250
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
          is_controlled: false,
          stock: 80
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
          is_controlled: true,
          stock: 45
        }
      ]

      const { data: insertedMeds, error: medErr } = await supabase
        .from('pharmacy_medicines')
        .insert(demoMeds)
        .select('*')

      if (medErr) throw medErr

      if (insertedMeds && insertedMeds.length > 0) {
        const demoLots = [
          {
            tenant_id: tenantId,
            medicine_id: insertedMeds[0].id,
            lot_number: 'DLX-2025-A',
            expiration_date: '2027-05-30',
            initial_quantity: 100,
            current_quantity: 75,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            medicine_id: insertedMeds[1].id,
            lot_number: 'GNF-8890',
            expiration_date: '2026-11-15',
            initial_quantity: 200,
            current_quantity: 160,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            medicine_id: insertedMeds[2].id,
            lot_number: 'AMX-0041',
            expiration_date: '2025-10-10', // near expiration
            initial_quantity: 50,
            current_quantity: 30,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            medicine_id: insertedMeds[3].id,
            lot_number: 'CLZ-9912',
            expiration_date: '2028-01-20',
            initial_quantity: 30,
            current_quantity: 25,
            status: 'active'
          }
        ]
        await supabase.from('pharmacy_lots').insert(demoLots)
      }

      await loadPharmacyData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered medicines
  const filteredMeds = medicines.filter(m => {
    const q = search.toLowerCase()
    const matchesQuery = !search ||
      m.trade_name.toLowerCase().includes(q) ||
      m.generic_name.toLowerCase().includes(q) ||
      m.laboratory?.toLowerCase().includes(q) ||
      m.invima_registration?.toLowerCase().includes(q)

    const matchesGeneric = !selectedGenericFilter || m.generic_name.toLowerCase() === selectedGenericFilter.toLowerCase()
    const matchesPrescription = filterPrescription === 'all' || m.prescription_type === filterPrescription

    return matchesQuery && matchesGeneric && matchesPrescription
  })

  // Expiration badge helper
  function getExpirationBadge(dateStr: string) {
    const exp = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(220, 38, 38, 0.12)', color: 'var(--accent-coral)' }}>🔴 Vencido</span>
    } else if (diffDays <= 90) {
      return <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(217, 119, 6, 0.12)', color: 'var(--accent-amber)' }}>⚠️ Vence en {diffDays}d</span>
    } else {
      return <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(22, 163, 74, 0.12)', color: 'var(--accent-green)' }}>✓ {formatDate(dateStr)}</span>
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>💊</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Droguería & Farmacia
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Lotes y FEFO, registro sanitario INVIMA, control termohigrométrico y libro de medicamentos controlados
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadPharmacyData} className="btn-neu btn-ghost" title="Recargar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {medicines.length === 0 && (
            <button onClick={handleSeedDemoData} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
              ✨ Cargar Medicamentos Demo
            </button>
          )}
          {activeTab === 'catalog' && (
            <button onClick={openCreateMedModal} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Medicamento</span>
            </button>
          )}
          {activeTab === 'lots' && (
            <button onClick={() => setShowLotModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Registrar Lote</span>
            </button>
          )}
          {activeTab === 'thermo' && (
            <button onClick={() => setShowThermoModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Toma Diaria</span>
            </button>
          )}
          {activeTab === 'controlled' && (
            <button onClick={() => setShowControlledModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Asentar en Libro</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Medicamentos Registrados
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {medicines.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {medicines.filter(m => m.prescription_type === 'controlled').length} de control especial
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Lotes en Custodia (FEFO)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {lots.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {lots.reduce((acc, l) => acc + (Number(l.current_quantity) || 0), 0)} unidades físicas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Lotes Próximos a Vencer
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {lots.filter(l => {
              const diff = Math.ceil((new Date(l.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              return diff <= 90
            }).length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Menos de 90 días de vida útil
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Control Sanitario (Auditorías)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {thermoLogs.length > 0 ? 'Al Día' : 'Pendiente'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {thermoLogs.length} tomas de temp/humedad
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('catalog')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'catalog' ? 800 : 500,
            background: activeTab === 'catalog' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'catalog' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Pill size={15} />
          <span>Catálogo & Precios Fraccionados ({medicines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lots')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'lots' ? 800 : 500,
            background: activeTab === 'lots' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'lots' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Clock size={15} />
          <span>Lotes & Trazabilidad FEFO ({lots.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('thermo')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'thermo' ? 800 : 500,
            background: activeTab === 'thermo' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'thermo' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Thermometer size={15} />
          <span>Registro Termohigrométrico ({thermoLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('controlled')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'controlled' ? 800 : 500,
            background: activeTab === 'controlled' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'controlled' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldAlert size={15} />
          <span>Libro de Controlados ({controlledLogs.length})</span>
        </button>
      </div>

      {/* ── TAB 1: CATALOGO & PRECIOS FRACCIONADOS ── */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                className="input-neu"
                type="text"
                placeholder="Buscar por marca, principio activo, INVIMA o laboratorio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 34, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'otc', label: 'Venta Libre (OTC)' },
                { id: 'rx', label: 'Fórmula Médica (Rx)' },
                { id: 'controlled', label: 'Control Especial' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterPrescription(f.id)}
                  className="btn-neu"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    background: filterPrescription === f.id ? 'var(--bg-deep)' : 'var(--bg)',
                    fontWeight: filterPrescription === f.id ? 700 : 500,
                    border: filterPrescription === f.id ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {selectedGenericFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139, 92, 246, 0.08)', padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem' }}>
              <span>Filtrando sustitutos por molécula genérica: <strong>{selectedGenericFilter}</strong></span>
              <button onClick={() => setSelectedGenericFilter(null)} style={{ border: 'none', background: 'none', color: 'var(--accent-coral)', cursor: 'pointer', fontWeight: 800 }}>✕ Limpiar filtro</button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando catálogo farmacéutico...</div>
          ) : filteredMeds.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💊</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay medicamentos registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra medicamentos con INVIMA, precios fraccionados (tableta, blíster, caja) y principio activo.
              </p>
              <button onClick={openCreateMedModal} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primer medicamento
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Medicamento / Concentración</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Principio Activo & Laboratorio</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Reg. INVIMA</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Precios (Und / Blíster / Caja)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Tipo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeds.map(m => {
                    const isControlled = m.prescription_type === 'controlled'
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{m.trade_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{m.pharmaceutical_form} • {m.concentration}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setSelectedGenericFilter(m.generic_name)}
                            title="Filtrar otros medicamentos con la misma molécula"
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-purple)', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                          >
                            {m.generic_name}
                          </button>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.laboratory}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {m.invima_registration || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                            Tableta: {formatCurrency(Number(m.unit_price))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {m.blister_price ? `Blíster (${m.units_per_blister}u): ${formatCurrency(Number(m.blister_price))}` : ''}
                            {m.box_price ? ` • Caja (${m.units_per_box}u): ${formatCurrency(Number(m.box_price))}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: isControlled ? 'rgba(220, 38, 38, 0.12)' : m.prescription_type === 'rx' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                            color: isControlled ? 'var(--accent-coral)' : m.prescription_type === 'rx' ? 'var(--accent-amber)' : 'var(--accent-green)'
                          }}>
                            {isControlled ? '🔒 Controlado' : m.prescription_type === 'rx' ? '📋 Con Fórmula' : 'Venta Libre'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditMedModal(m)}
                              className="btn-neu btn-ghost"
                              style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(m.id, m.trade_name)}
                              className="btn-neu btn-ghost"
                              style={{ padding: '5px 8px', color: 'var(--accent-coral)' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: LOTES & FEFO ── */}
      {activeTab === 'lots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lots.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📦</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay lotes registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra los lotes de compra con su fecha de vencimiento para habilitar la dispensación FEFO automática en caja.
              </p>
              <button onClick={() => setShowLotModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Registrar primer lote
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Medicamento</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Número de Lote</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Vencimiento (FEFO)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Stock Disponible</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{l.pharmacy_medicines?.trade_name || 'Medicamento'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-purple)' }}>{l.pharmacy_medicines?.generic_name} {l.pharmacy_medicines?.concentration}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {l.lot_number}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getExpirationBadge(l.expiration_date)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {l.current_quantity} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {l.initial_quantity} inicial</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteLot(l.id, l.lot_number)}
                          className="btn-neu btn-ghost"
                          style={{ padding: '5px 8px', color: 'var(--accent-coral)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: REGISTRO TERMOHIGROMÉTRICO ── */}
      {activeTab === 'thermo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🌡️ Bitácora Oficial de Temperatura & Humedad
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Norma sanitaria: Ambiente (15°C - 25°C), Humedad (40% - 70%), Nevera (2°C - 8°C)
              </p>
            </div>
            <button onClick={() => setShowThermoModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} />
              <span>Registrar Toma Diaria</span>
            </button>
          </div>

          {thermoLogs.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🌡️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay registros termohigrométricos</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Cumple con las auditorías de Secretaría de Salud registrando las tomas de la mañana y de la tarde.
              </p>
              <button onClick={() => setShowThermoModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Registrar primera toma
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha / Jornada</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Temp. Ambiente (15-25°C)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Humedad Relativa (40-70%)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Nevera (2-8°C)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Responsable & Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {thermoLogs.map(t => {
                    const tempAmbOk = t.ambient_temperature >= 15 && t.ambient_temperature <= 25
                    const humOk = t.relative_humidity >= 40 && t.relative_humidity <= 70
                    const fridgeOk = t.fridge_temperature == null || (t.fridge_temperature >= 2 && t.fridge_temperature <= 8)

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formatDate(t.log_date)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {t.time_slot === 'morning' ? '🌅 Mañana (08:00 AM)' : '🌇 Tarde (04:00 PM)'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 9px',
                            borderRadius: 6,
                            fontWeight: 800,
                            background: tempAmbOk ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                            color: tempAmbOk ? 'var(--accent-green)' : 'var(--accent-coral)'
                          }}>
                            {t.ambient_temperature}°C
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 9px',
                            borderRadius: 6,
                            fontWeight: 800,
                            background: humOk ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                            color: humOk ? 'var(--accent-green)' : 'var(--accent-coral)'
                          }}>
                            {t.relative_humidity}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {t.fridge_temperature != null ? (
                            <span style={{
                              padding: '4px 9px',
                              borderRadius: 6,
                              fontWeight: 800,
                              background: fridgeOk ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                              color: fridgeOk ? 'var(--accent-green)' : 'var(--accent-coral)'
                            }}>
                              {t.fridge_temperature}°C
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.recorded_by}</div>
                          {t.observations && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.observations}</div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: LIBRO DE MEDICAMENTOS CONTROLADOS ── */}
      {activeTab === 'controlled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🔒 Libro Oficial de Medicamentos de Control Especial (FNE)
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Registro estricto de entradas, salidas, fórmula médica, médico prescriptor y saldo físico en custodia
              </p>
            </div>
            <button onClick={() => setShowControlledModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} />
              <span>Asentar Movimiento en Libro</span>
            </button>
          </div>

          {controlledLogs.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔒</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Libro de controlados sin movimientos</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Asienta los ingresos de stock y las dispensaciones con fórmula médica para auditorías sanitarias.
              </p>
              <button onClick={() => setShowControlledModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Asentar primer movimiento
              </button>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha / Movimiento</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Medicamento</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fórmula / Médico</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Paciente</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Cant / Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {controlledLogs.map(c => {
                    const isDispense = c.movement_type === 'dispense'
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatDate(c.created_at)}</div>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 5,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: isDispense ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                            color: isDispense ? 'var(--accent-amber)' : 'var(--accent-green)'
                          }}>
                            {isDispense ? '📤 Salida / Venta' : '📥 Entrada Stock'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{c.pharmacy_medicines?.trade_name || 'Medicamento'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--accent-purple)' }}>{c.pharmacy_medicines?.generic_name} {c.pharmacy_medicines?.concentration}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Fórmula: {c.prescription_number || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Dr(a). {c.doctor_name || '—'} {c.doctor_license ? `(TP: ${c.doctor_license})` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.patient_name || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {c.patient_id_doc ? `CC: ${c.patient_id_doc}` : ''} {c.patient_phone ? `• Tel: ${c.patient_phone}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: isDispense ? 'var(--accent-coral)' : 'var(--accent-green)' }}>
                            {isDispense ? `-${c.quantity}` : `+${c.quantity}`}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Saldo: <strong>{c.balance_after}</strong>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: NUEVO / EDITAR MEDICAMENTO ── */}
      {showMedModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {editingMedId ? '✎ Editar Medicamento' : '💊 Nuevo Medicamento'}
              </h2>
              <button onClick={() => setShowMedModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Comercial *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Dolex Forte"
                    value={medForm.trade_name}
                    onChange={e => setMedForm(f => ({ ...f, trade_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Principio Activo (Genérico) *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Acetaminofén + Cafeína"
                    value={medForm.generic_name}
                    onChange={e => setMedForm(f => ({ ...f, generic_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Concentración</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="500mg / 65mg"
                    value={medForm.concentration}
                    onChange={e => setMedForm(f => ({ ...f, concentration: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Forma Farmacéutica</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Tabletas, Jarabe..."
                    value={medForm.pharmaceutical_form}
                    onChange={e => setMedForm(f => ({ ...f, pharmaceutical_form: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Laboratorio</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Genfar, MK, Pfizer..."
                    value={medForm.laboratory}
                    onChange={e => setMedForm(f => ({ ...f, laboratory: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Registro Sanitario INVIMA</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="INVIMA 2021M-0001234"
                    value={medForm.invima_registration}
                    onChange={e => setMedForm(f => ({ ...f, invima_registration: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo de Prescripción</label>
                  <select
                    className="input-neu"
                    value={medForm.prescription_type}
                    onChange={e => setMedForm(f => ({ ...f, prescription_type: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="otc">Venta Libre (OTC)</option>
                    <option value="rx">Venta Bajo Fórmula Médica (Rx)</option>
                    <option value="controlled">Medicamento de Control Especial (FNE)</option>
                  </select>
                </div>
              </div>

              {/* Fractional Pricing */}
              <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Precios Fraccionados & Presentación</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Unitario (Tableta)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.unit_price}
                      onChange={e => setMedForm(f => ({ ...f, unit_price: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Blíster ({medForm.units_per_blister}u)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.blister_price}
                      onChange={e => setMedForm(f => ({ ...f, blister_price: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Caja Completa ({medForm.units_per_box}u)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={medForm.box_price}
                      onChange={e => setMedForm(f => ({ ...f, box_price: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowMedModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR LOTE ── */}
      {showLotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📦 Registrar Nuevo Lote
              </h2>
              <button onClick={() => setShowLotModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Seleccionar Medicamento *</label>
                <select
                  className="input-neu"
                  value={lotForm.medicine_id}
                  onChange={e => setLotForm(f => ({ ...f, medicine_id: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <option value="">Selecciona un medicamento...</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.trade_name} ({m.generic_name} {m.concentration})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Número de Lote *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="LOT-2026-X"
                    value={lotForm.lot_number}
                    onChange={e => setLotForm(f => ({ ...f, lot_number: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={lotForm.expiration_date}
                    onChange={e => setLotForm(f => ({ ...f, expiration_date: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cantidad Inicial (Unidades) *</label>
                <input
                  type="number"
                  className="input-neu"
                  value={lotForm.initial_quantity}
                  onChange={e => setLotForm(f => ({ ...f, initial_quantity: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowLotModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Registrar Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TOMA TERMOHIGROMÉTRICA ── */}
      {showThermoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🌡️ Nueva Toma Termohigrométrica
              </h2>
              <button onClick={() => setShowThermoModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveThermoLog} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha de Toma</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={thermoForm.log_date}
                    onChange={e => setThermoForm(f => ({ ...f, log_date: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Jornada</label>
                  <select
                    className="input-neu"
                    value={thermoForm.time_slot}
                    onChange={e => setThermoForm(f => ({ ...f, time_slot: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="morning">Mañana (08:00 AM)</option>
                    <option value="afternoon">Tarde (04:00 PM)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Temp. Ambiente (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-neu"
                    value={thermoForm.ambient_temperature}
                    onChange={e => setThermoForm(f => ({ ...f, ambient_temperature: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Humedad Rel. (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-neu"
                    value={thermoForm.relative_humidity}
                    onChange={e => setThermoForm(f => ({ ...f, relative_humidity: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nevera (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-neu"
                    value={thermoForm.fridge_temperature}
                    onChange={e => setThermoForm(f => ({ ...f, fridge_temperature: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Registrado por (Responsable)</label>
                <input
                  type="text"
                  className="input-neu"
                  value={thermoForm.recorded_by}
                  onChange={e => setThermoForm(f => ({ ...f, recorded_by: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Observaciones</label>
                <input
                  type="text"
                  className="input-neu"
                  value={thermoForm.observations}
                  onChange={e => setThermoForm(f => ({ ...f, observations: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowThermoModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Asentar Toma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ASENTAR LIBRO DE CONTROLADOS ── */}
      {showControlledModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🔒 Asentar en Libro de Control Especial (FNE)
              </h2>
              <button onClick={() => setShowControlledModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveControlledLog} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Medicamento Controlado *</label>
                  <select
                    className="input-neu"
                    value={controlledForm.medicine_id}
                    onChange={e => setControlledForm(f => ({ ...f, medicine_id: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="">Selecciona medicamento...</option>
                    {medicines.filter(m => m.prescription_type === 'controlled').map(m => (
                      <option key={m.id} value={m.id}>{m.trade_name} ({m.generic_name} {m.concentration})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo Movimiento</label>
                  <select
                    className="input-neu"
                    value={controlledForm.movement_type}
                    onChange={e => setControlledForm(f => ({ ...f, movement_type: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="dispense">Dispensación (Salida)</option>
                    <option value="entry">Ingreso (Entrada)</option>
                    <option value="adjustment">Ajuste de Auditoría</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>N° Fórmula Médica</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="FORM-883492"
                    value={controlledForm.prescription_number}
                    onChange={e => setControlledForm(f => ({ ...f, prescription_number: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cantidad (Tabletas/Unidades) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={controlledForm.quantity}
                    onChange={e => setControlledForm(f => ({ ...f, quantity: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Médico Tratante</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Dr. Fernando Salazar"
                    value={controlledForm.doctor_name}
                    onChange={e => setControlledForm(f => ({ ...f, doctor_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tarjeta Profesional Médico</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="TP 104928-MD"
                    value={controlledForm.doctor_license}
                    onChange={e => setControlledForm(f => ({ ...f, doctor_license: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Paciente</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="María Eugenia Gómez"
                    value={controlledForm.patient_name}
                    onChange={e => setControlledForm(f => ({ ...f, patient_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cédula Paciente</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="52.123.456"
                    value={controlledForm.patient_id_doc}
                    onChange={e => setControlledForm(f => ({ ...f, patient_id_doc: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowControlledModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Asentando...' : 'Asentar en Libro Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
