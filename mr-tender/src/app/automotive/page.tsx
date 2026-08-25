'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Car,
  Wrench,
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
  Fuel,
  Gauge,
  UserCheck
} from 'lucide-react'

interface AutoWorkOrder {
  id: string
  tenant_id: string
  order_number: string
  plate_number: string
  vehicle_type: string
  brand_model: string
  mileage_km: number
  fuel_level: string
  customer_name: string
  customer_phone?: string | null
  assigned_mechanic?: string | null
  reason_for_entry: string
  checklist_json: {
    scratches?: boolean
    spare_tire?: boolean
    tools?: boolean
    documents?: boolean
  }
  labor_subtotal: number
  parts_subtotal: number
  total_price: number
  status: 'received' | 'in_diagnosis' | 'waiting_approval' | 'in_progress' | 'ready_for_delivery' | 'delivered' | 'cancelled'
  estimated_delivery_at?: string | null
  delivered_at?: string | null
  created_at: string
  parts?: AutoOrderPart[]
}

interface AutoOrderPart {
  id: string
  order_id: string
  item_type: 'part' | 'labor'
  description: string
  quantity: number
  unit_price: number
  total_price: number
  mechanic_commission: number
  created_at: string
}

interface AutoPreventiveAlert {
  id: string
  tenant_id: string
  plate_number: string
  customer_name: string
  customer_phone?: string | null
  alert_type: 'oil_change' | 'soat' | 'techno_inspection' | 'timing_belt' | 'brakes'
  due_date?: string | null
  due_mileage_km?: number | null
  last_service_date: string
  last_service_km: number
  notes?: string | null
  status: 'pending' | 'notified' | 'serviced'
  created_at: string
}

interface AutoCarwashQueue {
  id: string
  tenant_id: string
  plate_number: string
  vehicle_type: string
  customer_name: string
  customer_phone?: string | null
  wash_type: string
  washer_name?: string | null
  price: number
  status: 'waiting' | 'washing' | 'drying' | 'ready' | 'delivered'
  check_in: string
  completed_at?: string | null
  created_at: string
}

