'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Dog,
  HeartPulse,
  Syringe,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Phone,
  MessageSquare,
  Scale,
  Calendar,
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
  Award
} from 'lucide-react'

interface VetPet {
  id: string
  tenant_id: string
  name: string
  species: string
  breed: string
  gender: string
  birth_date?: string | null
  weight_kg: number
  microchip_number?: string | null
  owner_name: string
  owner_phone?: string | null
  owner_email?: string | null
  medical_notes?: string | null
  is_active: boolean
  created_at: string
}

interface VetClinicalRecord {
  id: string
  tenant_id: string
  pet_id: string
  vet_name: string
  visit_date: string
  reason_for_visit: string
  symptoms?: string | null
  vital_signs: {
    temp_c?: number
    heart_rate?: number
    resp_rate?: number
    weight_kg?: number
  }
  diagnosis: string
  treatment_plan?: string | null
  next_appointment_date?: string | null
  created_at: string
  vet_pets?: {
    name: string
    species: string
    owner_name: string
    owner_phone?: string | null
  }
}

interface VetVaccination {
  id: string
  tenant_id: string
  pet_id: string
  type: 'vaccine' | 'deworming'
  vaccine_name: string
  applied_date: string
  next_due_date: string
  lot_number?: string | null
  vet_name?: string | null
  status: 'applied' | 'pending_booster' | 'overdue'
  created_at: string
  vet_pets?: {
    name: string
    species: string
    owner_name: string
    owner_phone?: string | null
  }
}

interface VetGroomingHotel {
  id: string
  tenant_id: string
  pet_id?: string | null
  service_type: 'grooming' | 'hotel_daycare'
  pet_name: string
  owner_name: string
  owner_phone?: string | null
  check_in: string
  check_out?: string | null
  service_description: string
  special_instructions?: string | null
  total_price: number
  status: 'scheduled' | 'in_service' | 'ready_for_pickup' | 'completed' | 'cancelled'
  created_at: string
}

interface VetFeedBulk {
  id: string
  tenant_id: string
  brand_name: string
  target_species: string
  sack_weight_kg: number
  sack_cost: number
  price_per_kg: number
  price_per_pound: number
  current_sack_remaining_kg: number
  sealed_sacks_in_stock: number
  created_at: string
}

