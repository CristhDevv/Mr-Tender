'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Glasses,
  Eye,
  Users,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MessageSquare,
  Clock,
  DollarSign,
  Package,
  Layers,
  TrendingUp,
  Percent,
  Check,
  X,
  FileText,
  ShieldCheck,
  QrCode,
  Printer,
  Calendar,
  Sparkles,
  Award,
  Activity
} from 'lucide-react'

interface OptometryPatient {
  id: string
  tenant_id: string
  patient_number: string
  full_name: string
  id_number: string
  phone?: string | null
  email?: string | null
  birth_date?: string | null
  occupation?: string | null
  notes?: string | null
  created_at: string
}

interface OptometryPrescription {
  id: string
  tenant_id: string
  patient_id: string
  optometrist_name: string
  exam_date: string
  od_sphere: number
  od_cylinder: number
  od_axis: number
  od_add: number
  os_sphere: number
  os_cylinder: number
  os_axis: number
  os_add: number
  pupillary_distance_dp: number
  lens_type_recommended: string
  filter_recommended: string
  diagnosis: string
  next_checkup_date?: string | null
  created_at: string
  optometry_patients?: {
    full_name: string
    id_number: string
    phone?: string | null
    patient_number: string
  }
}

interface OptometryLabOrder {
  id: string
  tenant_id: string
  order_number: string
  patient_id: string
  prescription_id?: string | null
  frame_model: string
  frame_type: string
  lens_material: string
  treatments: string
  lab_name: string
  promised_delivery_date: string
  total_price: number
  advance_payment: number
  status: 'in_lab' | 'ready_for_pickup' | 'delivered' | 'warranty'
  created_at: string
  optometry_patients?: {
    full_name: string
    id_number: string
    phone?: string | null
  }
}

interface OptometryFrame {
  id: string
  tenant_id: string
  sku: string
  brand: string
  model: string
  color: string
  material: string
  caliber_bridge_rod: string
  cost: number
  price: number
  stock: number
  created_at: string
}

