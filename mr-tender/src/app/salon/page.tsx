'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Scissors,
  Calendar,
  Clock,
  UserCheck,
  Sparkles,
  Users,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Phone,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  X,
  FileText,
  HeartPulse,
  Award,
  Layers,
  ChevronRight
} from 'lucide-react'

interface SalonProfessional {
  id: string
  tenant_id: string
  name: string
  specialty: string
  commission_rate: number
  phone?: string | null
  color_tag: string
  is_active: boolean
  created_at: string
}

interface SalonService {
  id: string
  tenant_id: string
  name: string
  category: string
  duration_minutes: number
  price: number
  cost: number
  default_commission_rate: number
  is_active: boolean
  created_at: string
}

interface SalonAppointment {
  id: string
  tenant_id: string
  professional_id?: string | null
  service_id?: string | null
  customer_name: string
  customer_phone?: string | null
  appointment_date: string
  start_time: string
  end_time: string
  service_name: string
  total_price: number
  commission_amount: number
  status: 'scheduled' | 'confirmed' | 'in_chair' | 'completed' | 'cancelled' | 'no_show'
  notes?: string | null
  created_at: string
  salon_professionals?: {
    name: string
    specialty: string
    color_tag: string
  }
}

interface SalonCommission {
  id: string
  tenant_id: string
  professional_id: string
  appointment_id?: string | null
  service_name: string
  total_service_amount: number
  commission_rate: number
  commission_earned: number
  status: 'pending' | 'paid'
  paid_at?: string | null
  payment_reference?: string | null
  created_at: string
  salon_professionals?: {
    name: string
  }
}

interface SalonTechnicalRecord {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone?: string | null
  service_date: string
  professional_name?: string | null
  technical_formula: string
  scalp_condition?: string | null
  allergies?: string | null
  treatment_history?: string | null
  observations?: string | null
  created_at: string
}

