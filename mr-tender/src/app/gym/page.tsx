'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Dumbbell,
  Users,
  Calendar,
  Activity,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Flame,
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
  HeartPulse,
  Award,
  Zap,
  Scale
} from 'lucide-react'

interface GymMember {
  id: string
  tenant_id: string
  member_number: string
  full_name: string
  id_number: string
  phone?: string | null
  email?: string | null
  birth_date?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  medical_conditions?: string | null
  status: 'active' | 'expired' | 'frozen' | 'inactive'
  created_at: string
  memberships?: GymMembership[]
}

interface GymMembership {
  id: string
  tenant_id: string
  member_id: string
  plan_name: string
  start_date: string
  end_date: string
  price: number
  paid_amount: number
  total_sessions: number
  remaining_sessions: number
  status: 'active' | 'expired' | 'frozen' | 'cancelled'
  created_at: string
}

interface GymAccessLog {
  id: string
  tenant_id: string
  member_id: string
  access_type: 'access_granted' | 'access_denied_expired' | 'access_denied_debt'
  check_in_time: string
  notes?: string | null
  gym_members?: {
    full_name: string
    id_number: string
    member_number: string
  }
}

interface GymClass {
  id: string
  tenant_id: string
  class_name: string
  instructor_name: string
  schedule_time: string
  capacity: number
  booked_count: number
  location_room: string
  is_active: boolean
  created_at: string
}

interface GymBodyAssessment {
  id: string
  tenant_id: string
  member_id: string
  trainer_name: string
  assessment_date: string
  weight_kg: number
  height_cm: number
  body_fat_percent?: number | null
  muscle_mass_percent?: number | null
  chest_cm?: number | null
  waist_cm?: number | null
  hips_cm?: number | null
  arms_cm?: number | null
  thighs_cm?: number | null
  notes?: string | null
  created_at: string
  gym_members?: {
    full_name: string
  }
}