export default function OptometryPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'lab_orders' | 'patients' | 'frames'>('prescriptions')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [patients, setPatients] = useState<OptometryPatient[]>([])
  const [prescriptions, setPrescriptions] = useState<OptometryPrescription[]>([])
  const [labOrders, setLabOrders] = useState<OptometryLabOrder[]>([])
  const [frames, setFrames] = useState<OptometryFrame[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showLabOrderModal, setShowLabOrderModal] = useState<OptometryPrescription | null>(null)
  const [showFrameModal, setShowFrameModal] = useState(false)
  const [selectedPrescriptionForPrint, setSelectedPrescriptionForPrint] = useState<OptometryPrescription | null>(null)

  // Forms
  const [patientForm, setPatientForm] = useState({
    full_name: '',
    id_number: '',
    phone: '',
    email: '',
    birth_date: '1990-05-20',
    occupation: 'Ingeniero de Software / Pantallas 8h',
    notes: 'Usa lentes de descanso actualmente'
  })

  const [prescriptionForm, setPrescriptionForm] = useState({
    patient_id: '',
    optometrist_name: 'Dra. Valeria Gómez (Optómetra Reg. 45892)',
    exam_date: new Date().toISOString().split('T')[0],
    od_sphere: -2.25,
    od_cylinder: -0.75,
    od_axis: 15,
    od_add: 0.00,
    os_sphere: -2.00,
    os_cylinder: -1.00,
    os_axis: 175,
    os_add: 0.00,
    pupillary_distance_dp: 63.0,
    lens_type_recommended: 'Monofocal Digital HD',
    filter_recommended: 'Antirreflejo + Filtro Azul (Blue UV400)',
    diagnosis: 'Miopía y Astigmatismo Miópico Compuesto',
    next_checkup_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const [labOrderForm, setLabOrderForm] = useState({
    frame_model: 'Montura Ray-Ban RB3025 Aviador Dorada',
    frame_type: 'Aro Completo Metal',
    lens_material: 'Policarbonato 1.59 Alto Impacto',
    treatments: 'Antirreflejo Crizal AR + Filtro Blue UV',
    lab_name: 'Laboratorio Óptico Servilentes',
    promised_delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_price: 320000,
    advance_payment: 160000
  })

  const [frameForm, setFrameForm] = useState({
    sku: 'MON-RB-3025',
    brand: 'Ray-Ban',
    model: 'Aviator Classic RB3025',
    color: 'Dorado / G-15',
    material: 'Metal / Titanio',
    caliber_bridge_rod: '58-14-135',
    cost: 180000,
    price: 340000,
    stock: 4
  })

  useEffect(() => {
    loadOptometryData()
  }, [])

  async function loadOptometryData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [patientsRes, prescRes, ordersRes, framesRes] = await Promise.all([
        supabase.from('optometry_patients').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('optometry_prescriptions').select('*, optometry_patients(full_name, id_number, phone, patient_number)').eq('tenant_id', tid).order('exam_date', { ascending: false }),
        supabase.from('optometry_lab_orders').select('*, optometry_patients(full_name, id_number, phone)').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('optometry_frames_catalog').select('*').eq('tenant_id', tid).order('brand', { ascending: true })
      ])

      setPatients(patientsRes.data || [])
      setPrescriptions((prescRes.data as any) || [])
      setLabOrders((ordersRes.data as any) || [])
      setFrames(framesRes.data || [])
    } catch (err) {
      console.error('Error loading optometry data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Patient
  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!patientForm.full_name.trim()) return alert('Ingresa el nombre del paciente')
    if (!patientForm.id_number.trim()) return alert('Ingresa la cédula/DNI')

    setSubmitting(true)
    try {
      const patientNumber = `OPT-${Date.now().toString().slice(-4)}`
      const payload = {
        tenant_id: tenantId,
        patient_number: patientNumber,
        full_name: patientForm.full_name.trim(),
        id_number: patientForm.id_number.trim(),
        phone: patientForm.phone.trim() || null,
        email: patientForm.email.trim() || null,
        birth_date: patientForm.birth_date || null,
        occupation: patientForm.occupation.trim() || null,
        notes: patientForm.notes.trim() || null
      }

      const { data, error } = await supabase.from('optometry_patients').insert(payload).select().single()
      if (error) throw error

      setShowPatientModal(false)
      setPatientForm({
        full_name: '',
        id_number: '',
        phone: '',
        email: '',
        birth_date: '1990-05-20',
        occupation: '',
        notes: ''
      })
      await loadOptometryData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar paciente')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Prescription
  async function handleCreatePrescription(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!prescriptionForm.patient_id) return alert('Selecciona el paciente')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        patient_id: prescriptionForm.patient_id,
        optometrist_name: prescriptionForm.optometrist_name.trim(),
        exam_date: prescriptionForm.exam_date,
        od_sphere: Number(prescriptionForm.od_sphere),
        od_cylinder: Number(prescriptionForm.od_cylinder),
        od_axis: Number(prescriptionForm.od_axis),
        od_add: Number(prescriptionForm.od_add),
        os_sphere: Number(prescriptionForm.os_sphere),
        os_cylinder: Number(prescriptionForm.os_cylinder),
        os_axis: Number(prescriptionForm.os_axis),
        os_add: Number(prescriptionForm.os_add),
        pupillary_distance_dp: Number(prescriptionForm.pupillary_distance_dp),
        lens_type_recommended: prescriptionForm.lens_type_recommended,
        filter_recommended: prescriptionForm.filter_recommended,
        diagnosis: prescriptionForm.diagnosis.trim(),
        next_checkup_date: prescriptionForm.next_checkup_date || null
      }

      const { error } = await supabase.from('optometry_prescriptions').insert(payload)
      if (error) throw error

      setShowPrescriptionModal(false)
      await loadOptometryData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar examen visual')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Lab Order
  async function handleCreateLabOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!showLabOrderModal || !tenantId || submitting) return

    setSubmitting(true)
    try {
      const orderNumber = `LAB-${Date.now().toString().slice(-4)}`
      const payload = {
        tenant_id: tenantId,
        order_number: orderNumber,
        patient_id: showLabOrderModal.patient_id,
        prescription_id: showLabOrderModal.id,
        frame_model: labOrderForm.frame_model.trim(),
        frame_type: labOrderForm.frame_type,
        lens_material: labOrderForm.lens_material,
        treatments: labOrderForm.treatments,
        lab_name: labOrderForm.lab_name,
        promised_delivery_date: labOrderForm.promised_delivery_date,
        total_price: Number(labOrderForm.total_price),
        advance_payment: Number(labOrderForm.advance_payment),
        status: 'in_lab'
      }

      const { error } = await supabase.from('optometry_lab_orders').insert(payload)
      if (error) throw error

      setShowLabOrderModal(null)
      await loadOptometryData()
    } catch (err: any) {
      alert(err.message || 'Error al crear orden de laboratorio')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Lab Order Status
  async function handleUpdateOrderStatus(orderId: string, nextStatus: 'in_lab' | 'ready_for_pickup' | 'delivered') {
    try {
      const { error } = await supabase.from('optometry_lab_orders').update({ status: nextStatus }).eq('id', orderId)
      if (error) throw error
      await loadOptometryData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Frame
  async function handleCreateFrame(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!frameForm.brand.trim() || !frameForm.model.trim()) return alert('Ingresa marca y modelo')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        sku: frameForm.sku.trim().toUpperCase(),
        brand: frameForm.brand.trim(),
        model: frameForm.model.trim(),
        color: frameForm.color.trim(),
        material: frameForm.material.trim(),
        caliber_bridge_rod: frameForm.caliber_bridge_rod.trim(),
        cost: Number(frameForm.cost),
        price: Number(frameForm.price),
        stock: Number(frameForm.stock)
      }

      const { error } = await supabase.from('optometry_frames_catalog').insert(payload)
      if (error) throw error

      setShowFrameModal(false)
      await loadOptometryData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar montura')
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp WhatsApp URL for Ready Glasses
  function getWhatsAppReadyUrl(order: OptometryLabOrder) {
    if (!order.optometry_patients?.phone) return '#'
    const cleanPhone = order.optometry_patients.phone.replace(/\D/g, '')
    const pendingBalance = Number(order.total_price) - Number(order.advance_payment)
    const msg = encodeURIComponent(
      `¡Hola ${order.optometry_patients.full_name}! 👓 Te saludamos de la Óptica. Te informamos que tus gafas con montura *${order.frame_model}* y lentes *${order.treatments}* (Orden #${order.order_number}) ya están 100% calibradas y *listas para entrega*. ${pendingBalance > 0 ? `Saldo pendiente: *${formatCurrency(pendingBalance)}*.` : 'Saldo completamente cancelado.'} ¡Te esperamos para el ajuste personalizado!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // WhatsApp URL for Annual Checkup Reminder
  function getWhatsAppCheckupReminderUrl(patient: OptometryPatient) {
    if (!patient.phone) return '#'
    const cleanPhone = patient.phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `¡Hola ${patient.full_name}! 👁️ Te saludamos de la Óptica. Ha transcurrido 1 año desde tu última valoración visual. Recuerda que la salud visual preventiva es clave para evitar fatiga ocular. ¿Deseas agendar tu examen visual con nosotros esta semana?`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // Seed Demo Data for Optometry
  async function handleSeedOptometryDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Patients
      const demoPatients = [
        {
          tenant_id: tenantId,
          patient_number: 'OPT-0021',
          full_name: 'Dr. David Ramírez',
          id_number: '1035678901',
          phone: '3127894561',
          email: 'david@medicos.com',
          occupation: 'Cirujano / Uso de lupas quirúrgicas',
          notes: 'Miopía progresiva, requiere alto índice antirreflejo'
        },
        {
          tenant_id: tenantId,
          patient_number: 'OPT-0022',
          full_name: 'Mariana Duque',
          id_number: '1020345678',
          phone: '3156781234',
          email: 'mariana.duque@diseno.com',
          occupation: 'Diseñadora Gráfica / Pantallas 10h al día',
          notes: 'Fatiga visual frecuente al final de la tarde'
        },
        {
          tenant_id: tenantId,
          patient_number: 'OPT-0023',
          full_name: 'Héctor Fabio Morales',
          id_number: '71654321',
          phone: '3109876543',
          email: 'hector@transporte.com',
          occupation: 'Conductor Intermunicipal',
          notes: 'Requiere lentes polarizados fotocromáticos para carretera'
        }
      ]
      const { data: createdPatients } = await supabase.from('optometry_patients').insert(demoPatients).select()

      const p1 = createdPatients?.[0]
      const p2 = createdPatients?.[1]
      const p3 = createdPatients?.[2]

      // 2. Prescriptions
      if (p1 && p2 && p3) {
        const { data: createdPrescs } = await supabase.from('optometry_prescriptions').insert([
          {
            tenant_id: tenantId,
            patient_id: p1.id,
            optometrist_name: 'Dra. Valeria Gómez (Optómetra ULS)',
            exam_date: new Date().toISOString().split('T')[0],
            od_sphere: -3.25,
            od_cylinder: -1.25,
            od_axis: 180,
            od_add: 0.00,
            os_sphere: -3.00,
            os_cylinder: -1.50,
            os_axis: 170,
            os_add: 0.00,
            pupillary_distance_dp: 64.0,
            lens_type_recommended: 'Monofocal Digital Alto Índice 1.67',
            filter_recommended: 'Antirreflejo Crizal Sapphire + Blue UV400',
            diagnosis: 'Miopía y Astigmatismo Miópico Compuesto Moderado',
            next_checkup_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          {
            tenant_id: tenantId,
            patient_id: p2.id,
            optometrist_name: 'Dra. Valeria Gómez (Optómetra ULS)',
            exam_date: new Date().toISOString().split('T')[0],
            od_sphere: -1.00,
            od_cylinder: -0.50,
            od_axis: 90,
            od_add: 0.00,
            os_sphere: -0.75,
            os_cylinder: -0.50,
            os_axis: 85,
            os_add: 0.00,
            pupillary_distance_dp: 61.5,
            lens_type_recommended: 'Monofocal Digital Blue Control',
            filter_recommended: 'Filtro Luz Azul Blue Protect + Antirreflejo',
            diagnosis: 'Astigmatismo Leve y Fatiga Acomodativa por Pantallas',
            next_checkup_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          {
            tenant_id: tenantId,
            patient_id: p3.id,
            optometrist_name: 'Dra. Valeria Gómez (Optómetra ULS)',
            exam_date: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            od_sphere: 1.50,
            od_cylinder: -0.75,
            od_axis: 45,
            od_add: 2.25,
            os_sphere: 1.25,
            os_cylinder: -0.50,
            os_axis: 135,
            os_add: 2.25,
            pupillary_distance_dp: 65.0,
            lens_type_recommended: 'Progresivo Multifocal Digital HD',
            filter_recommended: 'Fotocromático Transitions Gen 8 + Polarizado',
            diagnosis: 'Presbicia y Astigmatismo Hipermetrópico',
            next_checkup_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ]).select()

        const pr1 = createdPrescs?.[0]
        const pr2 = createdPrescs?.[1]

        // 3. Lab Orders
        if (pr1 && pr2) {
          await supabase.from('optometry_lab_orders').insert([
            {
              tenant_id: tenantId,
              order_number: 'LAB-1091',
              patient_id: p1.id,
              prescription_id: pr1.id,
              frame_model: 'Montura Oakley Holbrook Titanio Negro',
              frame_type: 'Aro Completo Titanio',
              lens_material: 'Alto Índice 1.67',
              treatments: 'Antirreflejo Crizal Sapphire + Blue UV400',
              lab_name: 'Laboratorio Óptico Servilentes',
              promised_delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              total_price: 490000,
              advance_payment: 250000,
              status: 'in_lab'
            },
            {
              tenant_id: tenantId,
              order_number: 'LAB-1092',
              patient_id: p2.id,
              prescription_id: pr2.id,
              frame_model: 'Montura Vogue Eyewear Carey Dorada',
              frame_type: 'Acetato Fino',
              lens_material: 'Policarbonato 1.59',
              treatments: 'Blue Block Digital + Antirreflejo Verde',
              lab_name: 'Laboratorio Óptico Servilentes',
              promised_delivery_date: new Date().toISOString().split('T')[0],
              total_price: 340000,
              advance_payment: 340000,
              status: 'ready_for_pickup'
            }
          ])
        }

        // 4. Frames Catalog
        await supabase.from('optometry_frames_catalog').insert([
          { tenant_id: tenantId, sku: 'MON-RAY-3025', brand: 'Ray-Ban', model: 'Aviator Classic RB3025', color: 'Dorado / Arista', material: 'Metal', caliber_bridge_rod: '58-14-135', cost: 190000, price: 380000, stock: 5 },
          { tenant_id: tenantId, sku: 'MON-OAK-9102', brand: 'Oakley', model: 'Holbrook Matte Black', color: 'Negro Mate', material: 'O Matter / Acetato', caliber_bridge_rod: '55-18-137', cost: 220000, price: 420000, stock: 3 },
          { tenant_id: tenantId, sku: 'MON-VOG-5211', brand: 'Vogue Eyewear', model: 'Cat Eye Chic', color: 'Carey Habana', material: 'Acetato Italiano', caliber_bridge_rod: '52-17-140', cost: 140000, price: 290000, stock: 4 },
          { tenant_id: tenantId, sku: 'MON-CAR-2030', brand: 'Carolina Herrera', model: 'Elegance Titanium', color: 'Oro Rosa', material: 'Titanio Puro', caliber_bridge_rod: '51-16-135', cost: 280000, price: 560000, stock: 2 }
        ])
      }

      await loadOptometryData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Prescriptions
  const filteredPrescriptions = prescriptions.filter(pr => {
    const q = searchQuery.toLowerCase()
    return (
      (pr.optometry_patients?.full_name || '').toLowerCase().includes(q) ||
      (pr.optometry_patients?.id_number || '').toLowerCase().includes(q) ||
      (pr.diagnosis || '').toLowerCase().includes(q) ||
      (pr.optometrist_name || '').toLowerCase().includes(q)
    )
  })

  // KPIs
  const todayStr = new Date().toISOString().split('T')[0]
  const ordersInLabCount = labOrders.filter(o => o.status === 'in_lab').length
  const ordersReadyCount = labOrders.filter(o => o.status === 'ready_for_pickup').length
  const totalRevenue = labOrders.reduce((acc, o) => acc + Number(o.total_price), 0)

  const overdueCheckupsCount = patients.filter(p => {
    const patientPrescs = prescriptions.filter(pr => pr.patient_id === p.id)
    if (patientPrescs.length === 0) return true
    const lastExam = patientPrescs[0].exam_date
    const daysSince = Math.round((new Date().getTime() - new Date(lastExam).getTime()) / (1000 * 60 * 60 * 24))
    return daysSince > 365
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glasses size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Óptica & Consultorio Visual
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Fórmulas oftalmológicas OD/OI, órdenes de laboratorio de biselado, catálogo de monturas y avisos WhatsApp
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadOptometryData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {patients.length === 0 && (
            <button onClick={handleSeedOptometryDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Datos Demo de Óptica
            </button>
          )}
          {activeTab === 'patients' && (
            <button onClick={() => setShowPatientModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Registrar Paciente</span>
            </button>
          )}
          {activeTab === 'prescriptions' && (
            <button
              onClick={() => {
                if (patients.length === 0) return alert('Primero registra un paciente')
                setPrescriptionForm(f => ({ ...f, patient_id: patients[0].id }))
                setShowPrescriptionModal(true)
              }}
              className="btn-neu btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} strokeWidth={2} />
              <span>Nuevo Examen Visual</span>
            </button>
          )}
          {activeTab === 'frames' && (
            <button onClick={() => setShowFrameModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Registrar Montura</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards - Monochrome */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pacientes Registrados
            </span>
            <Users size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {patients.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {prescriptions.length} refracciones realizadas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              En Laboratorio
            </span>
            <Activity size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {ordersInLabCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Gafas en proceso técnico
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Listas para Entrega
            </span>
            <CheckCircle2 size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {ordersReadyCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Avisar por WhatsApp
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Controles Pendientes
            </span>
            <Clock size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {overdueCheckupsCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Fidelización & chequeos
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Monochrome */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'prescriptions' ? 700 : 500,
            background: activeTab === 'prescriptions' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'prescriptions' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Eye size={15} strokeWidth={2} />
          <span>Fórmulas & Exámenes Visuales ({prescriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lab_orders')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'lab_orders' ? 700 : 500,
            background: activeTab === 'lab_orders' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'lab_orders' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Activity size={15} strokeWidth={2} />
          <span>Órdenes de Laboratorio & Taller ({labOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('patients')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'patients' ? 700 : 500,
            background: activeTab === 'patients' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'patients' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Users size={15} strokeWidth={2} />
          <span>Directorio de Pacientes ({patients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('frames')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'frames' ? 700 : 500,
            background: activeTab === 'frames' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'frames' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Glasses size={15} strokeWidth={2} />
          <span>Catálogo de Monturas ({frames.length})</span>
        </button>
      </div>

      {/* ── TAB 1: FÓRMULAS & EXÁMENES VISUALES ── */}
      {activeTab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search Bar */}
          <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 420, padding: '6px 12px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por paciente, cédula o diagnóstico..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            />
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Eye size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay fórmulas visuales registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Realiza el primer examen optométrico para emitir la fórmula clínica.
              </p>
              <button
                onClick={() => {
                  if (patients.length === 0) return alert('Primero registra un paciente')
                  setPrescriptionForm(f => ({ ...f, patient_id: patients[0].id }))
                  setShowPrescriptionModal(true)
                }}
                className="btn-neu btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.82rem' }}
              >
                + Registrar primer examen visual
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
              {filteredPrescriptions.map(presc => (
                <div key={presc.id} className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '4px solid var(--accent-blue)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {presc.optometry_patients?.full_name || 'Paciente'}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        CC: {presc.optometry_patients?.id_number} • Historia: <span style={{ fontFamily: 'monospace' }}>{presc.optometry_patients?.patient_number}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginTop: 2, fontWeight: 700 }}>
                        {presc.optometrist_name} • Fecha: {formatDate(presc.exam_date)}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, background: 'var(--bg-deep)', color: 'var(--accent-purple)', fontWeight: 800 }}>
                      DP: {presc.pupillary_distance_dp} mm
                    </span>
                  </div>

                  {/* Refraction Table (OD / OI) */}
                  <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '3px 4px' }}>Ojo</th>
                          <th style={{ padding: '3px 4px' }}>Esfera (S)</th>
                          <th style={{ padding: '3px 4px' }}>Cilindro (C)</th>
                          <th style={{ padding: '3px 4px' }}>Eje (A°)</th>
                          <th style={{ padding: '3px 4px' }}>Adición</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px dashed var(--border-color)', fontWeight: 700 }}>
                          <td style={{ textAlign: 'left', padding: '5px 4px', color: 'var(--accent-blue)' }}>OD (Derecho)</td>
                          <td style={{ padding: '5px 4px' }}>{presc.od_sphere > 0 ? `+${presc.od_sphere}` : presc.od_sphere}</td>
                          <td style={{ padding: '5px 4px' }}>{presc.od_cylinder}</td>
                          <td style={{ padding: '5px 4px' }}>{presc.od_axis}°</td>
                          <td style={{ padding: '5px 4px' }}>{presc.od_add > 0 ? `+${presc.od_add}` : '--'}</td>
                        </tr>
                        <tr style={{ fontWeight: 700 }}>
                          <td style={{ textAlign: 'left', padding: '5px 4px', color: 'var(--accent-purple)' }}>OI (Izquierdo)</td>
                          <td style={{ padding: '5px 4px' }}>{presc.os_sphere > 0 ? `+${presc.os_sphere}` : presc.os_sphere}</td>
                          <td style={{ padding: '5px 4px' }}>{presc.os_cylinder}</td>
                          <td style={{ padding: '5px 4px' }}>{presc.os_axis}°</td>
                          <td style={{ padding: '5px 4px' }}>{presc.os_add > 0 ? `+${presc.os_add}` : '--'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Recommendations & Diagnosis */}
                  <div style={{ fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Diagnóstico: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{presc.diagnosis}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Recomendación: </span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{presc.lens_type_recommended} • {presc.filter_recommended}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      onClick={() => setSelectedPrescriptionForPrint(presc)}
                      className="btn-neu"
                      style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <Printer size={13} />
                      <span>Imprimir Fórmula</span>
                    </button>

                    <button
                      onClick={() => setShowLabOrderModal(presc)}
                      className="btn-neu btn-primary"
                      style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <Plus size={13} />
                      <span>Enviar a Laboratorio</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ÓRDENES DE LABORATORIO & TALLER ── */}
      {activeTab === 'lab_orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {labOrders.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Activity size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay órdenes en laboratorio</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Envía órdenes de tallado y biselado desde las fórmulas oftalmológicas.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {labOrders.map(order => {
                const isReady = order.status === 'ready_for_pickup'
                const isDelivered = order.status === 'delivered'
                const statusText = isDelivered ? 'Entregado' : isReady ? 'Listo para Entrega' : 'En Laboratorio'
                const pendingBalance = Number(order.total_price) - Number(order.advance_payment)

                return (
                  <div key={order.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{order.order_number}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({order.lab_name})</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                          {order.optometry_patients?.full_name}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Frame & Lens Details */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Montura: </span>
                        <strong>{order.frame_model}</strong> ({order.frame_type})
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Lentes: </span>
                        <span>{order.lens_material} • {order.treatments}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Entrega Prometida: {formatDate(order.promised_delivery_date)}
                      </div>
                    </div>

                    {/* Financial balance */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Total</span>
                        <strong>{formatCurrency(Number(order.total_price))}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Abono</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(Number(order.advance_payment))}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Saldo</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(pendingBalance)}
                        </strong>
                      </div>
                    </div>

                    {/* Status actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {order.status === 'in_lab' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Marcar Listo para Entrega
                        </button>
                      )}

                      {order.status === 'ready_for_pickup' && (
                        <>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="btn-neu btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                          >
                            Entregar al Paciente
                          </button>

                          {order.optometry_patients?.phone && (
                            <a
                              href={getWhatsAppReadyUrl(order)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-neu btn-ghost"
                              title="Avisar por WhatsApp que sus gafas están listas"
                              style={{ padding: '7px 10px' }}
                            >
                              <MessageSquare size={14} strokeWidth={2} />
                            </a>
                          )}
                        </>
                      )}

                      {order.status === 'delivered' && (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Entregado satisfactoriamente
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: DIRECTORIO DE PACIENTES & CONTROL ANUAL ── */}
      {activeTab === 'patients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {patients.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Users size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay pacientes registrados</h3>
              <button onClick={() => setShowPatientModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                Registrar primer paciente
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {patients.map(p => {
                const patientPrescs = prescriptions.filter(pr => pr.patient_id === p.id)
                const lastPresc = patientPrescs[0]
                const daysSinceExam = lastPresc ? Math.round((new Date().getTime() - new Date(lastPresc.exam_date).getTime()) / (1000 * 60 * 60 * 24)) : 999
                const isOverdue = daysSinceExam > 365

                return (
                  <div key={p.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `4px solid ${isOverdue ? 'var(--accent-coral)' : 'var(--accent-green)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{p.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          CC: {p.id_number} • Historia: <span style={{ fontFamily: 'monospace' }}>{p.patient_number}</span>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: isOverdue ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: isOverdue ? 'var(--accent-coral)' : 'var(--accent-green)', fontWeight: 800 }}>
                        {isOverdue ? '🔴 Control Vencido' : '🟢 Al Día'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {p.occupation ? `💼 ${p.occupation}` : ''} {p.phone ? `• Tel: ${p.phone}` : ''}
                    </div>

                    {lastPresc ? (
                      <div style={{ background: 'var(--bg-deep)', padding: 8, borderRadius: 6, fontSize: '0.72rem' }}>
                        <div>Último Examen: <strong>{formatDate(lastPresc.exam_date)}</strong> ({daysSinceExam} días)</div>
                        <div style={{ color: 'var(--accent-blue)', marginTop: 2 }}>{lastPresc.diagnosis}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sin exámenes visuales previos
                      </div>
                    )}

                    {/* Action */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button
                        onClick={() => {
                          setPrescriptionForm(f => ({ ...f, patient_id: p.id }))
                          setShowPrescriptionModal(true)
                        }}
                        className="btn-neu btn-primary"
                        style={{ flex: 1, padding: '6px 8px', fontSize: '0.74rem' }}
                      >
                        + Nuevo Examen
                      </button>

                      {isOverdue && p.phone && (
                        <a
                          href={getWhatsAppCheckupReminderUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-neu"
                          title="Enviar recordatorio de control anual por WhatsApp"
                          style={{ padding: '6px 10px', background: '#16A34A', color: '#fff' }}
                        >
                          <MessageSquare size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CATÁLOGO DE MONTURAS ── */}
      {activeTab === 'frames' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {frames.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👓</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay monturas registradas</h3>
              <button onClick={() => setShowFrameModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Registrar primera montura
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {frames.map(f => (
                <div key={f.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', color: 'var(--accent-blue)', fontWeight: 800 }}>
                        {f.brand}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 4 }}>
                        {f.model}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        SKU: {f.sku} • Color: {f.color}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                        {formatCurrency(Number(f.price))}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: f.stock <= 1 ? 'var(--accent-coral)' : 'var(--text-muted)', fontWeight: 700 }}>
                        Stock: {f.stock} unids
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-deep)', padding: 8, borderRadius: 6, fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Material: <strong>{f.material}</strong></span>
                    <span>Medidas: <strong>{f.caliber_bridge_rod}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: REGISTRAR PACIENTE ── */}
      {showPatientModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                👥 Registrar Paciente de Óptica
              </h2>
              <button onClick={() => setShowPatientModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreatePatient} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre Completo *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Dr. David Ramírez"
                    value={patientForm.full_name}
                    onChange={e => setPatientForm(f => ({ ...f, full_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cédula / DNI *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="1035678901"
                    value={patientForm.id_number}
                    onChange={e => setPatientForm(f => ({ ...f, id_number: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>WhatsApp</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3127894561"
                    value={patientForm.phone}
                    onChange={e => setPatientForm(f => ({ ...f, phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Ocupación / Actividad</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ingeniero / Conductor..."
                    value={patientForm.occupation}
                    onChange={e => setPatientForm(f => ({ ...f, occupation: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Antecedentes / Notas Clínicas</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Usa lentes de contacto, cirugía refractiva previa..."
                  value={patientForm.notes}
                  onChange={e => setPatientForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowPatientModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Registrando...' : 'Registrar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA FÓRMULA OFTALMOLÓGICA ── */}
      {showPrescriptionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                👁️ Nuevo Examen & Fórmula Visual
              </h2>
              <button onClick={() => setShowPrescriptionModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreatePrescription} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Paciente *</label>
                  <select
                    className="input-neu"
                    value={prescriptionForm.patient_id}
                    onChange={e => setPrescriptionForm(f => ({ ...f, patient_id: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} (CC: {p.id_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>DP (mm) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={prescriptionForm.pupillary_distance_dp}
                    onChange={e => setPrescriptionForm(f => ({ ...f, pupillary_distance_dp: Number(e.target.value) }))}
                    step={0.5}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Refraction Matrix Form */}
              <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: 8 }}>
                  OJO DERECHO (OD)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Esfera</label>
                    <input type="number" step={0.25} className="input-neu" value={prescriptionForm.od_sphere} onChange={e => setPrescriptionForm(f => ({ ...f, od_sphere: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Cilindro</label>
                    <input type="number" step={0.25} className="input-neu" value={prescriptionForm.od_cylinder} onChange={e => setPrescriptionForm(f => ({ ...f, od_cylinder: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Eje (°)</label>
                    <input type="number" className="input-neu" value={prescriptionForm.od_axis} onChange={e => setPrescriptionForm(f => ({ ...f, od_axis: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Adición</label>
                    <input type="number" step={0.25} className="input-neu" value={prescriptionForm.od_add} onChange={e => setPrescriptionForm(f => ({ ...f, od_add: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-purple)', margin: '12px 0 8px' }}>
                  OJO IZQUIERDO (OI)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Esfera</label>
                    <input type="number" step={0.25} className="input-neu" value={prescriptionForm.os_sphere} onChange={e => setPrescriptionForm(f => ({ ...f, os_sphere: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Cilindro</label>
                    <input type="number" step={0.25} className="input-neu" value={prescriptionForm.os_cylinder} onChange={e => setPrescriptionForm(f => ({ ...f, os_cylinder: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Eje (°)</label>
                    <input type="number" className="input-neu" value={prescriptionForm.os_axis} onChange={e => setPrescriptionForm(f => ({ ...f, os_axis: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Adición</label>
                    <input type="number" step={0.25} className="input-neu" value={prescriptionForm.os_add} onChange={e => setPrescriptionForm(f => ({ ...f, os_add: Number(e.target.value) }))} style={{ width: '100%', fontSize: '0.78rem', padding: 4 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo de Lente</label>
                  <select
                    className="input-neu"
                    value={prescriptionForm.lens_type_recommended}
                    onChange={e => setPrescriptionForm(f => ({ ...f, lens_type_recommended: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  >
                    <option value="Monofocal Digital HD">Monofocal Digital HD</option>
                    <option value="Progresivo Multifocal Digital">Progresivo Multifocal Digital</option>
                    <option value="Bifocal Flat-Top">Bifocal Flat-Top</option>
                    <option value="Lentes de Contacto Tóricos">Lentes de Contacto Tóricos</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Filtros & Tratamiento</label>
                  <select
                    className="input-neu"
                    value={prescriptionForm.filter_recommended}
                    onChange={e => setPrescriptionForm(f => ({ ...f, filter_recommended: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  >
                    <option value="Antirreflejo + Filtro Azul (Blue UV400)">Antirreflejo + Filtro Azul (Blue Block)</option>
                    <option value="Fotocromático Transitions + Antirreflejo">Fotocromático Transitions + AR</option>
                    <option value="Polarizado HD">Polarizado HD</option>
                    <option value="Antirreflejo Premium Crizal">Antirreflejo Premium Crizal</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Diagnóstico Optométrico</label>
                <input
                  type="text"
                  className="input-neu"
                  value={prescriptionForm.diagnosis}
                  onChange={e => setPrescriptionForm(f => ({ ...f, diagnosis: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowPrescriptionModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Emitir Fórmula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ENVIAR A LABORATORIO ── */}
      {showLabOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🔬 Orden de Taller / Laboratorio
                </h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Paciente: {showLabOrderModal.optometry_patients?.full_name}
                </div>
              </div>
              <button onClick={() => setShowLabOrderModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateLabOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Montura / Armazón *</label>
                <input
                  type="text"
                  className="input-neu"
                  value={labOrderForm.frame_model}
                  onChange={e => setLabOrderForm(f => ({ ...f, frame_model: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Material de Lentes</label>
                  <select
                    className="input-neu"
                    value={labOrderForm.lens_material}
                    onChange={e => setLabOrderForm(f => ({ ...f, lens_material: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  >
                    <option value="Policarbonato 1.59">Policarbonato 1.59</option>
                    <option value="Alto Índice 1.67">Alto Índice 1.67 (Delgado)</option>
                    <option value="CR-39 Orgánico">CR-39 Orgánico</option>
                    <option value="Trivex Alto Impacto">Trivex Alto Impacto</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tratamientos</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={labOrderForm.treatments}
                    onChange={e => setLabOrderForm(f => ({ ...f, treatments: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Fecha Entrega Prometida</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={labOrderForm.promised_delivery_date}
                    onChange={e => setLabOrderForm(f => ({ ...f, promised_delivery_date: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Laboratorio</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={labOrderForm.lab_name}
                    onChange={e => setLabOrderForm(f => ({ ...f, lab_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Total Venta ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={labOrderForm.total_price}
                    onChange={e => setLabOrderForm(f => ({ ...f, total_price: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Abono Inicial ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={labOrderForm.advance_payment}
                    onChange={e => setLabOrderForm(f => ({ ...f, advance_payment: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowLabOrderModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  Crear Orden de Taller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR MONTURA ── */}
      {showFrameModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 460, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                👓 Registrar Montura en Catálogo
              </h2>
              <button onClick={() => setShowFrameModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateFrame} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>SKU *</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={frameForm.sku}
                    onChange={e => setFrameForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem', fontWeight: 800 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Marca *</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={frameForm.brand}
                    onChange={e => setFrameForm(f => ({ ...f, brand: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Modelo *</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={frameForm.model}
                    onChange={e => setFrameForm(f => ({ ...f, model: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Color</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={frameForm.color}
                    onChange={e => setFrameForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Material</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={frameForm.material}
                    onChange={e => setFrameForm(f => ({ ...f, material: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Medidas (Calibre-Puente-Varilla)</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="52-18-140"
                    value={frameForm.caliber_bridge_rod}
                    onChange={e => setFrameForm(f => ({ ...f, caliber_bridge_rod: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Costo ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={frameForm.cost}
                    onChange={e => setFrameForm(f => ({ ...f, cost: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Venta ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={frameForm.price}
                    onChange={e => setFrameForm(f => ({ ...f, price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Stock</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={frameForm.stock}
                    onChange={e => setFrameForm(f => ({ ...f, stock: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowFrameModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  Guardar Montura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPRIMIR FÓRMULA CLÍNICA (PDF / FORMATO) ── */}
      {selectedPrescriptionForPrint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, background: '#fff', color: '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#111' }}>👓 FÓRMULA OPTOMÉTRICA</h2>
                <div style={{ fontSize: '0.75rem', color: '#555' }}>{selectedPrescriptionForPrint.optometrist_name}</div>
              </div>
              <button onClick={() => setSelectedPrescriptionForPrint(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Paciente:</strong> {selectedPrescriptionForPrint.optometry_patients?.full_name}</div>
              <div><strong>Cédula:</strong> {selectedPrescriptionForPrint.optometry_patients?.id_number} • <strong>Historia:</strong> {selectedPrescriptionForPrint.optometry_patients?.patient_number}</div>
              <div><strong>Fecha de Examen:</strong> {formatDate(selectedPrescriptionForPrint.exam_date)} • <strong>DP:</strong> {selectedPrescriptionForPrint.pupillary_distance_dp} mm</div>
            </div>

            {/* Print Table */}
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: 6 }}>Ojo</th>
                  <th style={{ padding: 6 }}>Esfera</th>
                  <th style={{ padding: 6 }}>Cilindro</th>
                  <th style={{ padding: 6 }}>Eje</th>
                  <th style={{ padding: 6 }}>Adición</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>OD (Derecho)</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.od_sphere > 0 ? `+${selectedPrescriptionForPrint.od_sphere}` : selectedPrescriptionForPrint.od_sphere}</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.od_cylinder}</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.od_axis}°</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.od_add > 0 ? `+${selectedPrescriptionForPrint.od_add}` : '--'}</td>
                </tr>
                <tr>
                  <td style={{ padding: 6, fontWeight: 700 }}>OI (Izquierdo)</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.os_sphere > 0 ? `+${selectedPrescriptionForPrint.os_sphere}` : selectedPrescriptionForPrint.os_sphere}</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.os_cylinder}</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.os_axis}°</td>
                  <td style={{ padding: 6 }}>{selectedPrescriptionForPrint.os_add > 0 ? `+${selectedPrescriptionForPrint.os_add}` : '--'}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div><strong>Diagnóstico:</strong> {selectedPrescriptionForPrint.diagnosis}</div>
              <div><strong>Lente Sugerido:</strong> {selectedPrescriptionForPrint.lens_type_recommended}</div>
              <div><strong>Filtro / Tratamiento:</strong> {selectedPrescriptionForPrint.filter_recommended}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #ddd' }}>
              <div style={{ textAlign: 'center', width: 180 }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: 4 }} />
                <div style={{ fontSize: '0.7rem', color: '#555' }}>Firma y Sello Profesional</div>
              </div>

              <button onClick={() => window.print()} className="btn-neu btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={15} />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