export default function VeterinaryPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'patients' | 'vaccines' | 'grooming' | 'feed'>('patients')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [pets, setPets] = useState<VetPet[]>([])
  const [clinicalRecords, setClinicalRecords] = useState<VetClinicalRecord[]>([])
  const [vaccinations, setVaccinations] = useState<VetVaccination[]>([])
  const [groomingList, setGroomingList] = useState<VetGroomingHotel[]>([])
  const [feedList, setFeedList] = useState<VetFeedBulk[]>([])

  // Search & Filters
  const [searchPet, setSearchPet] = useState('')
  const [selectedPetForHistory, setSelectedPetForHistory] = useState<VetPet | null>(null)

  // Modals
  const [showPetModal, setShowPetModal] = useState(false)
  const [showConsultModal, setShowConsultModal] = useState<VetPet | null>(null)
  const [showVaccineModal, setShowVaccineModal] = useState<VetPet | null>(null)
  const [showGroomingModal, setShowGroomingModal] = useState(false)
  const [showFeedModal, setShowFeedModal] = useState(false)
  const [selectedFeedForSale, setSelectedFeedForSale] = useState<VetFeedBulk | null>(null)
  const [feedKilosToSell, setFeedKilosToSell] = useState<number>(1)

  // Forms
  const [petForm, setPetForm] = useState({
    name: '',
    species: 'Perro',
    breed: 'Criollo / Mestizo',
    gender: 'Macho',
    birth_date: '2023-01-15',
    weight_kg: 12.5,
    microchip_number: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    medical_notes: 'Sin antecedentes conocidos'
  })

  const [consultForm, setConsultForm] = useState({
    vet_name: 'Dr. Alejandro Restrepo (M.V. 14890)',
    visit_date: new Date().toISOString().split('T')[0],
    reason_for_visit: 'Control general y chequeo preventivo',
    symptoms: 'Activo, apetito normal, mucosas rosadas',
    temp_c: 38.6,
    heart_rate: 115,
    resp_rate: 22,
    weight_kg: 12.5,
    diagnosis: 'Paciente clínicamente sano. Buen estado nutricional.',
    treatment_plan: 'Continuar con dieta habitual. Refuerzo de desparasitante en 3 meses.',
    next_appointment_date: ''
  })

  const [vaccineForm, setVaccineForm] = useState({
    type: 'vaccine' as 'vaccine' | 'deworming',
    vaccine_name: 'Séxtuple Canina (DHPPi/L)',
    applied_date: new Date().toISOString().split('T')[0],
    next_due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lot_number: 'LOT-VAC-2026-99',
    vet_name: 'Dr. Alejandro Restrepo (M.V.)'
  })

  const [groomingForm, setGroomingForm] = useState({
    pet_name: '',
    owner_name: '',
    owner_phone: '',
    service_type: 'grooming' as 'grooming' | 'hotel_daycare',
    service_description: 'Baño medicado + corte de uñas + limpieza de oídos',
    special_instructions: 'No usar secador muy caliente en cabeza / Piel sensible',
    total_price: 45000
  })

  const [feedForm, setFeedForm] = useState({
    brand_name: 'Royal Canin Maxi Adult',
    target_species: 'Perro',
    sack_weight_kg: 20,
    sack_cost: 160000,
    price_per_kg: 12000,
    price_per_pound: 6500,
    current_sack_remaining_kg: 20,
    sealed_sacks_in_stock: 4
  })

  useEffect(() => {
    loadVetData()
  }, [])

  async function loadVetData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [petsRes, recsRes, vacsRes, groomRes, feedRes] = await Promise.all([
        supabase.from('vet_pets').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('vet_clinical_records').select('*, vet_pets(name, species, owner_name, owner_phone)').eq('tenant_id', tid).order('visit_date', { ascending: false }).limit(40),
        supabase.from('vet_vaccinations').select('*, vet_pets(name, species, owner_name, owner_phone)').eq('tenant_id', tid).order('next_due_date', { ascending: true }),
        supabase.from('vet_grooming_hotel').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(30),
        supabase.from('vet_feed_bulk').select('*').eq('tenant_id', tid).order('brand_name', { ascending: true })
      ])

      setPets(petsRes.data || [])
      setClinicalRecords((recsRes.data as any) || [])
      setVaccinations((vacsRes.data as any) || [])
      setGroomingList(groomRes.data || [])
      setFeedList(feedRes.data || [])
    } catch (err) {
      console.error('Error loading veterinary data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Pet
  async function handleCreatePet(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!petForm.name.trim()) return alert('Ingresa el nombre de la mascota')
    if (!petForm.owner_name.trim()) return alert('Ingresa el nombre del dueño / tutor')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        name: petForm.name.trim(),
        species: petForm.species,
        breed: petForm.breed.trim() || 'Mestizo',
        gender: petForm.gender,
        birth_date: petForm.birth_date || null,
        weight_kg: Number(petForm.weight_kg) || 0,
        microchip_number: petForm.microchip_number.trim() || null,
        owner_name: petForm.owner_name.trim(),
        owner_phone: petForm.owner_phone.trim() || null,
        owner_email: petForm.owner_email.trim() || null,
        medical_notes: petForm.medical_notes.trim() || null,
        is_active: true
      }

      const { error } = await supabase.from('vet_pets').insert(payload)
      if (error) throw error

      setShowPetModal(false)
      setPetForm({
        name: '',
        species: 'Perro',
        breed: 'Criollo / Mestizo',
        gender: 'Macho',
        birth_date: '2023-01-15',
        weight_kg: 12.5,
        microchip_number: '',
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        medical_notes: 'Sin antecedentes conocidos'
      })
      await loadVetData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar paciente')
    } finally {
      setSubmitting(false)
    }
  }

  // Save Clinical Consultation Record
  async function handleCreateClinicalRecord(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !showConsultModal || submitting) return
    if (!consultForm.diagnosis.trim()) return alert('Ingresa el diagnóstico médico')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        pet_id: showConsultModal.id,
        vet_name: consultForm.vet_name,
        visit_date: consultForm.visit_date,
        reason_for_visit: consultForm.reason_for_visit,
        symptoms: consultForm.symptoms || null,
        vital_signs: {
          temp_c: Number(consultForm.temp_c),
          heart_rate: Number(consultForm.heart_rate),
          resp_rate: Number(consultForm.resp_rate),
          weight_kg: Number(consultForm.weight_kg)
        },
        diagnosis: consultForm.diagnosis,
        treatment_plan: consultForm.treatment_plan || null,
        next_appointment_date: consultForm.next_appointment_date || null
      }

      const { error } = await supabase.from('vet_clinical_records').insert(payload)
      if (error) throw error

      // Update pet weight if changed
      if (consultForm.weight_kg) {
        await supabase
          .from('vet_pets')
          .update({ weight_kg: Number(consultForm.weight_kg), updated_at: new Date().toISOString() })
          .eq('id', showConsultModal.id)
      }

      setShowConsultModal(null)
      await loadVetData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar consulta clínica')
    } finally {
      setSubmitting(false)
    }
  }

  // Save Vaccination
  async function handleCreateVaccination(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !showVaccineModal || submitting) return
    if (!vaccineForm.vaccine_name.trim()) return alert('Ingresa el nombre del biológico')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        pet_id: showVaccineModal.id,
        type: vaccineForm.type,
        vaccine_name: vaccineForm.vaccine_name,
        applied_date: vaccineForm.applied_date,
        next_due_date: vaccineForm.next_due_date,
        lot_number: vaccineForm.lot_number || null,
        vet_name: vaccineForm.vet_name || null,
        status: 'applied'
      }

      const { error } = await supabase.from('vet_vaccinations').insert(payload)
      if (error) throw error

      setShowVaccineModal(null)
      await loadVetData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar vacuna')
    } finally {
      setSubmitting(false)
    }
  }

  // Save Grooming / Daycare
  async function handleCreateGrooming(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!groomingForm.pet_name.trim()) return alert('Ingresa el nombre de la mascota')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        service_type: groomingForm.service_type,
        pet_name: groomingForm.pet_name.trim(),
        owner_name: groomingForm.owner_name.trim(),
        owner_phone: groomingForm.owner_phone.trim() || null,
        service_description: groomingForm.service_description,
        special_instructions: groomingForm.special_instructions || null,
        total_price: Number(groomingForm.total_price),
        status: 'in_service'
      }

      const { error } = await supabase.from('vet_grooming_hotel').insert(payload)
      if (error) throw error

      setShowGroomingModal(false)
      setGroomingForm({
        pet_name: '',
        owner_name: '',
        owner_phone: '',
        service_type: 'grooming',
        service_description: 'Baño medicado + corte de uñas + limpieza de oídos',
        special_instructions: '',
        total_price: 45000
      })
      await loadVetData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar servicio')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Grooming Status
  async function handleUpdateGroomingStatus(id: string, status: 'ready_for_pickup' | 'completed' | 'cancelled') {
    try {
      const { error } = await supabase
        .from('vet_grooming_hotel')
        .update({ status, check_out: status === 'completed' ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
      await loadVetData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Bulk Feed Type
  async function handleCreateFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!feedForm.brand_name.trim()) return alert('Ingresa la marca del concentrado')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        brand_name: feedForm.brand_name.trim(),
        target_species: feedForm.target_species,
        sack_weight_kg: Number(feedForm.sack_weight_kg),
        sack_cost: Number(feedForm.sack_cost),
        price_per_kg: Number(feedForm.price_per_kg),
        price_per_pound: Number(feedForm.price_per_pound),
        current_sack_remaining_kg: Number(feedForm.current_sack_remaining_kg),
        sealed_sacks_in_stock: Number(feedForm.sealed_sacks_in_stock)
      }

      const { error } = await supabase.from('vet_feed_bulk').insert(payload)
      if (error) throw error

      setShowFeedModal(false)
      await loadVetData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar concentrado')
    } finally {
      setSubmitting(false)
    }
  }

  // Sell Kilos from Open Sack
  async function handleSellFeedKilos(feed: VetFeedBulk, kilos: number) {
    if (feed.current_sack_remaining_kg < kilos) {
      if (feed.sealed_sacks_in_stock > 0) {
        if (confirm(`El bulto actual solo tiene ${feed.current_sack_remaining_kg}kg. ¿Deseas abrir un bulto nuevo de bodega de ${feed.sack_weight_kg}kg?`)) {
          const newRemaining = (Number(feed.current_sack_remaining_kg) + Number(feed.sack_weight_kg)) - kilos
          const newSealed = feed.sealed_sacks_in_stock - 1
          await supabase.from('vet_feed_bulk').update({
            current_sack_remaining_kg: newRemaining,
            sealed_sacks_in_stock: newSealed,
            updated_at: new Date().toISOString()
          }).eq('id', feed.id)
          await loadVetData()
          setSelectedFeedForSale(null)
          return
        }
      } else {
        alert('Stock insuficiente en bulto abierto y no hay bultos cerrados en bodega.')
        return
      }
    }

    const nextRemaining = Math.max(0, Number(feed.current_sack_remaining_kg) - kilos)
    await supabase.from('vet_feed_bulk').update({
      current_sack_remaining_kg: nextRemaining,
      updated_at: new Date().toISOString()
    }).eq('id', feed.id)

    await loadVetData()
    setSelectedFeedForSale(null)
  }

  // Open New Sack from Stock
  async function handleOpenNewSack(feed: VetFeedBulk) {
    if (feed.sealed_sacks_in_stock <= 0) return alert('No hay bultos cerrados en stock para abrir.')
    try {
      const nextRemaining = Number(feed.current_sack_remaining_kg) + Number(feed.sack_weight_kg)
      const nextSealed = feed.sealed_sacks_in_stock - 1
      await supabase.from('vet_feed_bulk').update({
        current_sack_remaining_kg: nextRemaining,
        sealed_sacks_in_stock: nextSealed,
        updated_at: new Date().toISOString()
      }).eq('id', feed.id)
      await loadVetData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Seed Demo Data for Veterinary
  async function handleSeedVetDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Pets
      const demoPets = [
        {
          tenant_id: tenantId,
          name: 'Luna',
          species: 'Perro',
          breed: 'Golden Retriever',
          gender: 'Hembra',
          birth_date: '2022-04-10',
          weight_kg: 28.5,
          microchip_number: '981098102938475',
          owner_name: 'Camila Montoya',
          owner_phone: '3128901234',
          owner_email: 'camila.montoya@email.com',
          medical_notes: 'Sensibilidad a pulgas. Alergia leve al pollo.'
        },
        {
          tenant_id: tenantId,
          name: 'Simba',
          species: 'Gato',
          breed: 'Persa / Angora',
          gender: 'Macho',
          birth_date: '2023-08-20',
          weight_kg: 4.2,
          microchip_number: '981098109988776',
          owner_name: 'Santiago Morales',
          owner_phone: '3157894561',
          owner_email: 'santiago@email.com',
          medical_notes: 'Castrado. Dieta urinaria preventiva.'
        },
        {
          tenant_id: tenantId,
          name: 'Toby',
          species: 'Perro',
          breed: 'French Poodle',
          gender: 'Macho',
          birth_date: '2021-11-05',
          weight_kg: 6.8,
          microchip_number: '981098103322114',
          owner_name: 'Gloria Elena Arango',
          owner_phone: '3104561234',
          medical_notes: 'Profilaxis dental realizada en 2025.'
        }
      ]
      const { data: createdPets } = await supabase.from('vet_pets').insert(demoPets).select()

      const pet1 = createdPets?.[0]
      const pet2 = createdPets?.[1]

      // 2. Clinical records
      if (pet1) {
        await supabase.from('vet_clinical_records').insert([
          {
            tenant_id: tenantId,
            pet_id: pet1.id,
            vet_name: 'Dr. Alejandro Restrepo (M.V.)',
            visit_date: new Date().toISOString().split('T')[0],
            reason_for_visit: 'Control anual y chequeo articular',
            symptoms: 'Leve rigidez matutina en cadera',
            vital_signs: { temp_c: 38.7, heart_rate: 105, resp_rate: 20, weight_kg: 28.5 },
            diagnosis: 'Inicio de artrosis coxofemoral grado 1 por edad/raza',
            treatment_plan: 'Condroprotectores (Glucosamina + Condroitina) 1 tab/día por 60 días. Evitar ejercicio de alto impacto.',
            next_appointment_date: '2026-11-20'
          }
        ])

        // 3. Vaccinations
        await supabase.from('vet_vaccinations').insert([
          {
            tenant_id: tenantId,
            pet_id: pet1.id,
            type: 'vaccine',
            vaccine_name: 'Rabia + Séxtuple Canina (DHPPi/L)',
            applied_date: '2025-09-10',
            next_due_date: '2026-09-10',
            lot_number: 'LOT-RAB-2025-11',
            vet_name: 'Dr. Alejandro Restrepo',
            status: 'applied'
          },
          {
            tenant_id: tenantId,
            pet_id: pet1.id,
            type: 'deworming',
            vaccine_name: 'NexGard Spectra (Antipulgas y Desparasitante)',
            applied_date: '2026-07-15',
            next_due_date: '2026-08-15',
            lot_number: 'LOT-NEX-889',
            vet_name: 'Dr. Alejandro Restrepo',
            status: 'pending_booster'
          }
        ])
      }

      // 4. Grooming & Daycare
      const demoGrooming = [
        {
          tenant_id: tenantId,
          pet_id: pet1?.id,
          service_type: 'grooming',
          pet_name: 'Luna',
          owner_name: 'Camila Montoya',
          owner_phone: '3128901234',
          service_description: 'Deslanado profesional + Baño hidratante + Corte de uñas',
          special_instructions: 'Usar champú hipoalergénico de avena',
          total_price: 65000,
          status: 'in_service'
        },
        {
          tenant_id: tenantId,
          pet_id: pet2?.id,
          service_type: 'grooming',
          pet_name: 'Simba',
          owner_name: 'Santiago Morales',
          owner_phone: '3157894561',
          service_description: 'Cepillado y desenredo de pelo largo + Limpieza lagrimal',
          special_instructions: 'Tratar con suavidad, se estresa con ruidos fuertes',
          total_price: 40000,
          status: 'ready_for_pickup'
        }
      ]
      await supabase.from('vet_grooming_hotel').insert(demoGrooming)

      // 5. Bulk Feed
      const demoFeed = [
        {
          tenant_id: tenantId,
          brand_name: 'Royal Canin Maxi Adult 20kg',
          target_species: 'Perro',
          sack_weight_kg: 20,
          sack_cost: 165000,
          price_per_kg: 13000,
          price_per_pound: 7000,
          current_sack_remaining_kg: 14.5,
          sealed_sacks_in_stock: 4
        },
        {
          tenant_id: tenantId,
          brand_name: 'Chunky Cordero y Arroz 25kg',
          target_species: 'Perro',
          sack_weight_kg: 25,
          sack_cost: 120000,
          price_per_kg: 7500,
          price_per_pound: 4000,
          current_sack_remaining_kg: 18.0,
          sealed_sacks_in_stock: 6
        },
        {
          tenant_id: tenantId,
          brand_name: 'Hills Science Diet Feline Adult 15kg',
          target_species: 'Gato',
          sack_weight_kg: 15,
          sack_cost: 140000,
          price_per_kg: 15000,
          price_per_pound: 8000,
          current_sack_remaining_kg: 9.0,
          sealed_sacks_in_stock: 2
        }
      ]
      await supabase.from('vet_feed_bulk').insert(demoFeed)

      await loadVetData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Pets
  const filteredPets = pets.filter(p => {
    const q = searchPet.toLowerCase()
    return p.name.toLowerCase().includes(q) ||
      p.owner_name.toLowerCase().includes(q) ||
      (p.owner_phone || '').includes(q) ||
      (p.breed || '').toLowerCase().includes(q) ||
      (p.microchip_number || '').includes(q)
  })

  // WhatsApp Reminder for Vaccines
  function getVaccineWhatsAppUrl(vac: VetVaccination) {
    const phone = vac.vet_pets?.owner_phone
    if (!phone) return '#'
    const cleanPhone = phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `¡Hola ${vac.vet_pets?.owner_name}! 🐾 Te saludamos de la Veterinaria. Te recordamos que a tu consentido *${vac.vet_pets?.name}* le corresponde su dosis/refuerzo de *${vac.vaccine_name}* para la fecha *${formatDate(vac.next_due_date)}*. ¡Agenda su cita con nosotros para mantenerlo protegido!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // WhatsApp Notification when Grooming is Ready
  function getGroomingReadyWhatsAppUrl(item: VetGroomingHotel) {
    if (!item.owner_phone) return '#'
    const cleanPhone = item.owner_phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `¡Hola ${item.owner_name}! 🐶✨ Te avisamos que *${item.pet_name}* ya terminó su servicio de ${item.service_description} y está listo y hermoso para ser recogido en la Veterinaria/Spa. ¡Te esperamos!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // Species Emoji helper
  function getSpeciesIcon(species: string) {
    switch (species.toLowerCase()) {
      case 'perro': return '🐶'
      case 'gato': return '🐱'
      case 'ave': return '🦜'
      case 'conejo': return '🐰'
      default: return '🐾'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dog size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Veterinaria, Pet Shop & Grooming
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Historias clínicas, carnet digital de vacunas con WhatsApp, peluquería/hotel canino y venta fraccionada de concentrado
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadVetData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {pets.length === 0 && (
            <button onClick={handleSeedVetDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Datos Demo de Veterinaria
            </button>
          )}
          {activeTab === 'patients' && (
            <button onClick={() => setShowPetModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Paciente / Mascota</span>
            </button>
          )}
          {activeTab === 'grooming' && (
            <button onClick={() => setShowGroomingModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Ingreso Grooming / Hotel</span>
            </button>
          )}
          {activeTab === 'feed' && (
            <button onClick={() => setShowFeedModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Concentrado</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Pacientes Registrados
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {pets.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {pets.filter(p => p.species === 'Perro').length} Perros • {pets.filter(p => p.species === 'Gato').length} Gatos
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Consultas Médicas
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {clinicalRecords.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Historias clínicas activas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Grooming & Hotel Hoy
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {groomingList.filter(g => g.status === 'in_service' || g.status === 'ready_for_pickup').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {groomingList.filter(g => g.status === 'ready_for_pickup').length} listos para entrega
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Concentrado en Granel
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {feedList.reduce((acc, f) => acc + Number(f.current_sack_remaining_kg), 0).toFixed(1)} kg
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {feedList.reduce((acc, f) => acc + f.sealed_sacks_in_stock, 0)} bultos cerrados en bodega
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('patients')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'patients' ? 800 : 500,
            background: activeTab === 'patients' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'patients' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Dog size={15} />
          <span>Pacientes & Historias Clínicas ({pets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vaccines')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'vaccines' ? 800 : 500,
            background: activeTab === 'vaccines' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'vaccines' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Syringe size={15} />
          <span>Carnet de Vacunación & Refuerzos ({vaccinations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grooming')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'grooming' ? 800 : 500,
            background: activeTab === 'grooming' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'grooming' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={15} />
          <span>Peluquería / Grooming & Hotel ({groomingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'feed' ? 800 : 500,
            background: activeTab === 'feed' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'feed' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Scale size={15} />
          <span>Concentrado a Granel & Fraccionamiento</span>
        </button>
      </div>

      {/* ── TAB 1: PACIENTES & HISTORIAS CLÍNICAS ── */}
      {activeTab === 'patients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search bar */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar paciente por nombre, raza, tutor, teléfono o microchip..."
                value={searchPet}
                onChange={e => setSearchPet(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {filteredPets.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🐶</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay pacientes registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra la primera mascota para llevar su historial médico, peso y vacunas.
              </p>
              <button onClick={() => setShowPetModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Registrar primera mascota
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {filteredPets.map(p => {
                const petConsults = clinicalRecords.filter(c => c.pet_id === p.id)
                const petVaccines = vaccinations.filter(v => v.pet_id === p.id)

                return (
                  <div key={p.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '4px solid var(--accent-coral)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '1.2rem' }}>{getSpeciesIcon(p.species)}</span>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{p.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({p.gender})</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {p.species} • {p.breed} • <strong>{p.weight_kg} kg</strong>
                        </div>
                      </div>

                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-coral)' }}>
                        {petConsults.length} Consultas
                      </span>
                    </div>

                    {/* Owner details */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tutor / Dueño:</span>
                        <strong>{p.owner_name}</strong>
                      </div>
                      {p.owner_phone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Teléfono:</span>
                          <span>{p.owner_phone}</span>
                        </div>
                      )}
                      {p.microchip_number && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span>Microchip:</span>
                          <span style={{ fontFamily: 'monospace' }}>{p.microchip_number}</span>
                        </div>
                      )}
                    </div>

                    {p.medical_notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-coral)', fontStyle: 'italic' }}>
                        ⚠️ {p.medical_notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button
                        onClick={() => { setShowConsultModal(p); setConsultForm(f => ({ ...f, weight_kg: p.weight_kg })) }}
                        className="btn-neu btn-primary"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <HeartPulse size={13} />
                        <span>+ Consulta</span>
                      </button>

                      <button
                        onClick={() => setShowVaccineModal(p)}
                        className="btn-neu"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-blue)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <Syringe size={13} />
                        <span>+ Vacuna</span>
                      </button>

                      <button
                        onClick={() => setSelectedPetForHistory(p)}
                        className="btn-neu btn-ghost"
                        title="Ver historial clínico completo"
                        style={{ padding: '7px 8px', fontSize: '0.72rem' }}
                      >
                        Historial
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CARNET DE VACUNAS & REFUERZOS ── */}
      {activeTab === 'vaccines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {vaccinations.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💉</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay registros de vacunación</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Aplica vacunas y desparasitaciones desde la pestaña de Pacientes para llevar el control de refuerzos.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {vaccinations.map(v => {
                const today = new Date().toISOString().split('T')[0]
                const isOverdue = v.next_due_date < today
                const daysDiff = Math.round((new Date(v.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                const isNear = daysDiff >= 0 && daysDiff <= 15

                const badgeBg = isOverdue ? 'rgba(220, 38, 38, 0.12)' : isNear ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)'
                const badgeColor = isOverdue ? 'var(--accent-coral)' : isNear ? 'var(--accent-amber)' : 'var(--accent-green)'
                const badgeText = isOverdue ? '🔴 Refuerzo Vencido' : isNear ? `🟡 Refuerzo en ${daysDiff} días` : '🟢 Vigente'

                return (
                  <div key={v.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${badgeColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {v.vet_pets?.name || 'Mascota'} ({v.vet_pets?.species})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Tutor: {v.vet_pets?.owner_name}
                        </div>
                      </div>

                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: badgeBg, color: badgeColor }}>
                        {badgeText}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent-blue)', marginBottom: 2 }}>
                        {v.type === 'vaccine' ? '💉 Vacuna:' : '💊 Desparasitante:'} {v.vaccine_name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: 4 }}>
                        <span>Aplicada: {formatDate(v.applied_date)}</span>
                        <span><strong>Refuerzo: {formatDate(v.next_due_date)}</strong></span>
                      </div>
                      {v.lot_number && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                          Lote: {v.lot_number} • {v.vet_name}
                        </div>
                      )}
                    </div>

                    {/* WhatsApp reminder button */}
                    {v.vet_pets?.owner_phone && (
                      <a
                        href={getVaccineWhatsAppUrl(v)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-neu"
                        style={{ width: '100%', padding: '7px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#16A34A', color: '#fff', fontWeight: 700 }}
                      >
                        <MessageSquare size={14} />
                        <span>Enviar Recordatorio WhatsApp</span>
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: GROOMING & HOTEL ── */}
      {activeTab === 'grooming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groomingList.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛁</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay servicios de spa o guardería activos</h3>
              <button onClick={() => setShowGroomingModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Registrar ingreso a spa / hotel
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {groomingList.map(item => {
                const isInService = item.status === 'in_service'
                const isReady = item.status === 'ready_for_pickup'
                const isCompleted = item.status === 'completed'

                const statusColor = isInService ? 'var(--accent-amber)' : isReady ? 'var(--accent-green)' : 'var(--text-muted)'
                const statusText = isInService ? '🛁 En Servicio / Baño' : isReady ? '🌟 Listo para Entrega' : '✅ Entregado'

                return (
                  <div key={item.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {item.pet_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Tutor: {item.owner_name} {item.owner_phone ? `(${item.owner_phone})` : ''}
                        </div>
                      </div>

                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor }}>
                        {statusText}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-coral)' }}>{item.service_description}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.72rem' }}>
                        <span>Ingreso: {formatDateTime(item.check_in)}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(item.total_price))}</strong>
                      </div>
                    </div>

                    {item.special_instructions && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontStyle: 'italic' }}>
                        ⚠️ Indicaciones: {item.special_instructions}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {isInService && (
                        <button
                          onClick={() => handleUpdateGroomingStatus(item.id, 'ready_for_pickup')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', background: 'var(--accent-green)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <Sparkles size={14} />
                          <span>Listo para Recoger</span>
                        </button>
                      )}

                      {isReady && (
                        <>
                          {item.owner_phone && (
                            <a
                              href={getGroomingReadyWhatsAppUrl(item)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-neu"
                              style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: '#16A34A', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            >
                              <MessageSquare size={13} />
                              <span>Avisar WhatsApp</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleUpdateGroomingStatus(item.id, 'completed')}
                            className="btn-neu btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                          >
                            Entregar al Dueño
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CONCENTRADO A GRANEL ── */}
      {activeTab === 'feed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {feedList.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚖️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay alimentos concentrados configurados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra bultos de comida para perros y gatos para vender fraccionado por kilos o libras.
              </p>
              <button onClick={() => setShowFeedModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Registrar primer concentrado
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {feedList.map(feed => {
                const percent = Math.round((Number(feed.current_sack_remaining_kg) / Number(feed.sack_weight_kg)) * 100)
                const sackRevenueIfSoldByKg = Number(feed.sack_weight_kg) * Number(feed.price_per_kg)
                const bulkMargin = sackRevenueIfSoldByKg - Number(feed.sack_cost)
                const bulkMarginPercent = feed.sack_cost > 0 ? Math.round((bulkMargin / Number(feed.sack_cost)) * 100) : 0

                return (
                  <div key={feed.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 800, background: 'var(--bg-deep)', color: 'var(--accent-coral)' }}>
                          {feed.target_species} • Bulto {feed.sack_weight_kg}kg
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 4 }}>
                          {feed.brand_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                          {formatCurrency(Number(feed.price_per_kg))}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>por kilo ({formatCurrency(Number(feed.price_per_pound))} / lb)</div>
                      </div>
                    </div>

                    {/* Progress Bar for remaining Kg in open sack */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-primary)' }}>
                          Bulto Abierto: <strong>{feed.current_sack_remaining_kg} kg restantes</strong>
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{feed.sealed_sacks_in_stock} bultos en bodega</span>
                      </div>
                      <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, percent)}%`,
                          height: '100%',
                          borderRadius: 4,
                          background: 'linear-gradient(90deg, #10B981, #3B82F6)',
                          transition: '0.3s ease'
                        }} />
                      </div>
                    </div>

                    {/* Fractioning Margin KPI */}
                    <div style={{ background: 'var(--bg-deep)', padding: 8, borderRadius: 8, fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Margen por fraccionar:</span>
                      <strong style={{ color: 'var(--accent-green)' }}>+{formatCurrency(bulkMargin)} (+{bulkMarginPercent}%)</strong>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setSelectedFeedForSale(feed)}
                        className="btn-neu btn-primary"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem' }}
                      >
                        - Descontar Kilos Vendidos
                      </button>
                      <button
                        onClick={() => handleOpenNewSack(feed)}
                        className="btn-neu btn-ghost"
                        title="Abrir un bulto nuevo de bodega"
                        style={{ padding: '7px 10px', fontSize: '0.72rem' }}
                      >
                        + Abrir Bulto
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: NUEVA MASCOTA / PACIENTE ── */}
      {showPetModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🐾 Registrar Mascota / Paciente
              </h2>
              <button onClick={() => setShowPetModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreatePet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Mascota *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Luna"
                    value={petForm.name}
                    onChange={e => setPetForm(f => ({ ...f, name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Especie</label>
                  <select
                    className="input-neu"
                    value={petForm.species}
                    onChange={e => setPetForm(f => ({ ...f, species: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🦜 Ave</option>
                    <option value="Conejo">🐰 Conejo</option>
                    <option value="Exótico">🦎 Exótico</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Raza</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Golden Retriever"
                    value={petForm.breed}
                    onChange={e => setPetForm(f => ({ ...f, breed: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Sexo</label>
                  <select
                    className="input-neu"
                    value={petForm.gender}
                    onChange={e => setPetForm(f => ({ ...f, gender: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Peso (kg)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={petForm.weight_kg}
                    onChange={e => setPetForm(f => ({ ...f, weight_kg: Number(e.target.value) }))}
                    step={0.1}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>Datos del Tutor / Dueño</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre Tutor *</label>
                    <input
                      type="text"
                      className="input-neu"
                      value={petForm.owner_name}
                      onChange={e => setPetForm(f => ({ ...f, owner_name: e.target.value }))}
                      required
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>WhatsApp / Celular</label>
                    <input
                      type="text"
                      className="input-neu"
                      placeholder="3124567890"
                      value={petForm.owner_phone}
                      onChange={e => setPetForm(f => ({ ...f, owner_phone: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Antecedentes Médicos / Alergias</label>
                <input
                  type="text"
                  className="input-neu"
                  value={petForm.medical_notes}
                  onChange={e => setPetForm(f => ({ ...f, medical_notes: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowPetModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Mascota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA CONSULTA MÉDICA ── */}
      {showConsultModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🩺 Consulta Médica — {showConsultModal.name}
                </h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {showConsultModal.species} • {showConsultModal.breed} • Tutor: {showConsultModal.owner_name}
                </div>
              </div>
              <button onClick={() => setShowConsultModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateClinicalRecord} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Vital Signs Grid */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-coral)', marginBottom: 6 }}>Signos Vitales</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Temp (°C)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={consultForm.temp_c}
                      onChange={e => setConsultForm(f => ({ ...f, temp_c: Number(e.target.value) }))}
                      step={0.1}
                      style={{ width: '100%', fontSize: '0.78rem', padding: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>FC (LPM)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={consultForm.heart_rate}
                      onChange={e => setConsultForm(f => ({ ...f, heart_rate: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.78rem', padding: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>FR (RPM)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={consultForm.resp_rate}
                      onChange={e => setConsultForm(f => ({ ...f, resp_rate: Number(e.target.value) }))}
                      style={{ width: '100%', fontSize: '0.78rem', padding: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Peso (kg)</label>
                    <input
                      type="number"
                      className="input-neu"
                      value={consultForm.weight_kg}
                      onChange={e => setConsultForm(f => ({ ...f, weight_kg: Number(e.target.value) }))}
                      step={0.1}
                      style={{ width: '100%', fontSize: '0.78rem', padding: '4px' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Motivo de Consulta *</label>
                <input
                  type="text"
                  className="input-neu"
                  value={consultForm.reason_for_visit}
                  onChange={e => setConsultForm(f => ({ ...f, reason_for_visit: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Diagnóstico Médico *</label>
                <textarea
                  className="input-neu"
                  rows={2}
                  value={consultForm.diagnosis}
                  onChange={e => setConsultForm(f => ({ ...f, diagnosis: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tratamiento & Fórmula Médica</label>
                <textarea
                  className="input-neu"
                  rows={2}
                  value={consultForm.treatment_plan}
                  onChange={e => setConsultForm(f => ({ ...f, treatment_plan: e.target.value }))}
                  placeholder="Medicamento, dosis, frecuencia y duración..."
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowConsultModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR VACUNA / DESPARASITACIÓN ── */}
      {showVaccineModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                💉 Aplicar Vacuna — {showVaccineModal.name}
              </h2>
              <button onClick={() => setShowVaccineModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateVaccination} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo</label>
                  <select
                    className="input-neu"
                    value={vaccineForm.type}
                    onChange={e => setVaccineForm(f => ({ ...f, type: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="vaccine">💉 Vacuna</option>
                    <option value="deworming">💊 Desparasitante</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre del Biológico *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Séxtuple / Rabia / Triple Felina"
                    value={vaccineForm.vaccine_name}
                    onChange={e => setVaccineForm(f => ({ ...f, vaccine_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Fecha Aplicación</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={vaccineForm.applied_date}
                    onChange={e => setVaccineForm(f => ({ ...f, applied_date: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Próximo Refuerzo *</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={vaccineForm.next_due_date}
                    onChange={e => setVaccineForm(f => ({ ...f, next_due_date: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Número de Lote</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="LOT-2026-99"
                  value={vaccineForm.lot_number}
                  onChange={e => setVaccineForm(f => ({ ...f, lot_number: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowVaccineModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Registrar Vacuna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: INGRESO GROOMING / HOTEL ── */}
      {showGroomingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🛁 Ingreso a Grooming / Guardería
              </h2>
              <button onClick={() => setShowGroomingModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateGrooming} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Mascota *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Luna"
                    value={groomingForm.pet_name}
                    onChange={e => setGroomingForm(f => ({ ...f, pet_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tutor / Dueño *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Camila Montoya"
                    value={groomingForm.owner_name}
                    onChange={e => setGroomingForm(f => ({ ...f, owner_name: e.target.value }))}
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
                    value={groomingForm.owner_phone}
                    onChange={e => setGroomingForm(f => ({ ...f, owner_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Servicio ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={groomingForm.total_price}
                    onChange={e => setGroomingForm(f => ({ ...f, total_price: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Descripción del Servicio</label>
                <input
                  type="text"
                  className="input-neu"
                  value={groomingForm.service_description}
                  onChange={e => setGroomingForm(f => ({ ...f, service_description: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Indicaciones Especiales (Alergias / Cuidado)</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Champú especial, no mojar oídos..."
                  value={groomingForm.special_instructions}
                  onChange={e => setGroomingForm(f => ({ ...f, special_instructions: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowGroomingModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Ingresando...' : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DESCONTAR KILOS DE CONCENTRADO ── */}
      {selectedFeedForSale && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ⚖️ Despachar Concentrado Suelto
              </h2>
              <button onClick={() => setSelectedFeedForSale(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedFeedForSale.brand_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Disponible en bulto abierto: <strong>{selectedFeedForSale.current_sack_remaining_kg} kg</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Kilos a Despachar</label>
                <input
                  type="number"
                  className="input-neu"
                  value={feedKilosToSell}
                  onChange={e => setFeedKilosToSell(Number(e.target.value))}
                  step={0.5}
                  min={0.5}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Total a Cobrar</label>
                <div style={{ padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8, fontWeight: 900, color: 'var(--accent-green)', fontSize: '1.05rem' }}>
                  {formatCurrency(feedKilosToSell * Number(selectedFeedForSale.price_per_kg))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
              <button type="button" onClick={() => setSelectedFeedForSale(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
              <button
                type="button"
                onClick={() => handleSellFeedKilos(selectedFeedForSale, feedKilosToSell)}
                className="btn-neu btn-primary"
                style={{ padding: '8px 20px' }}
              >
                Confirmar Despacho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO CONCENTRADO ── */}
      {showFeedModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ⚖️ Registrar Concentrado a Granel
              </h2>
              <button onClick={() => setShowFeedModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateFeed} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Marca y Línea del Alimento *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Royal Canin Maxi Adult 20kg"
                  value={feedForm.brand_name}
                  onChange={e => setFeedForm(f => ({ ...f, brand_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Especie</label>
                  <select
                    className="input-neu"
                    value={feedForm.target_species}
                    onChange={e => setFeedForm(f => ({ ...f, target_species: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🦜 Aves</option>
                    <option value="Roedor">🐹 Roedores</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Peso del Bulto (kg)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={feedForm.sack_weight_kg}
                    onChange={e => setFeedForm(f => ({ ...f, sack_weight_kg: Number(e.target.value), current_sack_remaining_kg: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Costo Bulto ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={feedForm.sack_cost}
                    onChange={e => setFeedForm(f => ({ ...f, sack_cost: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio/Kg ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={feedForm.price_per_kg}
                    onChange={e => setFeedForm(f => ({ ...f, price_per_kg: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Bultos Bodega</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={feedForm.sealed_sacks_in_stock}
                    onChange={e => setFeedForm(f => ({ ...f, sealed_sacks_in_stock: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowFeedModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Concentrado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTORIAL CLÍNICO COMPLETO DE MASCOTA ── */}
      {selectedPetForHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📜 Historia Clínica — {selectedPetForHistory.name}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedPetForHistory.species} • {selectedPetForHistory.breed} • Tutor: {selectedPetForHistory.owner_name} ({selectedPetForHistory.owner_phone})
                </div>
              </div>
              <button onClick={() => setSelectedPetForHistory(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clinicalRecords.filter(c => c.pet_id === selectedPetForHistory.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No hay consultas registradas para esta mascota aún.
                </div>
              ) : (
                clinicalRecords.filter(c => c.pet_id === selectedPetForHistory.id).map(c => (
                  <div key={c.id} style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-coral)' }}>
                        Fecha: {formatDate(c.visit_date)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.vet_name}</span>
                    </div>

                    <div style={{ fontSize: '0.78rem' }}>
                      <strong>Motivo:</strong> {c.reason_for_visit}
                    </div>

                    <div style={{ fontSize: '0.78rem' }}>
                      <strong>Diagnóstico:</strong> {c.diagnosis}
                    </div>

                    {c.treatment_plan && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.08)', padding: '6px 10px', borderRadius: 6 }}>
                        <strong>Plan & Receta:</strong> {c.treatment_plan}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: 4 }}>
                      <span>Temp: {c.vital_signs?.temp_c || '--'}°C</span>
                      <span>FC: {c.vital_signs?.heart_rate || '--'} lpm</span>
                      <span>FR: {c.vital_signs?.resp_rate || '--'} rpm</span>
                      <span>Peso: {c.vital_signs?.weight_kg || '--'} kg</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
              <button type="button" onClick={() => setSelectedPetForHistory(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