export default function SalonPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'agenda' | 'services' | 'staff' | 'records'>('agenda')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [professionals, setProfessionals] = useState<SalonProfessional[]>([])
  const [services, setServices] = useState<SalonService[]>([])
  const [appointments, setAppointments] = useState<SalonAppointment[]>([])
  const [commissions, setCommissions] = useState<SalonCommission[]>([])
  const [records, setRecords] = useState<SalonTechnicalRecord[]>([])

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [filterProfessional, setFilterProfessional] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchRecord, setSearchRecord] = useState<string>('')

  // Modals
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showProfessionalModal, setShowProfessionalModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState<SalonProfessional | null>(null)

  // Forms
  const [appointmentForm, setAppointmentForm] = useState({
    customer_name: '',
    customer_phone: '',
    professional_id: '',
    service_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    notes: 'Corte + peinado'
  })

  const [professionalForm, setProfessionalForm] = useState({
    name: '',
    specialty: 'Estilista / Colorista',
    commission_rate: 45,
    phone: '',
    color_tag: '#8B5CF6'
  })

  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'Peluquería & Barbería',
    duration_minutes: 45,
    price: 35000,
    cost: 5000,
    default_commission_rate: 45
  })

  const [recordForm, setRecordForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_date: new Date().toISOString().split('T')[0],
    professional_name: '',
    technical_formula: 'Igora Royal 8.1 (45g) + 9.0 (15g) + Peróxido 20 Vol (60ml) + Plex',
    scalp_condition: 'Normal',
    allergies: 'Sin alergias reportadas',
    treatment_history: 'Balayage previo hace 6 meses',
    observations: 'Cabello poroso en puntas. Recomendar mascarilla de nutrición.'
  })

  useEffect(() => {
    loadSalonData()
  }, [])

  async function loadSalonData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [pRes, sRes, aRes, cRes, rRes] = await Promise.all([
        supabase.from('salon_professionals').select('*').eq('tenant_id', tid).order('name', { ascending: true }),
        supabase.from('salon_services').select('*').eq('tenant_id', tid).order('category', { ascending: true }).order('name', { ascending: true }),
        supabase.from('salon_appointments').select('*, salon_professionals(name, specialty, color_tag)').eq('tenant_id', tid).order('start_time', { ascending: true }),
        supabase.from('salon_commissions').select('*, salon_professionals(name)').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('salon_technical_records').select('*').eq('tenant_id', tid).order('service_date', { ascending: false })
      ])

      setProfessionals(pRes.data || [])
      setServices(sRes.data || [])
      setAppointments((aRes.data as any) || [])
      setCommissions((cRes.data as any) || [])
      setRecords(rRes.data || [])
    } catch (err) {
      console.error('Error loading salon data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate end time based on start_time and duration
  function calculateEndTime(startTimeStr: string, durationMin: number) {
    const [hh, mm] = startTimeStr.split(':').map(Number)
    const totalMinutes = hh * 60 + mm + durationMin
    const endH = Math.floor(totalMinutes / 60) % 24
    const endM = totalMinutes % 60
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  }

  // Handle Create Appointment
  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!appointmentForm.customer_name.trim()) return alert('Ingresa el nombre del cliente')

    setSubmitting(true)
    try {
      const selectedService = services.find(s => s.id === appointmentForm.service_id)
      const selectedProf = professionals.find(p => p.id === appointmentForm.professional_id)

      const serviceName = selectedService ? selectedService.name : 'Servicio General'
      const duration = selectedService ? selectedService.duration_minutes : 45
      const price = selectedService ? Number(selectedService.price) : 25000
      const commRate = selectedProf ? Number(selectedProf.commission_rate) : (selectedService ? Number(selectedService.default_commission_rate) : 40)
      const commAmount = (price * commRate) / 100
      const endTime = calculateEndTime(appointmentForm.start_time, duration)

      const payload = {
        tenant_id: tenantId,
        professional_id: appointmentForm.professional_id || null,
        service_id: appointmentForm.service_id || null,
        customer_name: appointmentForm.customer_name.trim(),
        customer_phone: appointmentForm.customer_phone.trim() || null,
        appointment_date: appointmentForm.appointment_date,
        start_time: appointmentForm.start_time,
        end_time: endTime,
        service_name: serviceName,
        total_price: price,
        commission_amount: commAmount,
        status: 'scheduled',
        notes: appointmentForm.notes || null
      }

      const { error } = await supabase.from('salon_appointments').insert(payload)
      if (error) throw error

      setShowAppointmentModal(false)
      setAppointmentForm({
        customer_name: '',
        customer_phone: '',
        professional_id: professionals[0]?.id || '',
        service_id: services[0]?.id || '',
        appointment_date: selectedDate,
        start_time: '10:00',
        notes: ''
      })
      await loadSalonData()
    } catch (err: any) {
      alert(err.message || 'Error al agendar cita')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Appointment Status & Liquidate Commission if Completed
  async function handleUpdateAppointmentStatus(apt: SalonAppointment, newStatus: 'confirmed' | 'in_chair' | 'completed' | 'cancelled') {
    try {
      // 1. Update appointment status
      const { error } = await supabase
        .from('salon_appointments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', apt.id)
      if (error) throw error

      // 2. If status is 'completed', record commission for professional
      if (newStatus === 'completed' && apt.professional_id) {
        const prof = professionals.find(p => p.id === apt.professional_id)
        const rate = prof ? Number(prof.commission_rate) : 40
        const earned = (Number(apt.total_price) * rate) / 100

        await supabase.from('salon_commissions').insert({
          tenant_id: tenantId,
          professional_id: apt.professional_id,
          appointment_id: apt.id,
          service_name: apt.service_name,
          total_service_amount: Number(apt.total_price),
          commission_rate: rate,
          commission_earned: earned,
          status: 'pending'
        })
      }

      await loadSalonData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Payout / Liquidate Commissions for a Professional
  async function handlePayoutCommissions(profId: string) {
    if (!confirm('¿Confirmar pago y liquidación de todas las comisiones pendientes de este profesional?')) return
    try {
      const { error } = await supabase
        .from('salon_commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: `LIQ-${Date.now().toString().slice(-6)}`
        })
        .eq('professional_id', profId)
        .eq('status', 'pending')

      if (error) throw error
      setShowPayoutModal(null)
      await loadSalonData()
      alert('Comisiones liquidadas con éxito')
    } catch (err: any) {
      alert('Error al liquidar comisiones: ' + err.message)
    }
  }

  // Handle Create Professional
  async function handleCreateProfessional(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!professionalForm.name.trim()) return alert('Ingresa el nombre del profesional')

    setSubmitting(true)
    try {
      const { error } = await supabase.from('salon_professionals').insert({
        tenant_id: tenantId,
        name: professionalForm.name.trim(),
        specialty: professionalForm.specialty,
        commission_rate: Number(professionalForm.commission_rate),
        phone: professionalForm.phone || null,
        color_tag: professionalForm.color_tag,
        is_active: true
      })
      if (error) throw error
      setShowProfessionalModal(false)
      setProfessionalForm({
        name: '',
        specialty: 'Estilista / Colorista',
        commission_rate: 45,
        phone: '',
        color_tag: '#8B5CF6'
      })
      await loadSalonData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar profesional')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Create Service
  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!serviceForm.name.trim()) return alert('Ingresa el nombre del servicio')

    setSubmitting(true)
    try {
      const { error } = await supabase.from('salon_services').insert({
        tenant_id: tenantId,
        name: serviceForm.name.trim(),
        category: serviceForm.category,
        duration_minutes: Number(serviceForm.duration_minutes),
        price: Number(serviceForm.price),
        cost: Number(serviceForm.cost),
        default_commission_rate: Number(serviceForm.default_commission_rate),
        is_active: true
      })
      if (error) throw error
      setShowServiceModal(false)
      setServiceForm({
        name: '',
        category: 'Peluquería & Barbería',
        duration_minutes: 45,
        price: 35000,
        cost: 5000,
        default_commission_rate: 45
      })
      await loadSalonData()
    } catch (err: any) {
      alert(err.message || 'Error al crear servicio')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Create Technical Record
  async function handleCreateTechnicalRecord(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!recordForm.customer_name.trim()) return alert('Ingresa el nombre del cliente')

    setSubmitting(true)
    try {
      const { error } = await supabase.from('salon_technical_records').insert({
        tenant_id: tenantId,
        customer_name: recordForm.customer_name.trim(),
        customer_phone: recordForm.customer_phone.trim() || null,
        service_date: recordForm.service_date,
        professional_name: recordForm.professional_name || null,
        technical_formula: recordForm.technical_formula,
        scalp_condition: recordForm.scalp_condition || null,
        allergies: recordForm.allergies || null,
        treatment_history: recordForm.treatment_history || null,
        observations: recordForm.observations || null
      })
      if (error) throw error
      setShowRecordModal(false)
      setRecordForm({
        customer_name: '',
        customer_phone: '',
        service_date: new Date().toISOString().split('T')[0],
        professional_name: '',
        technical_formula: '',
        scalp_condition: 'Normal',
        allergies: 'Ninguna',
        treatment_history: '',
        observations: ''
      })
      await loadSalonData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar ficha técnica')
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Reminder Link Generator
  function getWhatsAppReminderUrl(apt: SalonAppointment) {
    if (!apt.customer_phone) return '#'
    const cleanPhone = apt.customer_phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `¡Hola ${apt.customer_name}! 💇‍♀️ Te recordamos tu cita en el Salón para *${apt.service_name}* hoy ${formatDate(apt.appointment_date)} a las *${apt.start_time}*. ¡Te esperamos!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // Seed Demo Data for Beauty Salon
  async function handleSeedSalonDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Staff
      const demoStaff = [
        { tenant_id: tenantId, name: 'Valeria Gómez', specialty: 'Colorista Máster & Balayage', commission_rate: 50, phone: '3124567890', color_tag: '#EC4899' },
        { tenant_id: tenantId, name: 'Mateo Osorio', specialty: 'Barbero Profesional & Fade', commission_rate: 45, phone: '3158901234', color_tag: '#3B82F6' },
        { tenant_id: tenantId, name: 'Camila Restrepo', specialty: 'Manicurista & Diseños Semipermanentes', commission_rate: 40, phone: '3207654321', color_tag: '#10B981' }
      ]
      const { data: createdStaff } = await supabase.from('salon_professionals').insert(demoStaff).select()

      // 2. Services
      const demoServices = [
        { tenant_id: tenantId, name: 'Balayage Premium + Matiz + Hidratación', category: 'Colorimetría & Alisados', duration_minutes: 180, price: 280000, cost: 45000, default_commission_rate: 50 },
        { tenant_id: tenantId, name: 'Corte Caballero Clásico / Fade + Barba Spa', category: 'Peluquería & Barbería', duration_minutes: 45, price: 35000, cost: 4000, default_commission_rate: 45 },
        { tenant_id: tenantId, name: 'Manicure Ruso + Esmaltado Semipermanente', category: 'Uñas, Manicure & Pedicure', duration_minutes: 60, price: 55000, cost: 8000, default_commission_rate: 40 },
        { tenant_id: tenantId, name: 'Alisado Orgánico de Keratina Brasileña', category: 'Colorimetría & Alisados', duration_minutes: 150, price: 220000, cost: 35000, default_commission_rate: 45 },
        { tenant_id: tenantId, name: 'Limpieza Facial Profunda + Mascarilla Led', category: 'Estética & Spa', duration_minutes: 60, price: 90000, cost: 12000, default_commission_rate: 40 }
      ]
      const { data: createdServices } = await supabase.from('salon_services').insert(demoServices).select()

      const staff1 = createdStaff?.[0]
      const staff2 = createdStaff?.[1]
      const staff3 = createdStaff?.[2]

      // 3. Appointments for Today
      const todayStr = new Date().toISOString().split('T')[0]
      const demoAppointments = [
        {
          tenant_id: tenantId,
          professional_id: staff1?.id,
          customer_name: 'Daniela Salazar',
          customer_phone: '3109876543',
          appointment_date: todayStr,
          start_time: '09:30',
          end_time: '12:30',
          service_name: 'Balayage Premium + Matiz + Hidratación',
          total_price: 280000,
          commission_amount: 140000,
          status: 'in_chair',
          notes: 'Tono miel / Cabello largo y abundante'
        },
        {
          tenant_id: tenantId,
          professional_id: staff2?.id,
          customer_name: 'Alejandro Morales',
          customer_phone: '3187654321',
          appointment_date: todayStr,
          start_time: '11:00',
          end_time: '11:45',
          service_name: 'Corte Caballero Clásico / Fade + Barba Spa',
          total_price: 35000,
          commission_amount: 15750,
          status: 'confirmed',
          notes: 'Fade medio con toalla caliente'
        },
        {
          tenant_id: tenantId,
          professional_id: staff3?.id,
          customer_name: 'Mariana Pérez',
          customer_phone: '3001234567',
          appointment_date: todayStr,
          start_time: '14:00',
          end_time: '15:00',
          service_name: 'Manicure Ruso + Esmaltado Semipermanente',
          total_price: 55000,
          commission_amount: 22000,
          status: 'scheduled',
          notes: 'Diseño floral en uñas índice'
        }
      ]
      await supabase.from('salon_appointments').insert(demoAppointments)

      // 4. Technical Records
      const demoRecords = [
        {
          tenant_id: tenantId,
          customer_name: 'Daniela Salazar',
          customer_phone: '3109876543',
          service_date: todayStr,
          professional_name: 'Valeria Gómez',
          technical_formula: 'Decolorante Blondme + 20 Vol (1:2) + Matiz Igora Vibrance 9.5-1 (30g) + 9-1 (10g) con Activador Gel 1.9%',
          scalp_condition: 'Sensible',
          allergies: 'Sensible al peróxido directo en raíz',
          treatment_history: 'Decoloración previa en puntas',
          observations: 'Se aplicó protector Olaplex No. 1. Dejar tiempo de pose máximo 40 min.'
        }
      ]
      await supabase.from('salon_technical_records').insert(demoRecords)

      await loadSalonData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Appointments
  const filteredAppointments = appointments.filter(a => {
    const matchDate = a.appointment_date === selectedDate
    const matchProf = filterProfessional === 'all' || a.professional_id === filterProfessional
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchDate && matchProf && matchStatus
  })

  // Filtered Technical Records
  const filteredRecords = records.filter(r => {
    const q = searchRecord.toLowerCase()
    return r.customer_name.toLowerCase().includes(q) || (r.customer_phone || '').includes(q) || r.technical_formula.toLowerCase().includes(q)
  })

  // KPIs
  const todayAppointments = appointments.filter(a => a.appointment_date === selectedDate)
  const inChairCount = todayAppointments.filter(a => a.status === 'in_chair').length
  const completedToday = todayAppointments.filter(a => a.status === 'completed')
  const totalSalesToday = completedToday.reduce((acc, a) => acc + Number(a.total_price), 0)
  const pendingCommissionsTotal = commissions.filter(c => c.status === 'pending').reduce((acc, c) => acc + Number(c.commission_earned), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scissors size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Salón de Belleza, Barbería & Spa
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Agenda visual de citas, control de turnos en silla, comisiones a estilistas/barberos y fichas técnicas de colorimetría
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadSalonData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {professionals.length === 0 && (
            <button onClick={handleSeedSalonDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Datos Demo de Salón
            </button>
          )}
          {activeTab === 'agenda' && (
            <button onClick={() => { setShowAppointmentModal(true); setAppointmentForm(f => ({ ...f, appointment_date: selectedDate, professional_id: professionals[0]?.id || '', service_id: services[0]?.id || '' })) }} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Agendar Nueva Cita</span>
            </button>
          )}
          {activeTab === 'services' && (
            <button onClick={() => setShowServiceModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Servicio</span>
            </button>
          )}
          {activeTab === 'staff' && (
            <button onClick={() => setShowProfessionalModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Estilista / Barbero</span>
            </button>
          )}
          {activeTab === 'records' && (
            <button onClick={() => setShowRecordModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Ficha Técnica</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Citas de la Fecha
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {todayAppointments.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {completedToday.length} completadas ({todayAppointments.length - completedToday.length} pendientes)
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            En Silla / Atención Activa
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {inChairCount} clientes
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Servicios en ejecución en este momento
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Facturación Servicios Fecha
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {formatCurrency(totalSalesToday)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Servicios completados hoy
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Comisiones por Liquidar
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {formatCurrency(pendingCommissionsTotal)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {commissions.filter(c => c.status === 'pending').length} comisiones pendientes de pago
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('agenda')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'agenda' ? 800 : 500,
            background: activeTab === 'agenda' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'agenda' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Calendar size={15} />
          <span>Agenda de Citas & Turnos ({todayAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'services' ? 800 : 500,
            background: activeTab === 'services' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'services' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Scissors size={15} />
          <span>Catálogo de Servicios ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'staff' ? 800 : 500,
            background: activeTab === 'staff' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'staff' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Users size={15} />
          <span>Equipo & Comisiones ({professionals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'records' ? 800 : 500,
            background: activeTab === 'records' ? 'var(--accent-purple)' : 'var(--bg)',
            color: activeTab === 'records' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <HeartPulse size={15} />
          <span>Fichas Técnicas & Colorimetría ({records.length})</span>
        </button>
      </div>

      {/* ── TAB 1: AGENDA DE CITAS & TURNOS ── */}
      {activeTab === 'agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Filters Bar: Date Picker, Staff Filter, Status Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: 10 }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Fecha</label>
              <input
                type="date"
                className="input-neu"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '5px 8px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Estilista / Barbero</label>
              <select
                className="input-neu"
                value={filterProfessional}
                onChange={e => setFilterProfessional(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '5px 8px' }}
              >
                <option value="all">Todos los profesionales</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Estado</label>
              <select
                className="input-neu"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '5px 8px' }}
              >
                <option value="all">Todos los estados</option>
                <option value="scheduled">🔵 Agendadas</option>
                <option value="confirmed">🟢 Confirmadas</option>
                <option value="in_chair">🟡 En Silla (En atención)</option>
                <option value="completed">✅ Completadas</option>
                <option value="cancelled">🔴 Canceladas</option>
              </select>
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📅</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay citas agendadas para esta fecha</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Agenda la primera cita para asignar horario, profesional y calcular la comisión.
              </p>
              <button onClick={() => setShowAppointmentModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Agendar cita
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {filteredAppointments.map(apt => {
                const isScheduled = apt.status === 'scheduled'
                const isConfirmed = apt.status === 'confirmed'
                const isInChair = apt.status === 'in_chair'
                const isCompleted = apt.status === 'completed'
                const isCancelled = apt.status === 'cancelled'

                const statusColor = isScheduled ? 'var(--accent-blue)'
                  : isConfirmed ? 'var(--accent-green)'
                  : isInChair ? 'var(--accent-amber)'
                  : isCompleted ? 'var(--accent-purple)'
                  : 'var(--accent-coral)'

                const statusText = isScheduled ? '🔵 Agendada'
                  : isConfirmed ? '🟢 Confirmada'
                  : isInChair ? '🟡 En Silla'
                  : isCompleted ? '✅ Completada'
                  : '🔴 Cancelada'

                return (
                  <div
                    key={apt.id}
                    className="neu-card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      borderTop: `4px solid ${statusColor}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            {apt.start_time} - {apt.end_time}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(apt.appointment_date)}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Customer & Service Info */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {apt.customer_name}
                        </div>
                        {apt.customer_phone && (
                          <a
                            href={getWhatsAppReminderUrl(apt)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-neu btn-ghost"
                            title="Enviar recordatorio WhatsApp"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                          >
                            <MessageSquare size={13} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
                        {apt.service_name}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Estilista: <strong>{apt.salon_professionals?.name || 'Por asignar'}</strong>
                        </span>
                        <span style={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                          {formatCurrency(Number(apt.total_price))}
                        </span>
                      </div>
                    </div>

                    {apt.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{apt.notes}"
                      </div>
                    )}

                    {/* State Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {isScheduled && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt, 'confirmed')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-green)', fontWeight: 700 }}
                        >
                          Confirmar Cita
                        </button>
                      )}

                      {(isScheduled || isConfirmed) && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt, 'in_chair')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <Scissors size={13} />
                          <span>Pasar a Silla</span>
                        </button>
                      )}

                      {isInChair && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt, 'completed')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', background: 'var(--accent-green)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Completar & Liquidar Comisión</span>
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt, 'cancelled')}
                          className="btn-neu btn-ghost"
                          title="Cancelar cita"
                          style={{ padding: '7px 10px', fontSize: '0.72rem', color: 'var(--accent-coral)' }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CATÁLOGO DE SERVICIOS & TIEMPOS ── */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {services.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✂️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay servicios en el catálogo</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra cortes, peinados, alisados, tintes, uñas y masajes con su duración y comisión.
              </p>
              <button onClick={() => setShowServiceModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primer servicio
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {services.map(s => {
                const profit = Number(s.price) - Number(s.cost)
                const marginPercent = s.price > 0 ? Math.round((profit / s.price) * 100) : 0

                return (
                  <div key={s.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 800, background: 'var(--bg-deep)', color: 'var(--accent-purple)' }}>
                          {s.category}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 4 }}>
                          {s.name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                          {formatCurrency(Number(s.price))}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ⏱️ {s.duration_minutes} min
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Comisión Estilista:</span>
                        <div style={{ fontWeight: 800, color: 'var(--accent-purple)' }}>
                          {s.default_commission_rate}% ({formatCurrency((Number(s.price) * Number(s.default_commission_rate)) / 100)})
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Margen Ganancia:</span>
                        <div style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                          {marginPercent}% (+{formatCurrency(profit)})
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: EQUIPO DE ESTILISTAS & COMISIONES ── */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {professionals.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👥</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay profesionales registrados</h3>
              <button onClick={() => setShowProfessionalModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Registrar primer estilista / barbero
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {professionals.map(p => {
                const staffCommissions = commissions.filter(c => c.professional_id === p.id)
                const pendingCommissions = staffCommissions.filter(c => c.status === 'pending')
                const pendingTotal = pendingCommissions.reduce((acc, c) => acc + Number(c.commission_earned), 0)
                const paidTotal = staffCommissions.filter(c => c.status === 'paid').reduce((acc, c) => acc + Number(c.commission_earned), 0)

                return (
                  <div key={p.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: `5px solid ${p.color_tag || 'var(--accent-purple)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.specialty}</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)' }}>
                        {p.commission_rate}% Comisión
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Por Liquidar</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-coral)' }}>{formatCurrency(pendingTotal)}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{pendingCommissions.length} servicios pendientes</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pagado Acumulado</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-green)' }}>{formatCurrency(paidTotal)}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Histórico al día</div>
                      </div>
                    </div>

                    {pendingTotal > 0 && (
                      <button
                        onClick={() => handlePayoutCommissions(p.id)}
                        className="btn-neu btn-primary"
                        style={{ padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <DollarSign size={14} />
                        <span>Liquidar Comisiones ({formatCurrency(pendingTotal)})</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Recent Commission Movements */}
          {commissions.length > 0 && (
            <div className="neu-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 10 }}>
                📜 Registro de Comisiones Generadas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '250px', overflowY: 'auto' }}>
                {commissions.slice(0, 15).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8, fontSize: '0.78rem' }}>
                    <div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        marginRight: 8,
                        background: c.status === 'paid' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: c.status === 'paid' ? 'var(--accent-green)' : 'var(--accent-coral)'
                      }}>
                        {c.status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                      </span>
                      <strong>{c.salon_professionals?.name}</strong> — {c.service_name} ({formatCurrency(Number(c.total_service_amount))})
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: 'var(--accent-purple)' }}>+{formatCurrency(Number(c.commission_earned))}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.commission_rate}% • {formatDate(c.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: FICHAS TÉCNICAS & COLORIMETRÍA ── */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Search bar */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar ficha por cliente, teléfono o fórmula..."
                value={searchRecord}
                onChange={e => setSearchRecord(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay fichas técnicas registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Guarda las fórmulas exactas de tinte, decoloración, tiempos de pose y alergias para cada cliente.
              </p>
              <button onClick={() => setShowRecordModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primera ficha técnica
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {filteredRecords.map(r => (
                <div key={r.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {r.customer_phone ? `📞 ${r.customer_phone} • ` : ''}Fecha: {formatDate(r.service_date)} {r.professional_name ? `(${r.professional_name})` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>🎨</span>
                  </div>

                  {/* Technical Formula Box */}
                  <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: 2 }}>
                      Fórmula Técnica & Químicos:
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {r.technical_formula}
                    </div>
                  </div>

                  {/* Scalp & Allergies */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.73rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Cuero Cabelludo:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.scalp_condition || 'Normal'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Alergias / Sensibilidad:</span>
                      <div style={{ fontWeight: 600, color: r.allergies && r.allergies !== 'Ninguna' ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                        {r.allergies || 'Ninguna'}
                      </div>
                    </div>
                  </div>

                  {r.treatment_history && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <strong>Historial previo:</strong> {r.treatment_history}
                    </div>
                  )}

                  {r.observations && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{r.observations}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: AGENDAR NUEVA CITA ── */}
      {showAppointmentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📅 Agendar Nueva Cita
              </h2>
              <button onClick={() => setShowAppointmentModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Daniela Salazar"
                    value={appointmentForm.customer_name}
                    onChange={e => setAppointmentForm(f => ({ ...f, customer_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3124567890"
                    value={appointmentForm.customer_phone}
                    onChange={e => setAppointmentForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Servicio a Realizar *</label>
                  <select
                    className="input-neu"
                    value={appointmentForm.service_id}
                    onChange={e => setAppointmentForm(f => ({ ...f, service_id: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m - {formatCurrency(Number(s.price))})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Estilista / Barbero *</label>
                  <select
                    className="input-neu"
                    value={appointmentForm.professional_id}
                    onChange={e => setAppointmentForm(f => ({ ...f, professional_id: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha de Cita</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={appointmentForm.appointment_date}
                    onChange={e => setAppointmentForm(f => ({ ...f, appointment_date: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Hora de Inicio</label>
                  <input
                    type="time"
                    className="input-neu"
                    value={appointmentForm.start_time}
                    onChange={e => setAppointmentForm(f => ({ ...f, start_time: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas o Requerimientos</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Tono específico / Lavado especial"
                  value={appointmentForm.notes}
                  onChange={e => setAppointmentForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowAppointmentModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Agendando...' : 'Confirmar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO SERVICIO ── */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ✂️ Crear Servicio
              </h2>
              <button onClick={() => setShowServiceModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Servicio *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Manicure Semipermanente"
                  value={serviceForm.name}
                  onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Categoría</label>
                  <select
                    className="input-neu"
                    value={serviceForm.category}
                    onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="Peluquería & Barbería">Peluquería & Barbería</option>
                    <option value="Colorimetría & Alisados">Colorimetría & Alisados</option>
                    <option value="Uñas, Manicure & Pedicure">Uñas, Manicure & Pedicure</option>
                    <option value="Estética & Spa">Estética & Spa</option>
                    <option value="Depilación">Depilación</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Duración (Minutos)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={serviceForm.duration_minutes}
                    onChange={e => setServiceForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    step={15}
                    min={15}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={serviceForm.price}
                    onChange={e => setServiceForm(f => ({ ...f, price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Costo Insumos ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={serviceForm.cost}
                    onChange={e => setServiceForm(f => ({ ...f, cost: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>% Comisión</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={serviceForm.default_commission_rate}
                    onChange={e => setServiceForm(f => ({ ...f, default_commission_rate: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowServiceModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO PROFESIONAL / ESTILISTA ── */}
      {showProfessionalModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                👥 Registrar Estilista / Barbero
              </h2>
              <button onClick={() => setShowProfessionalModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateProfessional} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Completo *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Valeria Gómez"
                  value={professionalForm.name}
                  onChange={e => setProfessionalForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Especialidad</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Colorista / Barbero"
                    value={professionalForm.specialty}
                    onChange={e => setProfessionalForm(f => ({ ...f, specialty: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>% Comisión Base</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={professionalForm.commission_rate}
                    onChange={e => setProfessionalForm(f => ({ ...f, commission_rate: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                <input
                  type="text"
                  className="input-neu"
                  value={professionalForm.phone}
                  onChange={e => setProfessionalForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowProfessionalModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Profesional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA FICHA TÉCNICA CAPILAR ── */}
      {showRecordModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📋 Nueva Ficha Técnica & Colorimetría
              </h2>
              <button onClick={() => setShowRecordModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTechnicalRecord} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Daniela Salazar"
                    value={recordForm.customer_name}
                    onChange={e => setRecordForm(f => ({ ...f, customer_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={recordForm.customer_phone}
                    onChange={e => setRecordForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fórmula Técnica & Químicos (Tintes, Volúmenes, Plex) *</label>
                <textarea
                  className="input-neu"
                  rows={3}
                  value={recordForm.technical_formula}
                  onChange={e => setRecordForm(f => ({ ...f, technical_formula: e.target.value }))}
                  required
                  placeholder="Ej: Igora 8.1 (45g) + 9.0 (15g) + 20 Vol (60ml) + Olaplex"
                  style={{ width: '100%', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cuero Cabelludo</label>
                  <select
                    className="input-neu"
                    value={recordForm.scalp_condition}
                    onChange={e => setRecordForm(f => ({ ...f, scalp_condition: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Sensible">Sensible / Reactivo</option>
                    <option value="Seco">Seco</option>
                    <option value="Graso">Graso</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Alergias Conocidas</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Amoníaco, látex..."
                    value={recordForm.allergies}
                    onChange={e => setRecordForm(f => ({ ...f, allergies: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Observaciones & Recomendaciones de Cuidado</label>
                <input
                  type="text"
                  className="input-neu"
                  value={recordForm.observations}
                  onChange={e => setRecordForm(f => ({ ...f, observations: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowRecordModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Ficha Técnica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
