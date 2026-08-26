'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Wine,
  GlassWater,
  RotateCcw,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Clock,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  X,
  Beer
} from 'lucide-react'

interface OpenedBottle {
  id: string
  tenant_id: string
  product_id?: string | null
  product_name: string
  bottle_size_ml: number
  total_shots: number
  served_shots: number
  shot_price: number
  opened_by?: string | null
  opened_at: string
  status: 'active' | 'finished' | 'discarded'
  fiscal_stamp?: string | null
}

interface ReturnableContainer {
  id: string
  tenant_id: string
  container_name: string
  deposit_amount: number
  stock_empty_in_store: number
  stock_with_customers: number
  created_at: string
}

interface ContainerMovement {
  id: string
  tenant_id: string
  container_id: string
  movement_type: 'loan_to_customer' | 'returned_by_customer' | 'sent_to_supplier' | 'received_from_supplier'
  quantity: number
  customer_name?: string | null
  deposit_total: number
  notes?: string | null
  created_at: string
  liquor_returnable_containers?: {
    container_name: string
  }
}

interface LiquorCombo {
  id: string
  tenant_id: string
  combo_name: string
  combo_price: number
  regular_price: number
  items_json: Array<{ name: string; quantity: number }>
  is_active: boolean
  is_happy_hour: boolean
  happy_hour_start?: string | null
  happy_hour_end?: string | null
  created_at: string
}