export default function AutomotivePage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'orders' | 'carwash' | 'alerts' | 'services'>('orders')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [workOrders, setWorkOrders] = useState<AutoWorkOrder[]>([])
  const [alerts, setAlerts] = useState<AutoPreventiveAlert[]>([])
  const [carwashList, setCarwashList] = useState<AutoCarwashQueue[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showCarwashModal, setShowCarwashModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedOrderForParts, setSelectedOrderForParts] = useState<AutoWorkOrder | null>(null)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<AutoWorkOrder | null>(null)

  // Forms
  const [orderForm, setOrderForm] = useState({
    plate_number: '',
    vehicle_type: 'Automóvil',
    brand_model: '',
    mileage_km: 45000,
    fuel_level: '1/2',
    customer_name: '',
    customer_phone: '',
    assigned_mechanic: 'Carlos Mario (Mecánico Jefe)',
    reason_for_entry: 'Mantenimiento de frenos y cambio de aceite',
    scratches: false,
    spare_tire: true,
    tools: true,
    documents: true
  })

  const [partForm, setPartForm] = useState({
    item_type: 'part' as 'part' | 'labor',
    description: '',
    quantity: 1,
    unit_price: 60000,
    mechanic_commission: 0
  })

  const [carwashForm, setCarwashForm] = useState({
    plate_number: '',
    vehicle_type: 'Automóvil',
    customer_name: '',
    customer_phone: '',
    wash_type: 'Lavado General + Cera',
    washer_name: 'Brayan (Lavador 1)',
    price: 30000
  })

  const [alertForm, setAlertForm] = useState({
    plate_number: '',
    customer_name: '',
    customer_phone: '',
    alert_type: 'oil_change' as 'oil_change' | 'soat' | 'techno_inspection' | 'timing_belt' | 'brakes',
    due_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_mileage_km: 50000,
    last_service_date: new Date().toISOString().split('T')[0],
    last_service_km: 45000,
    notes: 'Aceite 10W-30 Sintético + Filtro original'
  })

  useEffect(() => {
    loadAutomotiveData()
  }, [])

  async function loadAutomotiveData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [ordersRes, partsRes, alertsRes, washRes] = await Promise.all([
        supabase.from('auto_work_orders').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(40),
        supabase.from('auto_order_parts').select('*').order('created_at', { ascending: true }),
        supabase.from('auto_preventive_alerts').select('*').eq('tenant_id', tid).order('due_date', { ascending: true }),
        supabase.from('auto_carwash_queue').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(30)
      ])

      const allParts = partsRes.data || []
      const ordersWithParts: AutoWorkOrder[] = (ordersRes.data || []).map((o: any) => ({
        ...o,
        parts: allParts.filter((p: any) => p.order_id === o.id)
      }))

      setWorkOrders(ordersWithParts)
      setAlerts(alertsRes.data || [])
      setCarwashList(washRes.data || [])
    } catch (err) {
      console.error('Error loading automotive data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Work Order
  async function handleCreateWorkOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!orderForm.plate_number.trim()) return alert('Ingresa la placa del vehículo')
    if (!orderForm.customer_name.trim()) return alert('Ingresa el nombre del cliente')

    setSubmitting(true)
    try {
      const orderNumber = `OT-${Date.now().toString().slice(-5)}`
      const payload = {
        tenant_id: tenantId,
        order_number: orderNumber,
        plate_number: orderForm.plate_number.trim().toUpperCase(),
        vehicle_type: orderForm.vehicle_type,
        brand_model: orderForm.brand_model.trim() || 'No especificado',
        mileage_km: Number(orderForm.mileage_km) || 0,
        fuel_level: orderForm.fuel_level,
        customer_name: orderForm.customer_name.trim(),
        customer_phone: orderForm.customer_phone.trim() || null,
        assigned_mechanic: orderForm.assigned_mechanic.trim() || null,
        reason_for_entry: orderForm.reason_for_entry.trim(),
        checklist_json: {
          scratches: orderForm.scratches,
          spare_tire: orderForm.spare_tire,
          tools: orderForm.tools,
          documents: orderForm.documents
        },
        labor_subtotal: 0,
        parts_subtotal: 0,
        total_price: 0,
        status: 'in_diagnosis'
      }

      const { error } = await supabase.from('auto_work_orders').insert(payload)
      if (error) throw error

      setShowOrderModal(false)
      setOrderForm({
        plate_number: '',
        vehicle_type: 'Automóvil',
        brand_model: '',
        mileage_km: 45000,
        fuel_level: '1/2',
        customer_name: '',
        customer_phone: '',
        assigned_mechanic: 'Carlos Mario (Mecánico Jefe)',
        reason_for_entry: '',
        scratches: false,
        spare_tire: true,
        tools: true,
        documents: true
      })
      await loadAutomotiveData()
    } catch (err: any) {
      alert(err.message || 'Error al crear orden de trabajo')
    } finally {
      setSubmitting(false)
    }
  }

  // Add Part / Labor to Work Order
  async function handleAddPartToOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedOrderForParts || submitting) return
    if (!partForm.description.trim()) return alert('Ingresa la descripción del repuesto o mano de obra')

    setSubmitting(true)
    try {
      const qty = Number(partForm.quantity) || 1
      const price = Number(partForm.unit_price) || 0
      const itemTotal = qty * price
      const comm = Number(partForm.mechanic_commission) || 0

      // 1. Insert item
      const { error: pErr } = await supabase.from('auto_order_parts').insert({
        order_id: selectedOrderForParts.id,
        item_type: partForm.item_type,
        description: partForm.description.trim(),
        quantity: qty,
        unit_price: price,
        total_price: itemTotal,
        mechanic_commission: comm
      })
      if (pErr) throw pErr

      // 2. Update order totals
      const isPart = partForm.item_type === 'part'
      const newLabor = Number(selectedOrderForParts.labor_subtotal) + (isPart ? 0 : itemTotal)
      const newParts = Number(selectedOrderForParts.parts_subtotal) + (isPart ? itemTotal : 0)
      const newTotal = newLabor + newParts

      await supabase.from('auto_work_orders').update({
        labor_subtotal: newLabor,
        parts_subtotal: newParts,
        total_price: newTotal,
        updated_at: new Date().toISOString()
      }).eq('id', selectedOrderForParts.id)

      setShowOrderModal(false)
      setSelectedOrderForParts(null)
      setPartForm({
        item_type: 'part',
        description: '',
        quantity: 1,
        unit_price: 60000,
        mechanic_commission: 0
      })
      await loadAutomotiveData()
    } catch (err: any) {
      alert(err.message || 'Error al agregar ítem')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Work Order Status
  async function handleUpdateOrderStatus(orderId: string, status: AutoWorkOrder['status']) {
    try {
      const payload: any = { status, updated_at: new Date().toISOString() }
      if (status === 'delivered') payload.delivered_at = new Date().toISOString()

      const { error } = await supabase.from('auto_work_orders').update(payload).eq('id', orderId)
      if (error) throw error
      await loadAutomotiveData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Carwash Entry
  async function handleCreateCarwash(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!carwashForm.plate_number.trim()) return alert('Ingresa la placa del vehículo')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        plate_number: carwashForm.plate_number.trim().toUpperCase(),
        vehicle_type: carwashForm.vehicle_type,
        customer_name: carwashForm.customer_name.trim() || 'Cliente Mostrador',
        customer_phone: carwashForm.customer_phone.trim() || null,
        wash_type: carwashForm.wash_type,
        washer_name: carwashForm.washer_name.trim() || null,
        price: Number(carwashForm.price),
        status: 'waiting'
      }

      const { error } = await supabase.from('auto_carwash_queue').insert(payload)
      if (error) throw error

      setShowCarwashModal(false)
      setCarwashForm({
        plate_number: '',
        vehicle_type: 'Automóvil',
        customer_name: '',
        customer_phone: '',
        wash_type: 'Lavado General + Cera',
        washer_name: 'Brayan (Lavador 1)',
        price: 30000
      })
      await loadAutomotiveData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar autolavado')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Carwash Status
  async function handleUpdateCarwashStatus(id: string, status: AutoCarwashQueue['status']) {
    try {
      const payload: any = { status }
      if (status === 'ready' || status === 'delivered') payload.completed_at = new Date().toISOString()

      const { error } = await supabase.from('auto_carwash_queue').update(payload).eq('id', id)
      if (error) throw error
      await loadAutomotiveData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Preventive Alert
  async function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!alertForm.plate_number.trim()) return alert('Ingresa la placa')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        plate_number: alertForm.plate_number.trim().toUpperCase(),
        customer_name: alertForm.customer_name.trim(),
        customer_phone: alertForm.customer_phone.trim() || null,
        alert_type: alertForm.alert_type,
        due_date: alertForm.due_date || null,
        due_mileage_km: Number(alertForm.due_mileage_km) || null,
        last_service_date: alertForm.last_service_date,
        last_service_km: Number(alertForm.last_service_km) || 0,
        notes: alertForm.notes || null,
        status: 'pending'
      }

      const { error } = await supabase.from('auto_preventive_alerts').insert(payload)
      if (error) throw error

      setShowAlertModal(false)
      await loadAutomotiveData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar alerta')
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Alert Link Generator
  function getWhatsAppAlertUrl(al: AutoPreventiveAlert) {
    if (!al.customer_phone) return '#'
    const cleanPhone = al.customer_phone.replace(/\D/g, '')
    const typeLabel = al.alert_type === 'oil_change' ? 'Cambio de Aceite & Filtros'
      : al.alert_type === 'soat' ? 'Renovación de SOAT'
      : al.alert_type === 'techno_inspection' ? 'Revisión Tecnomecánica'
      : al.alert_type === 'timing_belt' ? 'Cambio de Correa de Repartición'
      : 'Revisión de Frenos'

    const msg = encodeURIComponent(
      `¡Hola ${al.customer_name}! 🚗 Te saludamos del Taller Automotriz. Te recordamos que a tu vehículo con placa *${al.plate_number}* le corresponde su *${typeLabel}* próximo a vencer el ${formatDate(al.due_date || '')}. ¡Contáctanos para agendar tu cita y mantener tu vehículo al 100%!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // WhatsApp Carwash Ready Link
  function getCarwashReadyWhatsAppUrl(item: AutoCarwashQueue) {
    if (!item.customer_phone) return '#'
    const cleanPhone = item.customer_phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `¡Hola ${item.customer_name}! 🚗✨ Te avisamos que tu vehículo placa *${item.plate_number}* ya está listo, impecable y brillante en el Autolavado. ¡Puedes pasar a recogerlo cuando desees!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // Seed Demo Data for Automotive
  async function handleSeedAutomotiveDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Work Orders
      const demoOrders = [
        {
          tenant_id: tenantId,
          order_number: 'OT-10482',
          plate_number: 'ABC-123',
          vehicle_type: 'Automóvil',
          brand_model: 'Mazda 3 Grand Touring 2022',
          mileage_km: 42300,
          fuel_level: '3/4',
          customer_name: 'Santiago Morales',
          customer_phone: '3128901234',
          assigned_mechanic: 'Carlos Mario (Mecánico Jefe)',
          reason_for_entry: 'Ruido al frenar y mantenimiento preventivo 40.000 km',
          checklist_json: { scratches: false, spare_tire: true, tools: true, documents: true },
          labor_subtotal: 120000,
          parts_subtotal: 210000,
          total_price: 330000,
          status: 'in_progress'
        },
        {
          tenant_id: tenantId,
          order_number: 'OT-10483',
          plate_number: 'XYZ-45E',
          vehicle_type: 'Motocicleta',
          brand_model: 'Yamaha MT-09 2023',
          mileage_km: 15400,
          fuel_level: 'Full',
          customer_name: 'Daniela Salazar',
          customer_phone: '3157894561',
          assigned_mechanic: 'Sebastián (Técnico Motos)',
          reason_for_entry: 'Cambio de kit de arrastre y sincronización',
          checklist_json: { scratches: true, spare_tire: false, tools: false, documents: true },
          labor_subtotal: 80000,
          parts_subtotal: 350000,
          total_price: 430000,
          status: 'ready_for_delivery'
        }
      ]
      const { data: createdOrders } = await supabase.from('auto_work_orders').insert(demoOrders).select()

      if (createdOrders && createdOrders.length > 0) {
        // Add parts to order 1
        await supabase.from('auto_order_parts').insert([
          { order_id: createdOrders[0].id, item_type: 'part', description: 'Pastillas de freno delanteras de cerámica', quantity: 1, unit_price: 150000, total_price: 150000, mechanic_commission: 0 },
          { order_id: createdOrders[0].id, item_type: 'part', description: 'Líquido de frenos DOT 4 Bosch', quantity: 2, unit_price: 30000, total_price: 60000, mechanic_commission: 0 },
          { order_id: createdOrders[0].id, item_type: 'labor', description: 'Mano de obra cambio de frenos y purga de sistema', quantity: 1, unit_price: 120000, total_price: 120000, mechanic_commission: 48000 }
        ])
      }

      // 2. Carwash Queue
      const demoWash = [
        {
          tenant_id: tenantId,
          plate_number: 'KLR-789',
          vehicle_type: 'Camioneta/SUV',
          customer_name: 'Mauricio Henao',
          customer_phone: '3104567890',
          wash_type: 'Lavado General + Polichado y Grafito',
          washer_name: 'Brayan (Lavador 1)',
          price: 55000,
          status: 'washing'
        },
        {
          tenant_id: tenantId,
          plate_number: 'UYT-321',
          vehicle_type: 'Automóvil',
          customer_name: 'Valentina Restrepo',
          customer_phone: '3201234567',
          wash_type: 'Lavado Sencillo + Aspirado',
          washer_name: 'Juan (Lavador 2)',
          price: 25000,
          status: 'ready'
        }
      ]
      await supabase.from('auto_carwash_queue').insert(demoWash)

      // 3. Preventive alerts
      const demoAlerts = [
        {
          tenant_id: tenantId,
          plate_number: 'ABC-123',
          customer_name: 'Santiago Morales',
          customer_phone: '3128901234',
          alert_type: 'oil_change',
          due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_mileage_km: 47000,
          last_service_date: '2026-03-10',
          last_service_km: 42000,
          notes: 'Aceite Mobil 1 5W-30 Sintético',
          status: 'pending'
        },
        {
          tenant_id: tenantId,
          plate_number: 'KLR-789',
          customer_name: 'Mauricio Henao',
          customer_phone: '3104567890',
          alert_type: 'soat',
          due_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_mileage_km: 80000,
          last_service_date: '2025-09-02',
          last_service_km: 70000,
          notes: 'Seguros del Estado',
          status: 'pending'
        }
      ]
      await supabase.from('auto_preventive_alerts').insert(demoAlerts)

      await loadAutomotiveData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Work Orders
  const filteredOrders = workOrders.filter(o => {
    const q = searchQuery.toLowerCase()
    const matchQ = o.plate_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.brand_model.toLowerCase().includes(q) ||
      o.order_number.toLowerCase().includes(q)
    const matchS = filterStatus === 'all' || o.status === filterStatus
    return matchQ && matchS
  })

  // KPIs
  const activeOrdersCount = workOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
  const readyOrdersCount = workOrders.filter(o => o.status === 'ready_for_delivery').length
  const carwashActiveCount = carwashList.filter(w => w.status === 'washing' || w.status === 'drying' || w.status === 'ready').length
  const totalWorkshopRevenue = workOrders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + Number(o.total_price), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>🚗</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Taller Mecánico, Serviteca & Autolavado
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Órdenes de trabajo por placa, repuestos + mano de obra, cola de autolavado y alertas de SOAT/mantenimiento
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAutomotiveData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {workOrders.length === 0 && carwashList.length === 0 && (
            <button onClick={handleSeedAutomotiveDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
              ✨ Cargar Datos Demo de Taller
            </button>
          )}
          {activeTab === 'orders' && (
            <button onClick={() => setShowOrderModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Orden de Trabajo</span>
            </button>
          )}
          {activeTab === 'carwash' && (
            <button onClick={() => setShowCarwashModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Ingresar a Lavado</span>
            </button>
          )}
          {activeTab === 'alerts' && (
            <button onClick={() => setShowAlertModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Alerta Preventiva</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Órdenes en Taller (Activas)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {activeOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Vehículos en proceso mecánico
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Listos para Entrega
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {readyOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Reparación finalizada
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Cola de Autolavado
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {carwashActiveCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {carwashList.filter(w => w.status === 'ready').length} listos para entrega
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Alertas SOAT / Mantenimiento
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {alerts.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Clientes para fidelización y WhatsApp
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('orders')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'orders' ? 800 : 500,
            background: activeTab === 'orders' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'orders' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Wrench size={15} />
          <span>Órdenes de Trabajo OT ({activeOrdersCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('carwash')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'carwash' ? 800 : 500,
            background: activeTab === 'carwash' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'carwash' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={15} />
          <span>Cola de Autolavado ({carwashList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'alerts' ? 800 : 500,
            background: activeTab === 'alerts' ? 'var(--accent-blue)' : 'var(--bg)',
            color: activeTab === 'alerts' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={15} />
          <span>Alertas SOAT & Mantenimiento ({alerts.length})</span>
        </button>
      </div>

      {/* ── TAB 1: ÓRDENES DE TRABAJO (OT) ── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por placa (ej: ABC-123), cliente o modelo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <select
              className="input-neu"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <option value="all">Todos los estados</option>
              <option value="in_diagnosis">Recepción / Diagnóstico</option>
              <option value="in_progress">En Reparación</option>
              <option value="ready_for_delivery">Listo para Entrega</option>
              <option value="delivered">Entregado</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🚗</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay órdenes de trabajo activas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Crea una orden con la placa del vehículo, checklist de recepción y desglose de repuestos.
              </p>
              <button onClick={() => setShowOrderModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primera orden de trabajo
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {filteredOrders.map(order => {
                const isInDiagnosis = order.status === 'in_diagnosis' || order.status === 'received'
                const isInProgress = order.status === 'in_progress'
                const isReady = order.status === 'ready_for_delivery'
                const isDelivered = order.status === 'delivered'

                const statusColor = isInDiagnosis ? 'var(--accent-blue)'
                  : isInProgress ? 'var(--accent-amber)'
                  : isReady ? 'var(--accent-green)'
                  : 'var(--text-muted)'

                const statusText = isInDiagnosis ? '🔍 Diagnóstico'
                  : isInProgress ? '🔧 En Reparación'
                  : isReady ? '✨ Listo para Entrega'
                  : '✅ Entregado'

                return (
                  <div key={order.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Colombian style license plate badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          background: '#FBBF24',
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          letterSpacing: '0.06em',
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: '2px solid #000',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {order.plate_number}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {order.brand_model}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {order.vehicle_type} • <strong>{order.mileage_km.toLocaleString()} km</strong> • Gas: {order.fuel_level}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Customer & Mechanic info */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                        <strong>{order.customer_name} {order.customer_phone ? `(${order.customer_phone})` : ''}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Mecánico:</span>
                        <span>{order.assigned_mechanic || 'Por asignar'}</span>
                      </div>
                      <div style={{ color: 'var(--accent-coral)', fontSize: '0.72rem', marginTop: 2 }}>
                        <strong>Motivo:</strong> {order.reason_for_entry}
                      </div>
                    </div>

                    {/* Parts & Labor Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, background: 'var(--bg)', border: '1px solid var(--border-color)', padding: 8, borderRadius: 8, fontSize: '0.72rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Repuestos:</span>
                        <div style={{ fontWeight: 700 }}>{formatCurrency(Number(order.parts_subtotal))}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Mano de Obra:</span>
                        <div style={{ fontWeight: 700 }}>{formatCurrency(Number(order.labor_subtotal))}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Total OT:</span>
                        <div style={{ fontWeight: 900, color: 'var(--accent-blue)' }}>{formatCurrency(Number(order.total_price))}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {!isDelivered && (
                        <button
                          onClick={() => { setSelectedOrderForParts(order); setPartForm({ item_type: 'part', description: '', quantity: 1, unit_price: 50000, mechanic_commission: 0 }) }}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-blue)', fontWeight: 700 }}
                        >
                          + Repuesto/Labor
                        </button>
                      )}

                      {isInDiagnosis && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'in_progress')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Iniciar Reparación
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_delivery')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--accent-green)', color: '#fff', fontWeight: 800 }}
                        >
                          Listo Entrega ✨
                        </button>
                      )}

                      {isReady && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Entregar & Cobrar
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

      {/* ── TAB 2: AUTOLAVADO / CAR WASH ── */}
      {activeTab === 'carwash' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {carwashList.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🧼</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay vehículos en autolavado</h3>
              <button onClick={() => setShowCarwashModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Ingresar vehículo a lavado
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {carwashList.map(wash => {
                const isWaiting = wash.status === 'waiting'
                const isWashing = wash.status === 'washing'
                const isDrying = wash.status === 'drying'
                const isReady = wash.status === 'ready'
                const isDelivered = wash.status === 'delivered'

                const statusColor = isWaiting ? 'var(--text-muted)'
                  : isWashing ? 'var(--accent-blue)'
                  : isDrying ? 'var(--accent-amber)'
                  : isReady ? 'var(--accent-green)'
                  : 'var(--text-muted)'

                const statusText = isWaiting ? '⏳ En Espera'
                  : isWashing ? '🧼 En Lavado'
                  : isDrying ? '💨 Secado / Aspirado'
                  : isReady ? '✨ Listo para Entrega'
                  : '✅ Entregado'

                return (
                  <div key={wash.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          background: '#FBBF24',
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '0.92rem',
                          letterSpacing: '0.06em',
                          padding: '2px 7px',
                          borderRadius: 4,
                          border: '2px solid #000'
                        }}>
                          {wash.plate_number}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {wash.wash_type}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {wash.vehicle_type} • Lavador: {wash.washer_name || 'Turno libre'}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor }}>
                        {statusText}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Cliente:</span> <strong>{wash.customer_name}</strong>
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                        {formatCurrency(Number(wash.price))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {isWaiting && (
                        <button
                          onClick={() => handleUpdateCarwashStatus(wash.id, 'washing')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Iniciar Lavado 🧼
                        </button>
                      )}

                      {isWashing && (
                        <button
                          onClick={() => handleUpdateCarwashStatus(wash.id, 'drying')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--accent-amber)', color: '#fff', fontWeight: 800 }}
                        >
                          Secado & Aspirado 💨
                        </button>
                      )}

                      {isDrying && (
                        <button
                          onClick={() => handleUpdateCarwashStatus(wash.id, 'ready')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--accent-green)', color: '#fff', fontWeight: 800 }}
                        >
                          Marcar Listo ✨
                        </button>
                      )}

                      {isReady && (
                        <>
                          {wash.customer_phone && (
                            <a
                              href={getCarwashReadyWhatsAppUrl(wash)}
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
                            onClick={() => handleUpdateCarwashStatus(wash.id, 'delivered')}
                            className="btn-neu btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                          >
                            Entregar
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

      {/* ── TAB 3: ALERTAS DE SOAT & MANTENIMIENTO PREVENTIVO ── */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alerts.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛡️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay alertas de mantenimiento</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Programa alertas automáticas de cambio de aceite, SOAT y revisión tecnomecánica para enviar recordatorios por WhatsApp.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {alerts.map(al => {
                const today = new Date().toISOString().split('T')[0]
                const isOverdue = al.due_date ? al.due_date < today : false
                const daysDiff = al.due_date ? Math.round((new Date(al.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 999
                const isNear = daysDiff >= 0 && daysDiff <= 15

                const badgeBg = isOverdue ? 'rgba(220, 38, 38, 0.12)' : isNear ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)'
                const badgeColor = isOverdue ? 'var(--accent-coral)' : isNear ? 'var(--accent-amber)' : 'var(--accent-green)'
                const badgeText = isOverdue ? '🔴 Vencido' : isNear ? `🟡 Vence en ${daysDiff} días` : '🟢 Vigente'

                const typeTitle = al.alert_type === 'oil_change' ? '🛢️ Cambio de Aceite'
                  : al.alert_type === 'soat' ? '📄 Seguro Obligatorio SOAT'
                  : al.alert_type === 'techno_inspection' ? '🔍 Tecnomecánica'
                  : al.alert_type === 'timing_belt' ? '⚙️ Correa de Repartición'
                  : '🛑 Pastillas de Freno'

                return (
                  <div key={al.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${badgeColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          background: '#FBBF24',
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '0.9rem',
                          padding: '2px 7px',
                          borderRadius: 4,
                          border: '2px solid #000'
                        }}>
                          {al.plate_number}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {typeTitle}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Cliente: {al.customer_name}
                          </div>
                        </div>
                      </div>

                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, background: badgeBg, color: badgeColor }}>
                        {badgeText}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Fecha Límite:</span>
                        <strong>{al.due_date ? formatDate(al.due_date) : 'Por kilometraje'}</strong>
                      </div>
                      {al.due_mileage_km && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Kilometraje Límite:</span>
                          <strong>{al.due_mileage_km.toLocaleString()} km</strong>
                        </div>
                      )}
                      {al.notes && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>
                          "{al.notes}"
                        </div>
                      )}
                    </div>

                    {/* WhatsApp notification button */}
                    {al.customer_phone && (
                      <a
                        href={getWhatsAppAlertUrl(al)}
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

      {/* ── MODAL: NUEVA ORDEN DE TRABAJO (OT) ── */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🚗 Nueva Orden de Trabajo (OT)
              </h2>
              <button onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateWorkOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Placa *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="ABC-123"
                    value={orderForm.plate_number}
                    onChange={e => setOrderForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem', fontWeight: 900 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo</label>
                  <select
                    className="input-neu"
                    value={orderForm.vehicle_type}
                    onChange={e => setOrderForm(f => ({ ...f, vehicle_type: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Automóvil">Automóvil</option>
                    <option value="Camioneta/SUV">Camioneta / SUV</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Camión/Pesado">Pesado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Kilometraje (km)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={orderForm.mileage_km}
                    onChange={e => setOrderForm(f => ({ ...f, mileage_km: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Marca, Línea y Modelo *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Mazda 3 Grand Touring 2022"
                  value={orderForm.brand_model}
                  onChange={e => setOrderForm(f => ({ ...f, brand_model: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre Cliente *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Santiago Morales"
                    value={orderForm.customer_name}
                    onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3128901234"
                    value={orderForm.customer_phone}
                    onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Mecánico Asignado</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={orderForm.assigned_mechanic}
                    onChange={e => setOrderForm(f => ({ ...f, assigned_mechanic: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nivel Gasolina</label>
                  <select
                    className="input-neu"
                    value={orderForm.fuel_level}
                    onChange={e => setOrderForm(f => ({ ...f, fuel_level: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Reserva">⛽ Reserva</option>
                    <option value="1/4">1/4 Tanque</option>
                    <option value="1/2">1/2 Tanque</option>
                    <option value="3/4">3/4 Tanque</option>
                    <option value="Full">Full Tanque</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Falla Reportada / Mantenimiento *</label>
                <textarea
                  className="input-neu"
                  rows={2}
                  value={orderForm.reason_for_entry}
                  onChange={e => setOrderForm(f => ({ ...f, reason_for_entry: e.target.value }))}
                  required
                  placeholder="Ruido en tren delantero, cambio de aceite y filtros..."
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              {/* Reception Checklist */}
              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>Checklist de Recepción</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={orderForm.scratches}
                      onChange={e => setOrderForm(f => ({ ...f, scratches: e.target.checked }))}
                    />
                    <span>¿Tiene Rayones/Golpes?</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={orderForm.spare_tire}
                      onChange={e => setOrderForm(f => ({ ...f, spare_tire: e.target.checked }))}
                    />
                    <span>Llanta de Repuesto OK</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={orderForm.tools}
                      onChange={e => setOrderForm(f => ({ ...f, tools: e.target.checked }))}
                    />
                    <span>Gato & Herramientas</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={orderForm.documents}
                      onChange={e => setOrderForm(f => ({ ...f, documents: e.target.checked }))}
                    />
                    <span>Documentos en Guantera</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Creando...' : 'Crear Orden de Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR REPUESTO O MANO DE OBRA ── */}
      {selectedOrderForParts && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  + Repuesto / Mano de Obra
                </h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Orden: {selectedOrderForParts.order_number} • Placa: {selectedOrderForParts.plate_number}
                </div>
              </div>
              <button onClick={() => setSelectedOrderForParts(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleAddPartToOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo de Ítem</label>
                  <select
                    className="input-neu"
                    value={partForm.item_type}
                    onChange={e => setPartForm(f => ({ ...f, item_type: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="part">🔩 Repuesto / Insumo</option>
                    <option value="labor">🔧 Mano de Obra</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cantidad</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={partForm.quantity}
                    onChange={e => setPartForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    min={1}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Descripción del Ítem *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Pastillas de freno cerámicas / Cambio de aceite"
                  value={partForm.description}
                  onChange={e => setPartForm(f => ({ ...f, description: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio Unitario ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={partForm.unit_price}
                    onChange={e => setPartForm(f => ({ ...f, unit_price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Total Ítem</label>
                  <div style={{ padding: '6px 8px', background: 'var(--bg-deep)', borderRadius: 6, fontWeight: 900, color: 'var(--accent-blue)', fontSize: '0.9rem' }}>
                    {formatCurrency(partForm.quantity * partForm.unit_price)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setSelectedOrderForParts(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Agregando...' : 'Guardar Ítem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: INGRESAR VEHÍCULO A LAVADERO ── */}
      {showCarwashModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🧼 Ingreso a Autolavado (Car Wash)
              </h2>
              <button onClick={() => setShowCarwashModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCarwash} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Placa *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="ABC-123"
                    value={carwashForm.plate_number}
                    onChange={e => setCarwashForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem', fontWeight: 900 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo Vehículo</label>
                  <select
                    className="input-neu"
                    value={carwashForm.vehicle_type}
                    onChange={e => setCarwashForm(f => ({ ...f, vehicle_type: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Automóvil">Automóvil</option>
                    <option value="Camioneta/SUV">Camioneta / SUV</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Pesado">Pesado</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo de Lavado / Servicio *</label>
                <select
                  className="input-neu"
                  value={carwashForm.wash_type}
                  onChange={e => {
                    const t = e.target.value
                    const p = t.includes('Polichado') ? 60000 : t.includes('Motor') ? 45000 : t.includes('Cera') ? 30000 : 22000
                    setCarwashForm(f => ({ ...f, wash_type: t, price: p }))
                  }}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                >
                  <option value="Lavado Sencillo + Aspirado">Lavado Sencillo + Aspirado ($22.000)</option>
                  <option value="Lavado General + Cera">Lavado General + Cera ($30.000)</option>
                  <option value="Lavado de Motor + Chasis">Lavado de Motor + Chasis ($45.000)</option>
                  <option value="Polichado / Detailing">Polichado / Detailing ($60.000)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cliente</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Mauricio Henao"
                    value={carwashForm.customer_name}
                    onChange={e => setCarwashForm(f => ({ ...f, customer_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>WhatsApp</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3104567890"
                    value={carwashForm.customer_phone}
                    onChange={e => setCarwashForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Lavador Asignado</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={carwashForm.washer_name}
                    onChange={e => setCarwashForm(f => ({ ...f, washer_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={carwashForm.price}
                    onChange={e => setCarwashForm(f => ({ ...f, price: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowCarwashModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Ingresando...' : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA ALERTA PREVENTIVA ── */}
      {showAlertModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🛡️ Nueva Alerta de Mantenimiento
              </h2>
              <button onClick={() => setShowAlertModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Placa *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="ABC-123"
                    value={alertForm.plate_number}
                    onChange={e => setAlertForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem', fontWeight: 900 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo de Alerta</label>
                  <select
                    className="input-neu"
                    value={alertForm.alert_type}
                    onChange={e => setAlertForm(f => ({ ...f, alert_type: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="oil_change">🛢️ Cambio de Aceite</option>
                    <option value="soat">📄 Vencimiento SOAT</option>
                    <option value="techno_inspection">🔍 Tecnomecánica</option>
                    <option value="timing_belt">⚙️ Correa Repartición</option>
                    <option value="brakes">🛑 Frenos</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre Cliente</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={alertForm.customer_name}
                    onChange={e => setAlertForm(f => ({ ...f, customer_name: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>WhatsApp</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={alertForm.customer_phone}
                    onChange={e => setAlertForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Fecha Próximo Vencimiento</label>
                  <input
                    type="date"
                    className="input-neu"
                    value={alertForm.due_date}
                    onChange={e => setAlertForm(f => ({ ...f, due_date: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Km Próximo Servicio</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={alertForm.due_mileage_km}
                    onChange={e => setAlertForm(f => ({ ...f, due_mileage_km: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Notas / Especificaciones</label>
                <input
                  type="text"
                  className="input-neu"
                  value={alertForm.notes}
                  onChange={e => setAlertForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Aceite 10W-30 Sintético, Filtro..."
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowAlertModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