export default function GymPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'checkin' | 'members' | 'classes' | 'assessments'>('checkin')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [members, setMembers] = useState<GymMember[]>([])
  const [accessLogs, setAccessLogs] = useState<GymAccessLog[]>([])
  const [classes, setClasses] = useState<GymClass[]>([])
  const [assessments, setAssessments] = useState<GymBodyAssessment[]>([])

  // Search & Check-in simulation
  const [checkinInput, setCheckinInput] = useState('')
  const [checkinResult, setCheckinResult] = useState<{
    member: GymMember
    membership?: GymMembership
    status: 'granted' | 'denied_expired' | 'denied_not_found'
    message: string
  } | null>(null)

  // Filter members
  const [searchMember, setSearchMember] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState<GymMember | null>(null)
  const [showClassModal, setShowClassModal] = useState(false)
  const [showAssessmentModal, setShowAssessmentModal] = useState<GymMember | null>(null)
  const [selectedMemberForHistory, setSelectedMemberForHistory] = useState<GymMember | null>(null)

  // Forms
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    id_number: '',
    phone: '',
    email: '',
    birth_date: '1995-06-15',
    emergency_contact_name: 'Familiar',
    emergency_contact_phone: '3001234567',
    medical_conditions: 'Ninguna conocida',
    plan_name: 'Mensualidad Libre',
    price: 95000,
    paid_amount: 95000,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const [renewForm, setRenewForm] = useState({
    plan_name: 'Mensualidad Libre',
    price: 95000,
    paid_amount: 95000,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const [classForm, setClassForm] = useState({
    class_name: 'Crossfit WOD & Fuerza',
    instructor_name: 'Coach Mateo (Nivel 2)',
    schedule_time: 'Lun a Vie 07:00 AM - 08:00 AM',
    capacity: 20,
    location_room: 'Box Principal'
  })

  const [assessmentForm, setAssessmentForm] = useState({
    trainer_name: 'Coach Mateo',
    assessment_date: new Date().toISOString().split('T')[0],
    weight_kg: 74.5,
    height_cm: 175,
    body_fat_percent: 16.5,
    muscle_mass_percent: 42.0,
    chest_cm: 98,
    waist_cm: 82,
    hips_cm: 96,
    arms_cm: 35.5,
    thighs_cm: 56,
    notes: 'Excelente tono muscular. Mejorar flexibilidad de cadera.'
  })

  useEffect(() => {
    loadGymData()
  }, [])

  async function loadGymData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [membersRes, membershipsRes, logsRes, classesRes, assessRes] = await Promise.all([
        supabase.from('gym_members').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('gym_memberships').select('*').eq('tenant_id', tid).order('end_date', { ascending: false }),
        supabase.from('gym_access_logs').select('*, gym_members(full_name, id_number, member_number)').eq('tenant_id', tid).order('check_in_time', { ascending: false }).limit(40),
        supabase.from('gym_classes').select('*').eq('tenant_id', tid).order('class_name', { ascending: true }),
        supabase.from('gym_body_assessments').select('*, gym_members(full_name)').eq('tenant_id', tid).order('assessment_date', { ascending: false })
      ])

      const allMemberships = membershipsRes.data || []
      const membersWithPlans: GymMember[] = (membersRes.data || []).map((m: any) => ({
        ...m,
        memberships: allMemberships.filter((p: any) => p.member_id === m.id)
      }))

      setMembers(membersWithPlans)
      setAccessLogs((logsRes.data as any) || [])
      setClasses(classesRes.data || [])
      setAssessments((assessRes.data as any) || [])
    } catch (err) {
      console.error('Error loading gym data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Torniquete Check-In (Scanner / ID input)
  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault()
    if (!checkinInput.trim() || !tenantId) return

    const query = checkinInput.trim().toLowerCase()
    const foundMember = members.find(m =>
      m.id_number.toLowerCase() === query ||
      m.member_number.toLowerCase() === query ||
      m.full_name.toLowerCase().includes(query)
    )

    if (!foundMember) {
      setCheckinResult({
        member: { full_name: 'No encontrado', id_number: checkinInput } as any,
        status: 'denied_not_found',
        message: 'Afiliado no encontrado en la base de datos.'
      })
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const activeMembership = foundMember.memberships?.find(p => p.status === 'active' && p.end_date >= today)

    if (!activeMembership) {
      // Access Denied - Expired
      setCheckinResult({
        member: foundMember,
        status: 'denied_expired',
        message: 'Acceso Denegado: La membresía está vencida o inactiva.'
      })

      await supabase.from('gym_access_logs').insert({
        tenant_id: tenantId,
        member_id: foundMember.id,
        access_type: 'access_denied_expired',
        notes: 'Membresía vencida'
      })
    } else {
      // Access Granted
      const daysLeft = Math.round((new Date(activeMembership.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      setCheckinResult({
        member: foundMember,
        membership: activeMembership,
        status: 'granted',
        message: `¡Bienvenido(a) ${foundMember.full_name.split(' ')[0]}! Plan vigente (${daysLeft} días restantes).`
      })

      await supabase.from('gym_access_logs').insert({
        tenant_id: tenantId,
        member_id: foundMember.id,
        access_type: 'access_granted',
        notes: `${activeMembership.plan_name} - OK`
      })
    }

    setCheckinInput('')
    await loadGymData()
  }

  // Create Member
  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!memberForm.full_name.trim()) return alert('Ingresa el nombre completo')
    if (!memberForm.id_number.trim()) return alert('Ingresa el número de documento / cédula')

    setSubmitting(true)
    try {
      const memberNumber = `MEM-${Date.now().toString().slice(-4)}`
      const payloadMember = {
        tenant_id: tenantId,
        member_number: memberNumber,
        full_name: memberForm.full_name.trim(),
        id_number: memberForm.id_number.trim(),
        phone: memberForm.phone.trim() || null,
        email: memberForm.email.trim() || null,
        birth_date: memberForm.birth_date || null,
        emergency_contact_name: memberForm.emergency_contact_name.trim() || null,
        emergency_contact_phone: memberForm.emergency_contact_phone.trim() || null,
        medical_conditions: memberForm.medical_conditions.trim() || null,
        status: 'active'
      }

      const { data: createdMember, error: mErr } = await supabase.from('gym_members').insert(payloadMember).select().single()
      if (mErr) throw mErr

      // Create Initial Membership
      const payloadPlan = {
        tenant_id: tenantId,
        member_id: createdMember.id,
        plan_name: memberForm.plan_name,
        start_date: memberForm.start_date,
        end_date: memberForm.end_date,
        price: Number(memberForm.price),
        paid_amount: Number(memberForm.paid_amount),
        total_sessions: 0,
        remaining_sessions: 0,
        status: 'active'
      }

      await supabase.from('gym_memberships').insert(payloadPlan)

      setShowMemberModal(false)
      setMemberForm({
        full_name: '',
        id_number: '',
        phone: '',
        email: '',
        birth_date: '1995-06-15',
        emergency_contact_name: 'Familiar',
        emergency_contact_phone: '3001234567',
        medical_conditions: 'Ninguna conocida',
        plan_name: 'Mensualidad Libre',
        price: 95000,
        paid_amount: 95000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      await loadGymData()
    } catch (err: any) {
      alert(err.message || 'Error al inscribir afiliado')
    } finally {
      setSubmitting(false)
    }
  }

  // Renew Membership
  async function handleRenewMembership(e: React.FormEvent) {
    e.preventDefault()
    if (!showRenewModal || !tenantId || submitting) return

    setSubmitting(true)
    try {
      const payloadPlan = {
        tenant_id: tenantId,
        member_id: showRenewModal.id,
        plan_name: renewForm.plan_name,
        start_date: renewForm.start_date,
        end_date: renewForm.end_date,
        price: Number(renewForm.price),
        paid_amount: Number(renewForm.paid_amount),
        status: 'active'
      }

      const { error } = await supabase.from('gym_memberships').insert(payloadPlan)
      if (error) throw error

      await supabase.from('gym_members').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', showRenewModal.id)

      setShowRenewModal(null)
      await loadGymData()
    } catch (err: any) {
      alert(err.message || 'Error al renovar membresía')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Body Assessment
  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault()
    if (!showAssessmentModal || !tenantId || submitting) return

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        member_id: showAssessmentModal.id,
        trainer_name: assessmentForm.trainer_name,
        assessment_date: assessmentForm.assessment_date,
        weight_kg: Number(assessmentForm.weight_kg),
        height_cm: Number(assessmentForm.height_cm),
        body_fat_percent: Number(assessmentForm.body_fat_percent) || null,
        muscle_mass_percent: Number(assessmentForm.muscle_mass_percent) || null,
        chest_cm: Number(assessmentForm.chest_cm) || null,
        waist_cm: Number(assessmentForm.waist_cm) || null,
        hips_cm: Number(assessmentForm.hips_cm) || null,
        arms_cm: Number(assessmentForm.arms_cm) || null,
        thighs_cm: Number(assessmentForm.thighs_cm) || null,
        notes: assessmentForm.notes || null
      }

      const { error } = await supabase.from('gym_body_assessments').insert(payload)
      if (error) throw error

      setShowAssessmentModal(null)
      await loadGymData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar valoración física')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Group Class
  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!classForm.class_name.trim()) return alert('Ingresa el nombre de la clase')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        class_name: classForm.class_name.trim(),
        instructor_name: classForm.instructor_name.trim(),
        schedule_time: classForm.schedule_time.trim(),
        capacity: Number(classForm.capacity) || 20,
        booked_count: 0,
        location_room: classForm.location_room.trim(),
        is_active: true
      }

      const { error } = await supabase.from('gym_classes').insert(payload)
      if (error) throw error

      setShowClassModal(false)
      await loadGymData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar clase')
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Renewal Link
  function getWhatsAppRenewalUrl(member: GymMember, membership?: GymMembership) {
    if (!member.phone) return '#'
    const cleanPhone = member.phone.replace(/\D/g, '')
    const planName = membership?.plan_name || 'Membresía Libre'
    const endDate = membership?.end_date ? formatDate(membership.end_date) : 'próximamente'

    const msg = encodeURIComponent(
      `¡Hola ${member.full_name}! 💪 Te saludamos del Gimnasio. Te recordamos que tu *${planName}* vence el *${endDate}*. ¡Renueva hoy mismo para asegurar tu cupo y seguir entrenando fuerte!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // Seed Demo Data for Gym
  async function handleSeedGymDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Members
      const demoMembers = [
        {
          tenant_id: tenantId,
          member_number: 'MEM-0041',
          full_name: 'Santiago Morales',
          id_number: '1037654321',
          phone: '3128901234',
          email: 'santiago@email.com',
          status: 'active'
        },
        {
          tenant_id: tenantId,
          member_number: 'MEM-0042',
          full_name: 'Camila Montoya',
          id_number: '1020456789',
          phone: '3157894561',
          email: 'camila@email.com',
          status: 'active'
        },
        {
          tenant_id: tenantId,
          member_number: 'MEM-0043',
          full_name: 'Mauricio Henao',
          id_number: '71987654',
          phone: '3104567890',
          email: 'mauricio@email.com',
          status: 'expired'
        }
      ]
      const { data: createdMembers } = await supabase.from('gym_members').insert(demoMembers).select()

      const m1 = createdMembers?.[0]
      const m2 = createdMembers?.[1]
      const m3 = createdMembers?.[2]

      // 2. Memberships
      if (m1 && m2 && m3) {
        await supabase.from('gym_memberships').insert([
          {
            tenant_id: tenantId,
            member_id: m1.id,
            plan_name: 'Trimestral VIP Crossfit',
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: 260000,
            paid_amount: 260000,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            member_id: m2.id,
            plan_name: 'Mensualidad Libre + Funcional',
            start_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: 95000,
            paid_amount: 95000,
            status: 'active'
          },
          {
            tenant_id: tenantId,
            member_id: m3.id,
            plan_name: 'Mensualidad Libre',
            start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: 90000,
            paid_amount: 90000,
            status: 'expired'
          }
        ])

        // 3. Classes
        await supabase.from('gym_classes').insert([
          { tenant_id: tenantId, class_name: 'Crossfit WOD & Fuerza', instructor_name: 'Coach Mateo', schedule_time: 'Lun a Vie 07:00 AM', capacity: 20, booked_count: 14, location_room: 'Box Principal' },
          { tenant_id: tenantId, class_name: 'Spinning & Cardio HIIT', instructor_name: 'Instructora Laura', schedule_time: 'Mar y Jue 06:30 PM', capacity: 25, booked_count: 22, location_room: 'Salón de Ciclo' },
          { tenant_id: tenantId, class_name: 'Funcional & GAP', instructor_name: 'Coach Daniela', schedule_time: 'Lun - Mie - Vie 08:00 AM', capacity: 18, booked_count: 10, location_room: 'Salón 2' }
        ])

        // 4. Body assessment
        await supabase.from('gym_body_assessments').insert([
          {
            tenant_id: tenantId,
            member_id: m1.id,
            trainer_name: 'Coach Mateo',
            assessment_date: new Date().toISOString().split('T')[0],
            weight_kg: 76.2,
            height_cm: 178,
            body_fat_percent: 15.2,
            muscle_mass_percent: 43.5,
            chest_cm: 101,
            waist_cm: 80,
            hips_cm: 97,
            arms_cm: 37,
            thighs_cm: 58,
            notes: 'Aumento de 1.8kg de masa muscular magra en el último mes.'
          }
        ])

        // 5. Access log
        await supabase.from('gym_access_logs').insert([
          { tenant_id: tenantId, member_id: m1.id, access_type: 'access_granted', check_in_time: new Date().toISOString(), notes: 'Trimestral VIP - OK' }
        ])
      }

      await loadGymData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Members
  const filteredMembers = members.filter(m => {
    const q = searchMember.toLowerCase()
    const matchQ = m.full_name.toLowerCase().includes(q) ||
      m.id_number.toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      m.member_number.toLowerCase().includes(q)

    const today = new Date().toISOString().split('T')[0]
    const activePlan = m.memberships?.[0]
    const isExpired = !activePlan || activePlan.end_date < today
    const daysLeft = activePlan ? Math.round((new Date(activePlan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : -1
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7

    if (filterStatus === 'active') return matchQ && !isExpired
    if (filterStatus === 'expiring_soon') return matchQ && isExpiringSoon
    if (filterStatus === 'expired') return matchQ && isExpired
    return matchQ
  })

  // KPIs
  const todayStr = new Date().toISOString().split('T')[0]
  const activeMembersCount = members.filter(m => {
    const plan = m.memberships?.[0]
    return plan && plan.status === 'active' && plan.end_date >= todayStr
  }).length

  const expiringSoonCount = members.filter(m => {
    const plan = m.memberships?.[0]
    if (!plan || plan.status !== 'active') return false
    const daysLeft = Math.round((new Date(plan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 7
  }).length

  const checkinsTodayCount = accessLogs.filter(l => l.check_in_time.startsWith(todayStr)).length
  const totalRevenue = members.flatMap(m => m.memberships || []).reduce((acc, p) => acc + Number(p.paid_amount), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>🏋️</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Gimnasio, Fitness & Crossfit
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Torniquete y check-in QR, membresías con WhatsApp, clases grupales y valoración física antropométrica
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadGymData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {members.length === 0 && (
            <button onClick={handleSeedGymDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--accent-coral)', fontWeight: 700 }}>
              ✨ Cargar Datos Demo de Gimnasio
            </button>
          )}
          {activeTab === 'members' && (
            <button onClick={() => setShowMemberModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Inscribir Afiliado</span>
            </button>
          )}
          {activeTab === 'classes' && (
            <button onClick={() => setShowClassModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Clase Grupal</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Afiliados Activos
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {activeMembersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Membresías vigentes
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Check-Ins de Hoy
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {checkinsTodayCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Ingresos por torniquete
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Por Vencer (≤ 7 Días)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {expiringSoonCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Listos para WhatsApp
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Recaudación Membresías
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Ingresos por planes
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('checkin')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'checkin' ? 800 : 500,
            background: activeTab === 'checkin' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'checkin' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <QrCode size={15} />
          <span>Torniquete & Check-In Rápido</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'members' ? 800 : 500,
            background: activeTab === 'members' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'members' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Users size={15} />
          <span>Directorio de Afiliados ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'classes' ? 800 : 500,
            background: activeTab === 'classes' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'classes' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Flame size={15} />
          <span>Clases Grupales & Aforo ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'assessments' ? 800 : 500,
            background: activeTab === 'assessments' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'assessments' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Activity size={15} />
          <span>Valoración Física & Antropometría</span>
        </button>
      </div>

      {/* ── TAB 1: TORNIQUETE & CHECK-IN ── */}
      {activeTab === 'checkin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* Scanner Simulation Card */}
          <div className="neu-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: 8, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-coral)' }}>
                <Zap size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Simulador de Torniquete / Acceso</h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Escanea el código de barras/QR o digita el documento</div>
              </div>
            </div>

            <form onSubmit={handleCheckin} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input-neu"
                placeholder="Escanear QR o digitar Cédula (Ej: 1037654321)..."
                value={checkinInput}
                onChange={e => setCheckinInput(e.target.value)}
                autoFocus
                style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, padding: '10px 14px' }}
              />
              <button type="submit" className="btn-neu btn-primary" style={{ padding: '10px 18px', fontWeight: 800 }}>
                Validar Acceso
              </button>
            </form>

            {/* Live Verification Result Banner */}
            {checkinResult && (
              <div style={{
                padding: 16,
                borderRadius: 12,
                background: checkinResult.status === 'granted' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `2px solid ${checkinResult.status === 'granted' ? 'var(--accent-green)' : 'var(--accent-coral)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.4rem' }}>{checkinResult.status === 'granted' ? '🟢' : '🔴'}</span>
                    <strong style={{ fontSize: '1rem', color: checkinResult.status === 'granted' ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                      {checkinResult.status === 'granted' ? 'ACCESO AUTORIZADO' : 'ACCESO DENEGADO'}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {formatDateTime(new Date().toISOString())}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {checkinResult.member.full_name} {checkinResult.member.id_number ? `(CC: ${checkinResult.member.id_number})` : ''}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {checkinResult.message}
                </div>

                {checkinResult.status === 'denied_expired' && (
                  <button
                    onClick={() => setShowRenewModal(checkinResult.member)}
                    className="btn-neu btn-primary"
                    style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '0.75rem', marginTop: 4 }}
                  >
                    + Renovar Membresía en Caja
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Access Feed Log */}
          <div className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
              📋 Registro de Ingresos de Hoy ({accessLogs.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
              {accessLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 20 }}>
                  Aún no hay ingresos registrados hoy.
                </div>
              ) : (
                accessLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: '8px 12px', borderRadius: 8, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{log.access_type === 'access_granted' ? '🟢' : '🔴'}</span>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{log.gym_members?.full_name || 'Afiliado'}</strong>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{log.notes || 'Check-in'}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {formatDateTime(log.check_in_time)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DIRECTORIO DE AFILIADOS & MEMBRESÍAS ── */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula, teléfono o carnet..."
                value={searchMember}
                onChange={e => setSearchMember(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <select
              className="input-neu"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <option value="all">Todos los afiliados</option>
              <option value="active">🟢 Membresía Activa</option>
              <option value="expiring_soon">🟡 Por Vencer (≤ 7 días)</option>
              <option value="expired">🔴 Membresía Vencida</option>
            </select>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏋️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay afiliados registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Inscribe a los deportistas para llevar el control de membresías y acceso.
              </p>
              <button onClick={() => setShowMemberModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Inscribir primer afiliado
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {filteredMembers.map(member => {
                const today = new Date().toISOString().split('T')[0]
                const activePlan = member.memberships?.[0]
                const isExpired = !activePlan || activePlan.end_date < today
                const daysLeft = activePlan ? Math.round((new Date(activePlan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : -1
                const isNear = daysLeft >= 0 && daysLeft <= 7

                const badgeBg = isExpired ? 'rgba(239, 68, 68, 0.12)' : isNear ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)'
                const badgeColor = isExpired ? 'var(--accent-coral)' : isNear ? 'var(--accent-amber)' : 'var(--accent-green)'
                const badgeText = isExpired ? '🔴 Vencida' : isNear ? `🟡 Vence en ${daysLeft} días` : '🟢 Vigente'

                return (
                  <div key={member.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${badgeColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{member.full_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>({member.member_number})</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          CC: {member.id_number} {member.phone ? `• Tel: ${member.phone}` : ''}
                        </div>
                      </div>

                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: badgeBg, color: badgeColor }}>
                        {badgeText}
                      </span>
                    </div>

                    {/* Active Plan info */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Plan Actual:</span>
                        <strong style={{ color: 'var(--accent-coral)' }}>{activePlan?.plan_name || 'Sin plan'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span>Vigencia:</span>
                        <span>{activePlan ? `${formatDate(activePlan.start_date)} al ${formatDate(activePlan.end_date)}` : '--'}</span>
                      </div>
                      {member.medical_conditions && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', marginTop: 2, fontStyle: 'italic' }}>
                          ⚠️ Salud: {member.medical_conditions}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setShowRenewModal(member)}
                        className="btn-neu btn-primary"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                      >
                        + Renovar Plan
                      </button>

                      <button
                        onClick={() => setShowAssessmentModal(member)}
                        className="btn-neu"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-blue)', fontWeight: 700 }}
                      >
                        + Antropometría
                      </button>

                      {member.phone && (
                        <a
                          href={getWhatsAppRenewalUrl(member, activePlan)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-neu"
                          title="Enviar WhatsApp de renovación"
                          style={{ padding: '7px 10px', background: '#16A34A', color: '#fff' }}
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

      {/* ── TAB 3: CLASES GRUPALES & AFORO ── */}
      {activeTab === 'classes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {classes.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔥</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay clases grupales registradas</h3>
              <button onClick={() => setShowClassModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Crear primera clase grupal
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {classes.map(c => {
                const percent = Math.round((c.booked_count / c.capacity) * 100)
                const isFull = c.booked_count >= c.capacity

                return (
                  <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', color: 'var(--accent-coral)', fontWeight: 800 }}>
                          {c.location_room}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 4 }}>
                          {c.class_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Coach: {c.instructor_name}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isFull ? 'var(--accent-coral)' : 'var(--accent-green)' }}>
                        {isFull ? '🔴 LLENO' : '🟢 DISPONIBLE'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                      🕒 {c.schedule_time}
                    </div>

                    {/* Capacity progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cupos Reservados:</span>
                        <strong>{c.booked_count} / {c.capacity} ({percent}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: 7, borderRadius: 4, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: isFull ? 'var(--accent-coral)' : 'var(--accent-green)', transition: '0.3s ease' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: VALORACIÓN FÍSICA & ANTROPOMETRÍA ── */}
      {activeTab === 'assessments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {assessments.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📏</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay valoraciones registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Realiza valoraciones antropométricas a tus afiliados desde la pestaña de Directorio.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {assessments.map(ass => {
                const heightM = ass.height_cm / 100
                const imc = heightM > 0 ? (ass.weight_kg / (heightM * heightM)).toFixed(1) : '--'

                return (
                  <div key={ass.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '4px solid var(--accent-coral)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {ass.gym_members?.full_name || 'Afiliado'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Evaluador: {ass.trainer_name} • Fecha: {formatDate(ass.assessment_date)}
                        </div>
                      </div>

                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', color: 'var(--accent-coral)' }}>
                        IMC: {imc}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, background: 'var(--bg-deep)', padding: 8, borderRadius: 8, fontSize: '0.72rem', textAlign: 'center' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Peso</span>
                        <strong>{ass.weight_kg} kg</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Grasa</span>
                        <strong style={{ color: 'var(--accent-coral)' }}>{ass.body_fat_percent || '--'}%</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Músculo</span>
                        <strong style={{ color: 'var(--accent-green)' }}>{ass.muscle_mass_percent || '--'}%</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Cintura</span>
                        <strong>{ass.waist_cm || '--'} cm</strong>
                      </div>
                    </div>

                    {ass.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{ass.notes}"
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: INSCRIBIR AFILIADO ── */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🏋️ Inscribir Nuevo Afiliado
              </h2>
              <button onClick={() => setShowMemberModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre Completo *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Santiago Morales"
                    value={memberForm.full_name}
                    onChange={e => setMemberForm(f => ({ ...f, full_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cédula / DNI *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="1037654321"
                    value={memberForm.id_number}
                    onChange={e => setMemberForm(f => ({ ...f, id_number: e.target.value }))}
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
                    placeholder="3128901234"
                    value={memberForm.phone}
                    onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Email</label>
                  <input
                    type="email"
                    className="input-neu"
                    placeholder="santiago@email.com"
                    value={memberForm.email}
                    onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Initial Plan */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-coral)', marginBottom: 6 }}>Membresía Inicial</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Plan</label>
                    <select
                      className="input-neu"
                      value={memberForm.plan_name}
                      onChange={e => {
                        const p = e.target.value
                        const price = p.includes('Trimestral') ? 260000 : p.includes('Anualidad') ? 950000 : p.includes('Tiquetera') ? 120000 : 95000
                        setMemberForm(f => ({ ...f, plan_name: p, price, paid_amount: price }))
                      }}
                      style={{ width: '100%', fontSize: '0.78rem' }}
                    >
                      <option value="Mensualidad Libre">Mensualidad Libre ($95.000)</option>
                      <option value="Trimestral VIP Crossfit">Trimestral VIP ($260.000)</option>
                      <option value="Tiquetera 12 Clases">Tiquetera 12 Clases ($120.000)</option>
                      <option value="Anualidad Gold">Anualidad Gold ($950.000)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Precio ($)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={memberForm.price}
                      onChange={e => setMemberForm(f => ({ ...f, price: Number(e.target.value), paid_amount: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Condiciones Médicas / Lesiones</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Hipertensión, lesión rodilla..."
                  value={memberForm.medical_conditions}
                  onChange={e => setMemberForm(f => ({ ...f, medical_conditions: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Inscribiendo...' : 'Inscribir Afiliado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RENOVAR MEMBRESÍA ── */}
      {showRenewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  💳 Renovar Membresía
                </h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Afiliado: {showRenewModal.full_name} (CC: {showRenewModal.id_number})
                </div>
              </div>
              <button onClick={() => setShowRenewModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleRenewMembership} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Plan de Entrenamiento</label>
                <select
                  className="input-neu"
                  value={renewForm.plan_name}
                  onChange={e => {
                    const p = e.target.value
                    const price = p.includes('Trimestral') ? 260000 : p.includes('Anualidad') ? 950000 : 95000
                    const days = p.includes('Trimestral') ? 90 : p.includes('Anualidad') ? 365 : 30
                    setRenewForm(f => ({
                      ...f,
                      plan_name: p,
                      price,
                      paid_amount: price,
                      end_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    }))
                  }}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                >
                  <option value="Mensualidad Libre">Mensualidad Libre ($95.000)</option>
                  <option value="Trimestral VIP Crossfit">Trimestral VIP ($260.000)</option>
                  <option value="Anualidad Gold">Anualidad Gold ($950.000)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Fecha Inicio</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={renewForm.start_date}
                    onChange={e => setRenewForm(f => ({ ...f, start_date: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Fecha Vencimiento</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={renewForm.end_date}
                    onChange={e => setRenewForm(f => ({ ...f, end_date: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Total Plan ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={renewForm.price}
                    onChange={e => setRenewForm(f => ({ ...f, price: Number(e.target.value), paid_amount: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Pagado ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={renewForm.paid_amount}
                    onChange={e => setRenewForm(f => ({ ...f, paid_amount: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowRenewModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Renovando...' : 'Confirmar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VALORACIÓN FÍSICA ANTROPOMÉTRICA ── */}
      {showAssessmentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📏 Valoración Física — {showAssessmentModal.full_name}
                </h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Antropometría y composición corporal
                </div>
              </div>
              <button onClick={() => setShowAssessmentModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateAssessment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Peso Actual (kg) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={assessmentForm.weight_kg}
                    onChange={e => setAssessmentForm(f => ({ ...f, weight_kg: Number(e.target.value) }))}
                    step={0.1}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Estatura (cm) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={assessmentForm.height_cm}
                    onChange={e => setAssessmentForm(f => ({ ...f, height_cm: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>% Grasa Corporal</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={assessmentForm.body_fat_percent}
                    onChange={e => setAssessmentForm(f => ({ ...f, body_fat_percent: Number(e.target.value) }))}
                    step={0.1}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>% Masa Muscular</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={assessmentForm.muscle_mass_percent}
                    onChange={e => setAssessmentForm(f => ({ ...f, muscle_mass_percent: Number(e.target.value) }))}
                    step={0.1}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-coral)', marginBottom: 6 }}>Perímetros Corporales (cm)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Pecho</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={assessmentForm.chest_cm}
                      onChange={e => setAssessmentForm(f => ({ ...f, chest_cm: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.75rem', padding: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Cintura</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={assessmentForm.waist_cm}
                      onChange={e => setAssessmentForm(f => ({ ...f, waist_cm: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.75rem', padding: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Brazos</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={assessmentForm.arms_cm}
                      onChange={e => setAssessmentForm(f => ({ ...f, arms_cm: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.75rem', padding: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Piernas</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={assessmentForm.thighs_cm}
                      onChange={e => setAssessmentForm(f => ({ ...f, thighs_cm: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.75rem', padding: 4 }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Notas & Recomendaciones</label>
                <input
                  type="text"
                  className="input-neu"
                  value={assessmentForm.notes}
                  onChange={e => setAssessmentForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowAssessmentModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Valoración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA CLASE GRUPAL ── */}
      {showClassModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🔥 Crear Clase Grupal
              </h2>
              <button onClick={() => setShowClassModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre de la Clase *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Crossfit WOD & Fuerza"
                  value={classForm.class_name}
                  onChange={e => setClassForm(f => ({ ...f, class_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Coach / Instructor</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={classForm.instructor_name}
                    onChange={e => setClassForm(f => ({ ...f, instructor_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cupos Máximos</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={classForm.capacity}
                    onChange={e => setClassForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Horario</label>
                <input
                  type="text"
                  className="input-neu"
                  value={classForm.schedule_time}
                  onChange={e => setClassForm(f => ({ ...f, schedule_time: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Salón / Zona</label>
                <input
                  type="text"
                  className="input-neu"
                  value={classForm.location_room}
                  onChange={e => setClassForm(f => ({ ...f, location_room: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowClassModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Crear Clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