export default function EstancoPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'bar' | 'containers' | 'combos' | 'tobacco'>('bar')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [bottles, setBottles] = useState<OpenedBottle[]>([])
  const [containers, setContainers] = useState<ReturnableContainer[]>([])
  const [movements, setMovements] = useState<ContainerMovement[]>([])
  const [combos, setCombos] = useState<LiquorCombo[]>([])

  // Modals
  const [showBottleModal, setShowBottleModal] = useState(false)
  const [showContainerModal, setShowContainerModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState<'loan' | 'return' | 'supplier' | null>(null)
  const [selectedContainer, setSelectedContainer] = useState<ReturnableContainer | null>(null)
  const [showComboModal, setShowComboModal] = useState(false)

  // Forms
  const [bottleForm, setBottleForm] = useState({
    product_name: '',
    bottle_size_ml: 750,
    total_shots: 16,
    shot_price: 6000,
    opened_by: 'Bartender / Caja',
    fiscal_stamp: ''
  })

  const [containerForm, setContainerForm] = useState({
    container_name: 'Botella Cerveza 330ml Vidrio',
    deposit_amount: 1000,
    stock_empty_in_store: 48,
    stock_with_customers: 24
  })

  const [movementForm, setMovementForm] = useState({
    quantity: 6,
    customer_name: 'Cliente Mostrador',
    notes: 'Depósito registrado en caja'
  })

  const [comboForm, setComboForm] = useState({
    combo_name: '',
    combo_price: 85000,
    regular_price: 105000,
    is_happy_hour: false,
    items: [
      { name: 'Aguardiente Amarillo 750ml', quantity: 1 },
      { name: 'Bolsa de Hielo 3kg', quantity: 1 },
      { name: 'Gaseosa Manzana 1.5L', quantity: 1 },
      { name: 'Paquete de Pasabocas', quantity: 1 }
    ]
  })

  // Tobacco fraction calculator state
  const [packPrice, setPackPrice] = useState<number>(12000)
  const [unitsPerPack, setUnitsPerPack] = useState<number>(20)
  const [unitSinglePrice, setUnitSinglePrice] = useState<number>(1000)

  useEffect(() => {
    loadEstancoData()
  }, [])

  async function loadEstancoData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [bRes, cRes, mRes, cbRes] = await Promise.all([
        supabase.from('liquor_opened_bottles').select('*').eq('tenant_id', tid).order('status', { ascending: true }).order('opened_at', { ascending: false }),
        supabase.from('liquor_returnable_containers').select('*').eq('tenant_id', tid).order('container_name', { ascending: true }),
        supabase.from('liquor_container_movements').select('*, liquor_returnable_containers(container_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(30),
        supabase.from('liquor_combos').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
      ])

      setBottles(bRes.data || [])
      setContainers(cRes.data || [])
      setMovements((mRes.data as any) || [])
      setCombos(cbRes.data || [])
    } catch (err) {
      console.error('Error loading estanco module data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open New Bottle
  async function handleCreateBottle(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!bottleForm.product_name.trim()) return alert('Ingresa el nombre del licor')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        product_name: bottleForm.product_name.trim(),
        bottle_size_ml: Number(bottleForm.bottle_size_ml),
        total_shots: Number(bottleForm.total_shots),
        served_shots: 0,
        shot_price: Number(bottleForm.shot_price),
        opened_by: bottleForm.opened_by,
        fiscal_stamp: bottleForm.fiscal_stamp || null,
        status: 'active'
      }

      const { error } = await supabase.from('liquor_opened_bottles').insert(payload)
      if (error) throw error

      setShowBottleModal(false)
      setBottleForm({
        product_name: '',
        bottle_size_ml: 750,
        total_shots: 16,
        shot_price: 6000,
        opened_by: 'Bartender / Caja',
        fiscal_stamp: ''
      })
      await loadEstancoData()
    } catch (err: any) {
      alert(err.message || 'Error al abrir botella')
    } finally {
      setSubmitting(false)
    }
  }

  // Serve 1 Shot
  async function handleServeShot(bottle: OpenedBottle) {
    if (bottle.served_shots >= bottle.total_shots) {
      alert('Esta botella ya no tiene tragos disponibles. Finalízala para abrir una nueva.')
      return
    }

    const nextServed = bottle.served_shots + 1
    const nextStatus = nextServed >= bottle.total_shots ? 'finished' : 'active'

    try {
      const { error } = await supabase
        .from('liquor_opened_bottles')
        .update({
          served_shots: nextServed,
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bottle.id)

      if (error) throw error
      await loadEstancoData()
    } catch (err: any) {
      alert('Error al servir trago: ' + err.message)
    }
  }

  // Finish or Discard Bottle
  async function handleUpdateBottleStatus(bottleId: string, status: 'finished' | 'discarded') {
    try {
      const { error } = await supabase
        .from('liquor_opened_bottles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bottleId)
      if (error) throw error
      await loadEstancoData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Returnable Container Type
  async function handleCreateContainer(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        container_name: containerForm.container_name,
        deposit_amount: Number(containerForm.deposit_amount),
        stock_empty_in_store: Number(containerForm.stock_empty_in_store),
        stock_with_customers: Number(containerForm.stock_with_customers)
      }
      const { error } = await supabase.from('liquor_returnable_containers').insert(payload)
      if (error) throw error
      setShowContainerModal(false)
      await loadEstancoData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar tipo de envase')
    } finally {
      setSubmitting(false)
    }
  }

  // Process Container Movement (Loan, Return, Supplier)
  async function handleProcessContainerMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !selectedContainer || submitting) return

    setSubmitting(true)
    try {
      const qty = Number(movementForm.quantity) || 1
      const totalDeposit = qty * Number(selectedContainer.deposit_amount)
      let newStoreStock = selectedContainer.stock_empty_in_store
      let newCustomerStock = selectedContainer.stock_with_customers

      const movementType = showMovementModal === 'loan' ? 'loan_to_customer'
        : showMovementModal === 'return' ? 'returned_by_customer'
        : 'sent_to_supplier'

      if (movementType === 'loan_to_customer') {
        newStoreStock = Math.max(0, newStoreStock - qty)
        newCustomerStock += qty
      } else if (movementType === 'returned_by_customer') {
        newStoreStock += qty
        newCustomerStock = Math.max(0, newCustomerStock - qty)
      } else if (movementType === 'sent_to_supplier') {
        newStoreStock = Math.max(0, newStoreStock - qty)
      }

      // 1. Log movement
      const { error: movErr } = await supabase.from('liquor_container_movements').insert({
        tenant_id: tenantId,
        container_id: selectedContainer.id,
        movement_type: movementType,
        quantity: qty,
        customer_name: movementForm.customer_name || null,
        deposit_total: totalDeposit,
        notes: movementForm.notes || null
      })
      if (movErr) throw movErr

      // 2. Update container balances
      const { error: cntErr } = await supabase
        .from('liquor_returnable_containers')
        .update({
          stock_empty_in_store: newStoreStock,
          stock_with_customers: newCustomerStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedContainer.id)
      if (cntErr) throw cntErr

      setShowMovementModal(null)
      setSelectedContainer(null)
      await loadEstancoData()
    } catch (err: any) {
      alert(err.message || 'Error al procesar movimiento de envase')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Party Combo
  async function handleCreateCombo(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!comboForm.combo_name.trim()) return alert('Ingresa el nombre del combo')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        combo_name: comboForm.combo_name.trim(),
        combo_price: Number(comboForm.combo_price),
        regular_price: Number(comboForm.regular_price),
        items_json: comboForm.items,
        is_active: true,
        is_happy_hour: comboForm.is_happy_hour
      }
      const { error } = await supabase.from('liquor_combos').insert(payload)
      if (error) throw error
      setShowComboModal(false)
      setComboForm({
        combo_name: '',
        combo_price: 85000,
        regular_price: 105000,
        is_happy_hour: false,
        items: [
          { name: 'Aguardiente Amarillo 750ml', quantity: 1 },
          { name: 'Bolsa de Hielo 3kg', quantity: 1 },
          { name: 'Gaseosa Manzana 1.5L', quantity: 1 },
          { name: 'Paquete de Pasabocas', quantity: 1 }
        ]
      })
      await loadEstancoData()
    } catch (err: any) {
      alert(err.message || 'Error al crear combo')
    } finally {
      setSubmitting(false)
    }
  }

  // Seed Demo Data for Estancos if empty
  async function handleSeedDemoEstanco() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Bottles
      const demoBottles = [
        {
          tenant_id: tenantId,
          product_name: 'Aguardiente Amarillo de Manzanares 750ml',
          bottle_size_ml: 750,
          total_shots: 16,
          served_shots: 7,
          shot_price: 5000,
          opened_by: 'Cajero Turno Noche',
          status: 'active',
          fiscal_stamp: 'EST-CAL-889102'
        },
        {
          tenant_id: tenantId,
          product_name: 'Whisky Old Parr 12 Años 750ml',
          bottle_size_ml: 750,
          total_shots: 16,
          served_shots: 12,
          shot_price: 12000,
          opened_by: 'Cajero Turno Noche',
          status: 'active',
          fiscal_stamp: 'EST-VAL-004312'
        },
        {
          tenant_id: tenantId,
          product_name: 'Ron Viejo de Caldas 8 Años Carta de Oro',
          bottle_size_ml: 750,
          total_shots: 16,
          served_shots: 4,
          shot_price: 6500,
          opened_by: 'Administrador',
          status: 'active',
          fiscal_stamp: 'EST-CAL-119823'
        }
      ]
      await supabase.from('liquor_opened_bottles').insert(demoBottles)

      // 2. Returnable Containers
      const demoContainers = [
        {
          tenant_id: tenantId,
          container_name: 'Botella Cerveza Águila / Poker 330ml Vidrio',
          deposit_amount: 1000,
          stock_empty_in_store: 72,
          stock_with_customers: 36
        },
        {
          tenant_id: tenantId,
          container_name: 'Botellón Cerveza Litrón 1000ml',
          deposit_amount: 2000,
          stock_empty_in_store: 24,
          stock_with_customers: 12
        },
        {
          tenant_id: tenantId,
          container_name: 'Canasta Plástica Cervecera (30 Botellas)',
          deposit_amount: 15000,
          stock_empty_in_store: 8,
          stock_with_customers: 3
        }
      ]
      await supabase.from('liquor_returnable_containers').insert(demoContainers)

      // 3. Combos
      const demoCombos = [
        {
          tenant_id: tenantId,
          combo_name: '🔥 Combo Rumbero Amarillo',
          combo_price: 75000,
          regular_price: 92000,
          items_json: [
            { name: 'Aguardiente Amarillo 750ml', quantity: 1 },
            { name: 'Bolsa Hielo 3kg', quantity: 1 },
            { name: 'Gaseosa Sprite 1.5L', quantity: 1 },
            { name: 'Chitos / Papas Fritas', quantity: 1 }
          ],
          is_active: true,
          is_happy_hour: false
        },
        {
          tenant_id: tenantId,
          combo_name: '🥃 Combo Whisky & Energizante',
          combo_price: 160000,
          regular_price: 195000,
          items_json: [
            { name: 'Whisky Buchanan\'s 12 Años 750ml', quantity: 1 },
            { name: 'Bebida Energizante Red Bull 250ml', quantity: 2 },
            { name: 'Bolsa Hielo 3kg', quantity: 1 }
          ],
          is_active: true,
          is_happy_hour: true
        }
      ]
      await supabase.from('liquor_combos').insert(demoCombos)

      await loadEstancoData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Active bottles list
  const activeBottles = bottles.filter(b => b.status === 'active')

  // Tobacco calculation: Pack $12.000 (20u) -> $1.000 / u -> Total $20.000 -> Extra profit $8.000 (+66.7%)
  const packRevenueSingle = unitsPerPack * unitSinglePrice
  const singleExtraProfit = packRevenueSingle - packPrice
  const singleMarginPercent = packPrice > 0 ? ((singleExtraProfit / packPrice) * 100).toFixed(1) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wine size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Licorera, Estanco & Cigarrería
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Control de botellas en barra / copeo, envases retornables con depósitos, combos de fiesta y despiece de tabaco
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadEstancoData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {bottles.length === 0 && containers.length === 0 && (
            <button onClick={handleSeedDemoEstanco} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Datos Demo de Licorera
            </button>
          )}
          {activeTab === 'bar' && (
            <button onClick={() => setShowBottleModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Abrir Botella en Barra</span>
            </button>
          )}
          {activeTab === 'containers' && (
            <button onClick={() => setShowContainerModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Tipo de Envase</span>
            </button>
          )}
          {activeTab === 'combos' && (
            <button onClick={() => setShowComboModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Crear Combo de Fiesta</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Regulatory Warning +18 Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.25)', padding: '10px 14px', borderRadius: 10 }}>
        <ShieldCheck size={20} style={{ color: 'var(--accent-coral)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
          <strong>Control de Mayoría de Edad (+18 Años):</strong> Prohibida la venta de bebidas embriagantes y productos de tabaco a menores de edad. Exigir documento de identidad antes del cobro en el POS.
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Botellas Abiertas en Barra
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {activeBottles.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {activeBottles.reduce((acc, b) => acc + (b.total_shots - b.served_shots), 0)} tragos restantes
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Envases en Calle (Clientes)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {containers.reduce((acc, c) => acc + c.stock_with_customers, 0)} u
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Depósito retenido: {formatCurrency(containers.reduce((acc, c) => acc + (c.stock_with_customers * Number(c.deposit_amount)), 0))}
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Envases Vacíos en Tienda
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {containers.reduce((acc, c) => acc + c.stock_empty_in_store, 0)} u
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Listos para recambio con camión
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Combos Promocionales
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {combos.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {combos.filter(c => c.is_happy_hour).length} en Happy Hour activo
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('bar')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'bar' ? 800 : 500,
            background: activeTab === 'bar' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'bar' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <GlassWater size={15} />
          <span>Barra & Copeo ({activeBottles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('containers')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'containers' ? 800 : 500,
            background: activeTab === 'containers' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'containers' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Beer size={15} />
          <span>Envases Retornables ({containers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('combos')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'combos' ? 800 : 500,
            background: activeTab === 'combos' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'combos' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={15} />
          <span>Combos de Fiesta ({combos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tobacco')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'tobacco' ? 800 : 500,
            background: activeTab === 'tobacco' ? 'var(--accent-coral)' : 'var(--bg)',
            color: activeTab === 'tobacco' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Flame size={15} />
          <span>Cigarrería & Despiece</span>
        </button>
      </div>

      {/* ── TAB 1: BARRA & COPEO ── */}
      {activeTab === 'bar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeBottles.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🥃</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay botellas abiertas en barra</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Abre una botella para comenzar a registrar la venta fraccionada por trago o copa.
              </p>
              <button onClick={() => setShowBottleModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Abrir primera botella en barra
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {activeBottles.map(b => {
                const remaining = b.total_shots - b.served_shots
                const percent = Math.round((remaining / b.total_shots) * 100)
                const isAlmostEmpty = remaining <= 3

                return (
                  <div key={b.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${isAlmostEmpty ? 'var(--accent-coral)' : 'var(--accent-blue)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{b.product_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {b.bottle_size_ml}ml • Abierta por: {b.opened_by || 'Cajero'} ({formatDate(b.opened_at)})
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
                          {formatCurrency(Number(b.shot_price))}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>por trago</div>
                      </div>
                    </div>

                    {b.fiscal_stamp && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Estampilla: {b.fiscal_stamp}
                      </div>
                    )}

                    {/* Progress Bar for Shots */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: isAlmostEmpty ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                          {remaining} tragos restantes
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{b.served_shots} servidos ({percent}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          borderRadius: 4,
                          background: isAlmostEmpty ? 'var(--accent-coral)' : 'linear-gradient(90deg, #C26D2D, #16A34A)',
                          transition: '0.3s ease'
                        }} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => handleServeShot(b)}
                        className="btn-neu btn-primary"
                        style={{ flex: 1, padding: '9px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <GlassWater size={15} />
                        <span>Servir 1 Trago</span>
                      </button>

                      <button
                        onClick={() => handleUpdateBottleStatus(b.id, 'finished')}
                        className="btn-neu btn-ghost"
                        title="Marcar botella como vacía"
                        style={{ padding: '9px 12px', fontSize: '0.75rem' }}
                      >
                        Finalizar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ENVASES RETORNABLES ── */}
      {activeTab === 'containers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {containers.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🍺</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay tipos de envase configurados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra envases de cerveza, gaseosas de vidrio y canastas plásticas con su valor de depósito en garantía.
              </p>
              <button onClick={() => setShowContainerModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Registrar primer envase retornable
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {containers.map(c => (
                <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{c.container_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700, marginTop: 2 }}>
                        Depósito: {formatCurrency(Number(c.deposit_amount))} / unidad
                      </div>
                    </div>
                    <span style={{ fontSize: '1.5rem' }}>🍺</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-deep)', padding: 12, borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>En Tienda (Vacíos)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{c.stock_empty_in_store} u</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>En Calle (Clientes)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-amber)' }}>{c.stock_with_customers} u</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { setSelectedContainer(c); setShowMovementModal('loan') }}
                      className="btn-neu"
                      style={{ flex: 1, padding: '7px 8px', fontSize: '0.72rem', background: 'var(--bg)', color: 'var(--accent-coral)', fontWeight: 700 }}
                    >
                      + Prestar Envase
                    </button>
                    <button
                      onClick={() => { setSelectedContainer(c); setShowMovementModal('return') }}
                      className="btn-neu"
                      style={{ flex: 1, padding: '7px 8px', fontSize: '0.72rem', background: 'var(--bg)', color: 'var(--accent-green)', fontWeight: 700 }}
                    >
                      - Recibir Envase
                    </button>
                    <button
                      onClick={() => { setSelectedContainer(c); setShowMovementModal('supplier') }}
                      className="btn-neu btn-ghost"
                      title="Entregar vacíos al camión cervecero"
                      style={{ padding: '7px 8px', fontSize: '0.72rem' }}
                    >
                      🚚 Camión
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Movements Log */}
          {movements.length > 0 && (
            <div className="neu-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 10 }}>
                📜 Últimos Movimientos de Envases
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '250px', overflowY: 'auto' }}>
                {movements.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8, fontSize: '0.78rem' }}>
                    <div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        marginRight: 8,
                        background: m.movement_type === 'loan_to_customer' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                        color: m.movement_type === 'loan_to_customer' ? 'var(--accent-coral)' : 'var(--accent-green)'
                      }}>
                        {m.movement_type === 'loan_to_customer' ? '📤 Préstamo' : m.movement_type === 'returned_by_customer' ? '📥 Retorno' : '🚚 Al Proveedor'}
                      </span>
                      <strong>{m.quantity}x</strong> {m.liquor_returnable_containers?.container_name || 'Envases'} — {m.customer_name || 'Mostrador'}
                    </div>
                    <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      <div>{formatCurrency(Number(m.deposit_total))}</div>
                      <div style={{ fontSize: '0.68rem' }}>{formatDate(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: COMBOS DE FIESTA & HAPPY HOUR ── */}
      {activeTab === 'combos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {combos.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay combos promocionales creados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Arma combos de licor + hielo + gaseosa para venta rápida en caja y promociones Happy Hour.
              </p>
              <button onClick={() => setShowComboModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primer combo de fiesta
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {combos.map(c => {
                const savings = Number(c.regular_price) - Number(c.combo_price)
                const savingsPercent = c.regular_price > 0 ? Math.round((savings / c.regular_price) * 100) : 0

                return (
                  <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, border: c.is_happy_hour ? '2px solid var(--accent-amber)' : '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.combo_name}</div>
                        {c.is_happy_hour && (
                          <span style={{ display: 'inline-block', marginTop: 3, padding: '2px 7px', borderRadius: 5, fontSize: '0.68rem', fontWeight: 800, background: 'rgba(217, 119, 6, 0.12)', color: 'var(--accent-amber)' }}>
                            ⏰ Happy Hour Especial
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
                          {formatCurrency(Number(c.combo_price))}
                        </div>
                        {savings > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            {formatCurrency(Number(c.regular_price))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Included Items */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Incluye:</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        {(c.items_json || []).map((it, idx) => (
                          <li key={idx} style={{ marginBottom: 2 }}>{it.quantity}x {it.name}</li>
                        ))}
                      </ul>
                    </div>

                    {savings > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                        Ahorro del cliente: {formatCurrency(savings)} ({savingsPercent}% OFF)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CIGARRERÍA & DESPIECE ── */}
      {activeTab === 'tobacco' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          
          {/* Fractioning Simulator */}
          <div className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🚬 Calculadora de Despiece de Tabaco
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Compara el margen de venta por cajetilla cerrada vs. venta de cigarrillos sueltos
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Cajetilla ($)</label>
                <input
                  type="number"
                  className="input-neu"
                  value={packPrice}
                  onChange={e => setPackPrice(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cigarrillos / Cajetilla</label>
                <input
                  type="number"
                  className="input-neu"
                  value={unitsPerPack}
                  onChange={e => setUnitsPerPack(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Suelto ($/u)</label>
                <input
                  type="number"
                  className="input-neu"
                  value={unitSinglePrice}
                  onChange={e => setUnitSinglePrice(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div className="neu-card" style={{ padding: 16, background: 'var(--bg-deep)', border: '1px solid var(--accent-green)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Rendimiento del Despiece
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                    {formatCurrency(packRevenueSingle)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Ganancia adicional por sueltos: <strong>+{formatCurrency(singleExtraProfit)} (+{singleMarginPercent}%)</strong>
                  </div>
                </div>
                <span style={{ fontSize: '2rem' }}>💰</span>
              </div>
            </div>
          </div>

          {/* Legal / Regulatory Guidelines Card */}
          <div className="neu-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Normativa Sanitaria y Fiscal de Licores & Tabaco
              </h2>
            </div>

            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Estampillas Departamentales:</strong> Todo licor nacional o importado debe contar con código de estampilla y código QR escaneable de rentas departamentales.
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Ley Antitabaco:</strong> Prohibida la exhibición de publicidad engañosa y venta a menores de 18 años.
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Trazabilidad de Botellas en Barra:</strong> Las botellas abiertas deben desecharse inmediatamente al agotarse y destruirse su tapa y etiqueta para evitar adulteración.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── MODAL: ABRIR BOTELLA EN BARRA ── */}
      {showBottleModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🥃 Abrir Botella en Barra (Copeo)
              </h2>
              <button onClick={() => setShowBottleModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateBottle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Licor *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Aguardiente Amarillo 750ml"
                  value={bottleForm.product_name}
                  onChange={e => setBottleForm(f => ({ ...f, product_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Capacidad (ml)</label>
                  <select
                    className="input-neu"
                    value={bottleForm.bottle_size_ml}
                    onChange={e => {
                      const ml = Number(e.target.value)
                      setBottleForm(f => ({ ...f, bottle_size_ml: ml, total_shots: ml >= 1000 ? 22 : ml >= 750 ? 16 : 8 }))
                    }}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value={375}>Media (375ml - 8 tragos)</option>
                    <option value={750}>Botella (750ml - 16 tragos)</option>
                    <option value={1000}>Litro (1000ml - 22 tragos)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio por Trago ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={bottleForm.shot_price}
                    onChange={e => setBottleForm(f => ({ ...f, shot_price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Estampilla Fiscal</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="EST-CAL-88910"
                    value={bottleForm.fiscal_stamp}
                    onChange={e => setBottleForm(f => ({ ...f, fiscal_stamp: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Abierto por</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={bottleForm.opened_by}
                    onChange={e => setBottleForm(f => ({ ...f, opened_by: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowBottleModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Abrir Botella'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO TIPO DE ENVASE RETORNABLE ── */}
      {showContainerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🍺 Nuevo Tipo de Envase Retornable
              </h2>
              <button onClick={() => setShowContainerModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateContainer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Descripción del Envase *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Botella Cerveza 330ml Vidrio"
                  value={containerForm.container_name}
                  onChange={e => setContainerForm(f => ({ ...f, container_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Depósito ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={containerForm.deposit_amount}
                    onChange={e => setContainerForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>En Tienda (u)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={containerForm.stock_empty_in_store}
                    onChange={e => setContainerForm(f => ({ ...f, stock_empty_in_store: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>En Calle (u)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={containerForm.stock_with_customers}
                    onChange={e => setContainerForm(f => ({ ...f, stock_with_customers: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowContainerModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Envase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: MOVIMIENTO DE ENVASE (PRÉSTAMO / RETORNO / CAMIÓN) ── */}
      {showMovementModal && selectedContainer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {showMovementModal === 'loan' ? '📤 Prestar Envases (+ Cobrar Depósito)'
                  : showMovementModal === 'return' ? '📥 Recibir Envases (- Devolver Depósito)'
                  : '🚚 Entregar Vacíos a Camión Repartidor'}
              </h2>
              <button onClick={() => setShowMovementModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Envase: <strong>{selectedContainer.container_name}</strong> | Depósito: {formatCurrency(Number(selectedContainer.deposit_amount))} / u
            </p>

            <form onSubmit={handleProcessContainerMovement} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cantidad de Envases</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={movementForm.quantity}
                    onChange={e => setMovementForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    min={1}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {showMovementModal === 'loan' ? 'Cobrar Depósito:' : showMovementModal === 'return' ? 'Devolver Depósito:' : 'Total Valor:'}
                  </label>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8, fontWeight: 900, color: showMovementModal === 'loan' ? 'var(--accent-coral)' : 'var(--accent-green)', fontSize: '0.95rem' }}>
                    {formatCurrency((Number(movementForm.quantity) || 0) * Number(selectedContainer.deposit_amount))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre Cliente / Destinatario</label>
                <input
                  type="text"
                  className="input-neu"
                  value={movementForm.customer_name}
                  onChange={e => setMovementForm(f => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Cliente Mostrador"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowMovementModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Procesando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR COMBO DE FIESTA ── */}
      {showComboModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🎉 Crear Combo de Fiesta / Promoción
              </h2>
              <button onClick={() => setShowComboModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCombo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Combo *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: 🔥 Combo Rumbero Amarillo"
                  value={comboForm.combo_name}
                  onChange={e => setComboForm(f => ({ ...f, combo_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Combo ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={comboForm.combo_price}
                    onChange={e => setComboForm(f => ({ ...f, combo_price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Regular ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={comboForm.regular_price}
                    onChange={e => setComboForm(f => ({ ...f, regular_price: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Items included in Combo */}
              <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Productos incluidos en el combo</div>
                {comboForm.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 4fr auto', gap: 6, marginBottom: 6 }}>
                    <input
                      type="number"
                      className="input-neu"
                      value={it.quantity}
                      onChange={e => {
                        const nextItems = [...comboForm.items]
                        nextItems[idx].quantity = Number(e.target.value)
                        setComboForm(f => ({ ...f, items: nextItems }))
                      }}
                      style={{ fontSize: '0.78rem', padding: '5px' }}
                    />
                    <input
                      type="text"
                      className="input-neu"
                      value={it.name}
                      onChange={e => {
                        const nextItems = [...comboForm.items]
                        nextItems[idx].name = e.target.value
                        setComboForm(f => ({ ...f, items: nextItems }))
                      }}
                      style={{ fontSize: '0.78rem', padding: '5px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setComboForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                      className="btn-neu btn-ghost"
                      style={{ padding: '4px', color: 'var(--accent-coral)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setComboForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1 }] }))}
                  className="btn-neu btn-ghost"
                  style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 700, padding: '4px 8px' }}
                >
                  + Agregar Producto al Combo
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="chkHappyHour"
                  checked={comboForm.is_happy_hour}
                  onChange={e => setComboForm(f => ({ ...f, is_happy_hour: e.target.checked }))}
                />
                <label htmlFor="chkHappyHour" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Activar como Promoción Happy Hour
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowComboModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
