'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Croissant,
  Cake,
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
  Printer,
  Calendar,
  Sparkles,
  Award,
  Activity,
  Flame,
  ChefHat,
  Scale,
  Thermometer,
  Coffee,
  ShoppingBag
} from 'lucide-react'

interface BakeryRecipe {
  id: string
  tenant_id: string
  name: string
  category: string
  yield_quantity: number
  yield_unit: string
  baking_temp_celsius: number
  baking_time_minutes: number
  cost_per_batch: number
  cost_per_unit: number
  suggested_sale_price: number
  instructions?: string | null
  created_at: string
  bakery_recipe_ingredients?: BakeryIngredient[]
}

interface BakeryIngredient {
  id: string
  tenant_id: string
  recipe_id: string
  ingredient_name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  bakers_percentage?: number | null
}

interface BakeryBatch {
  id: string
  tenant_id: string
  batch_number: string
  recipe_id?: string | null
  recipe_name: string
  baker_name?: string | null
  shift: string
  planned_units: number
  actual_units: number
  waste_units: number
  status: 'in_oven' | 'cooling' | 'completed' | 'discarded'
  notes?: string | null
  baked_at: string
  created_at: string
}

interface BakeryCustomOrder {
  id: string
  tenant_id: string
  order_number: string
  customer_name: string
  customer_phone?: string | null
  customer_email?: string | null
  event_type: string
  delivery_date: string
  delivery_time: string
  portions_count: number
  dough_flavor: string
  filling_flavor: string
  covering_type: string
  dedication_text?: string | null
  reference_notes?: string | null
  total_price: number
  advance_payment: number
  status: 'pending' | 'baking' | 'decorating' | 'ready_for_pickup' | 'delivered' | 'cancelled'
  created_at: string
}

export default function BakeryPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'batches' | 'custom_orders' | 'recipes' | 'display'>('batches')
  const [submitting, setSubmitting] = useState(false)

  // Data states
  const [recipes, setRecipes] = useState<BakeryRecipe[]>([])
  const [batches, setBatches] = useState<BakeryBatch[]>([])
  const [customOrders, setCustomOrders] = useState<BakeryCustomOrder[]>([])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('all')

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)

  // Forms
  const [batchForm, setBatchForm] = useState({
    recipe_id: '',
    recipe_name: '',
    baker_name: 'Maestro Panadero',
    shift: 'manana',
    planned_units: 30,
    actual_units: 30,
    waste_units: 0,
    status: 'in_oven' as 'in_oven' | 'cooling' | 'completed',
    notes: ''
  })

  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    event_type: 'cumpleanos',
    delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_time: '15:00',
    portions_count: 20,
    dough_flavor: 'Vainilla con Chispas de Chocolate',
    filling_flavor: 'Arequipe & Crema de Café',
    covering_type: 'Crema Chantilly con Frutos Rojos',
    dedication_text: '¡Feliz Cumpleaños!',
    reference_notes: '',
    total_price: 95000,
    advance_payment: 50000
  })

  const [recipeForm, setRecipeForm] = useState({
    name: '',
    category: 'panes',
    yield_quantity: 24,
    yield_unit: 'unidades',
    baking_temp_celsius: 200,
    baking_time_minutes: 20,
    suggested_sale_price: 2500,
    instructions: '',
    ingredients: [
      { ingredient_name: 'Harina de Trigo Especial', quantity: 1.0, unit: 'kg', unit_cost: 3200, total_cost: 3200, bakers_percentage: 100 },
      { ingredient_name: 'Agua Filtrada', quantity: 0.6, unit: 'litros', unit_cost: 200, total_cost: 120, bakers_percentage: 60 },
      { ingredient_name: 'Levadura Fresca', quantity: 0.03, unit: 'kg', unit_cost: 12000, total_cost: 360, bakers_percentage: 3 },
      { ingredient_name: 'Mantequilla sin sal', quantity: 0.15, unit: 'kg', unit_cost: 18000, total_cost: 2700, bakers_percentage: 15 },
      { ingredient_name: 'Azúcar refinada', quantity: 0.05, unit: 'kg', unit_cost: 4000, total_cost: 200, bakers_percentage: 5 },
      { ingredient_name: 'Sal refinada', quantity: 0.02, unit: 'kg', unit_cost: 1500, total_cost: 30, bakers_percentage: 2 }
    ]
  })

  useEffect(() => {
    loadBakeryData()
  }, [])

  async function loadBakeryData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [recipesRes, batchesRes, ordersRes] = await Promise.all([
        supabase.from('bakery_recipes').select('*, bakery_recipe_ingredients(*)').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('bakery_batches').select('*').eq('tenant_id', tid).order('baked_at', { ascending: false }),
        supabase.from('bakery_custom_orders').select('*').eq('tenant_id', tid).order('delivery_date', { ascending: true })
      ])

      setRecipes((recipesRes.data as any) || [])
      setBatches(batchesRes.data || [])
      setCustomOrders(ordersRes.data || [])
    } catch (err) {
      console.error('Error loading bakery data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Batch
  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!batchForm.recipe_name.trim()) return alert('Selecciona o ingresa el nombre del producto horneado')

    setSubmitting(true)
    try {
      const batchNumber = `HOR-${Date.now().toString().slice(-4)}`
      const payload = {
        tenant_id: tenantId,
        batch_number: batchNumber,
        recipe_id: batchForm.recipe_id || null,
        recipe_name: batchForm.recipe_name.trim(),
        baker_name: batchForm.baker_name.trim() || 'Maestro Panadero',
        shift: batchForm.shift,
        planned_units: Number(batchForm.planned_units),
        actual_units: Number(batchForm.actual_units),
        waste_units: Number(batchForm.waste_units),
        status: batchForm.status,
        notes: batchForm.notes.trim() || null,
        baked_at: new Date().toISOString()
      }

      const { error } = await supabase.from('bakery_batches').insert(payload)
      if (error) throw error

      setShowBatchModal(false)
      setBatchForm({
        recipe_id: '',
        recipe_name: '',
        baker_name: 'Maestro Panadero',
        shift: 'manana',
        planned_units: 30,
        actual_units: 30,
        waste_units: 0,
        status: 'in_oven',
        notes: ''
      })
      await loadBakeryData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar horneada')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Batch Status
  async function handleUpdateBatchStatus(batchId: string, nextStatus: 'cooling' | 'completed' | 'discarded') {
    try {
      const { error } = await supabase.from('bakery_batches').update({ status: nextStatus }).eq('id', batchId)
      if (error) throw error
      await loadBakeryData()
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado de la tanda')
    }
  }

  // Create Custom Cake Order
  async function handleCreateCustomOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!orderForm.customer_name.trim()) return alert('Ingresa el nombre del cliente')

    setSubmitting(true)
    try {
      const orderNumber = `TOR-${Date.now().toString().slice(-4)}`
      const payload = {
        tenant_id: tenantId,
        order_number: orderNumber,
        customer_name: orderForm.customer_name.trim(),
        customer_phone: orderForm.customer_phone.trim() || null,
        customer_email: orderForm.customer_email.trim() || null,
        event_type: orderForm.event_type,
        delivery_date: orderForm.delivery_date,
        delivery_time: orderForm.delivery_time,
        portions_count: Number(orderForm.portions_count),
        dough_flavor: orderForm.dough_flavor.trim(),
        filling_flavor: orderForm.filling_flavor.trim(),
        covering_type: orderForm.covering_type.trim(),
        dedication_text: orderForm.dedication_text?.trim() || null,
        reference_notes: orderForm.reference_notes?.trim() || null,
        total_price: Number(orderForm.total_price),
        advance_payment: Number(orderForm.advance_payment),
        status: 'pending'
      }

      const { error } = await supabase.from('bakery_custom_orders').insert(payload)
      if (error) throw error

      setShowOrderModal(false)
      setOrderForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        event_type: 'cumpleanos',
        delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_time: '15:00',
        portions_count: 20,
        dough_flavor: 'Vainilla con Chispas de Chocolate',
        filling_flavor: 'Arequipe & Crema de Café',
        covering_type: 'Crema Chantilly con Frutos Rojos',
        dedication_text: '¡Feliz Cumpleaños!',
        reference_notes: '',
        total_price: 95000,
        advance_payment: 50000
      })
      await loadBakeryData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar pedido de torta')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Custom Order Status
  async function handleUpdateOrderStatus(orderId: string, nextStatus: 'baking' | 'decorating' | 'ready_for_pickup' | 'delivered' | 'cancelled') {
    try {
      const { error } = await supabase.from('bakery_custom_orders').update({ status: nextStatus }).eq('id', orderId)
      if (error) throw error
      await loadBakeryData()
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado del pedido')
    }
  }

  // Create Recipe
  async function handleCreateRecipe(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!recipeForm.name.trim()) return alert('Ingresa el nombre de la receta')

    setSubmitting(true)
    try {
      const batchCost = recipeForm.ingredients.reduce((acc, ing) => acc + Number(ing.total_cost), 0)
      const unitCost = recipeForm.yield_quantity > 0 ? batchCost / Number(recipeForm.yield_quantity) : 0

      const recipePayload = {
        tenant_id: tenantId,
        name: recipeForm.name.trim(),
        category: recipeForm.category,
        yield_quantity: Number(recipeForm.yield_quantity),
        yield_unit: recipeForm.yield_unit,
        baking_temp_celsius: Number(recipeForm.baking_temp_celsius),
        baking_time_minutes: Number(recipeForm.baking_time_minutes),
        cost_per_batch: batchCost,
        cost_per_unit: unitCost,
        suggested_sale_price: Number(recipeForm.suggested_sale_price),
        instructions: recipeForm.instructions.trim() || null
      }

      const { data: createdRecipe, error: recipeErr } = await supabase
        .from('bakery_recipes')
        .insert(recipePayload)
        .select()
        .single()

      if (recipeErr) throw recipeErr

      if (createdRecipe && recipeForm.ingredients.length > 0) {
        const ingredientsPayload = recipeForm.ingredients.map(ing => ({
          tenant_id: tenantId,
          recipe_id: createdRecipe.id,
          ingredient_name: ing.ingredient_name.trim(),
          quantity: Number(ing.quantity),
          unit: ing.unit,
          unit_cost: Number(ing.unit_cost),
          total_cost: Number(ing.total_cost),
          bakers_percentage: ing.bakers_percentage ? Number(ing.bakers_percentage) : null
        }))

        await supabase.from('bakery_recipe_ingredients').insert(ingredientsPayload)
      }

      setShowRecipeModal(false)
      setRecipeForm({
        name: '',
        category: 'panes',
        yield_quantity: 24,
        yield_unit: 'unidades',
        baking_temp_celsius: 200,
        baking_time_minutes: 20,
        suggested_sale_price: 2500,
        instructions: '',
        ingredients: [
          { ingredient_name: 'Harina de Trigo Especial', quantity: 1.0, unit: 'kg', unit_cost: 3200, total_cost: 3200, bakers_percentage: 100 },
          { ingredient_name: 'Agua Filtrada', quantity: 0.6, unit: 'litros', unit_cost: 200, total_cost: 120, bakers_percentage: 60 },
          { ingredient_name: 'Levadura Fresca', quantity: 0.03, unit: 'kg', unit_cost: 12000, total_cost: 360, bakers_percentage: 3 },
          { ingredient_name: 'Mantequilla sin sal', quantity: 0.15, unit: 'kg', unit_cost: 18000, total_cost: 2700, bakers_percentage: 15 },
          { ingredient_name: 'Azúcar refinada', quantity: 0.05, unit: 'kg', unit_cost: 4000, total_cost: 200, bakers_percentage: 5 },
          { ingredient_name: 'Sal refinada', quantity: 0.02, unit: 'kg', unit_cost: 1500, total_cost: 30, bakers_percentage: 2 }
        ]
      })
      await loadBakeryData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar la receta')
    } finally {
      setSubmitting(false)
    }
  }

  // Seed Demo Data
  async function handleSeedBakeryDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Recipes
      const { data: createdRecipes } = await supabase.from('bakery_recipes').insert([
        {
          tenant_id: tenantId,
          name: 'Croissant Tradicional de Mantequilla',
          category: 'hojaldres',
          yield_quantity: 20,
          yield_unit: 'unidades',
          baking_temp_celsius: 190,
          baking_time_minutes: 18,
          cost_per_batch: 14500,
          cost_per_unit: 725,
          suggested_sale_price: 3500,
          instructions: 'Laminado en 3 pliegues simples, fermentación 2.5 horas a 26°C con 75% humedad, brillo con huevo.'
        },
        {
          tenant_id: tenantId,
          name: 'Pan Francés / Baguette Artesanal',
          category: 'panes',
          yield_quantity: 15,
          yield_unit: 'baguettes',
          baking_temp_celsius: 230,
          baking_time_minutes: 22,
          cost_per_batch: 8400,
          cost_per_unit: 560,
          suggested_sale_price: 2500,
          instructions: 'Prefermento poolish 12h, amasado lento, cortes oblicuos con vapor inicial en horno rotativo.'
        },
        {
          tenant_id: tenantId,
          name: 'Torta de Selva Negra con Cerezas',
          category: 'pasteles',
          yield_quantity: 16,
          yield_unit: 'porciones',
          baking_temp_celsius: 175,
          baking_time_minutes: 35,
          cost_per_batch: 32000,
          cost_per_unit: 2000,
          suggested_sale_price: 85000,
          instructions: 'Bizcochuelo de cacao holandés al 70%, licor de cerezas kirsch, crema chantilly y virutas de chocolate amargo.'
        }
      ]).select()

      const r1 = createdRecipes?.[0]
      const r2 = createdRecipes?.[1]
      const r3 = createdRecipes?.[2]

      // 2. Ingredients for Recipe 1
      if (r1) {
        await supabase.from('bakery_recipe_ingredients').insert([
          { tenant_id: tenantId, recipe_id: r1.id, ingredient_name: 'Harina de Fuerza', quantity: 1.0, unit: 'kg', unit_cost: 3500, total_cost: 3500, bakers_percentage: 100 },
          { tenant_id: tenantId, recipe_id: r1.id, ingredient_name: 'Mantequilla para Empaste 82% Grasa', quantity: 0.5, unit: 'kg', unit_cost: 16000, total_cost: 8000, bakers_percentage: 50 },
          { tenant_id: tenantId, recipe_id: r1.id, ingredient_name: 'Leche entera', quantity: 0.3, unit: 'litros', unit_cost: 3000, total_cost: 900, bakers_percentage: 30 },
          { tenant_id: tenantId, recipe_id: r1.id, ingredient_name: 'Levadura seca instantánea', quantity: 0.02, unit: 'kg', unit_cost: 15000, total_cost: 300, bakers_percentage: 2 },
          { tenant_id: tenantId, recipe_id: r1.id, ingredient_name: 'Azúcar refinada', quantity: 0.12, unit: 'kg', unit_cost: 4000, total_cost: 480, bakers_percentage: 12 },
          { tenant_id: tenantId, recipe_id: r1.id, ingredient_name: 'Sal marina', quantity: 0.02, unit: 'kg', unit_cost: 1500, total_cost: 30, bakers_percentage: 2 }
        ])
      }

      // 3. Batches
      await supabase.from('bakery_batches').insert([
        {
          tenant_id: tenantId,
          batch_number: 'HOR-0101',
          recipe_id: r1?.id || null,
          recipe_name: 'Croissant Tradicional de Mantequilla',
          baker_name: 'Maestro Carlos Gómez',
          shift: 'manana',
          planned_units: 40,
          actual_units: 38,
          waste_units: 2,
          status: 'completed',
          notes: 'Dorado homogéneo, textura crujiente de hojaldre.',
          baked_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          tenant_id: tenantId,
          batch_number: 'HOR-0102',
          recipe_id: r2?.id || null,
          recipe_name: 'Pan Francés / Baguette Artesanal',
          baker_name: 'Maestro Carlos Gómez',
          shift: 'manana',
          planned_units: 30,
          actual_units: 30,
          waste_units: 0,
          status: 'completed',
          notes: 'Corteza crocante y miga aireada.',
          baked_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          tenant_id: tenantId,
          batch_number: 'HOR-0103',
          recipe_id: null,
          recipe_name: 'Pan de Bono Valluno & Buñuelos',
          baker_name: 'Ayudante Andrés',
          shift: 'tarde',
          planned_units: 50,
          actual_units: 50,
          waste_units: 0,
          status: 'in_oven',
          notes: 'Tanda para café de la tarde (4:00 PM)',
          baked_at: new Date().toISOString()
        }
      ])

      // 4. Custom Orders
      await supabase.from('bakery_custom_orders').insert([
        {
          tenant_id: tenantId,
          order_number: 'TOR-8021',
          customer_name: 'Carolina Restrepo',
          customer_phone: '3128904567',
          customer_email: 'carolina@eventos.com',
          event_type: 'cumpleanos',
          delivery_date: new Date().toISOString().split('T')[0],
          delivery_time: '16:00',
          portions_count: 25,
          dough_flavor: 'Red Velvet con Toque de Vainilla',
          filling_flavor: 'Crema de Queso Philadelphia & Frutos Rojos',
          covering_type: 'Drip Cake Chocolate Blanco & Flores Naturales',
          dedication_text: '¡Felices 30 Años Sofia!',
          reference_notes: 'Diseño elegante tonos rosa pastel y dorado.',
          total_price: 135000,
          advance_payment: 80000,
          status: 'ready_for_pickup'
        },
        {
          tenant_id: tenantId,
          order_number: 'TOR-8022',
          customer_name: 'Gonzalo Pardo',
          customer_phone: '3104561234',
          customer_email: 'gonzalo.pardo@empresa.com',
          event_type: 'empresarial',
          delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          delivery_time: '10:30',
          portions_count: 50,
          dough_flavor: 'Chocolate Fudge Intenso 70%',
          filling_flavor: 'Ganache de Nutella & Almendras Tostadas',
          covering_type: 'Fondant con Logo de Empresa en Papel de Arroz',
          dedication_text: 'Aniversario 10 Años TechCorp',
          reference_notes: 'Empacar con base rígida para transporte.',
          total_price: 240000,
          advance_payment: 120000,
          status: 'decorating'
        },
        {
          tenant_id: tenantId,
          order_number: 'TOR-8023',
          customer_name: 'Daniela Marín',
          customer_phone: '3157890123',
          customer_email: 'daniela.marin@boda.com',
          event_type: 'boda',
          delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          delivery_time: '17:00',
          portions_count: 80,
          dough_flavor: 'Bizcocho de Almendras y Naranja',
          filling_flavor: 'Maracuyá Silvestre & Arequipe Artesanal',
          covering_type: 'Semi-Naked Cake con Eucalipto y Macarons',
          dedication_text: 'D & M - Nuestra Boda',
          reference_notes: 'Torta de 3 pisos con estructura central.',
          total_price: 450000,
          advance_payment: 250000,
          status: 'pending'
        }
      ])

      await loadBakeryData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando datos demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp generator for cake orders
  function getWhatsAppCakeReadyUrl(order: BakeryCustomOrder) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    const pendingBalance = Number(order.total_price) - Number(order.advance_payment)
    const text = encodeURIComponent(
      `¡Hola ${order.customer_name}! 🎂 Tu pedido de torta *${order.order_number}* está listo para entrega.\n\n` +
      `• *Evento:* ${order.event_type}\n` +
      `• *Porciones:* ${order.portions_count}\n` +
      `• *Dedicatoria:* "${order.dedication_text || 'Especial'}"\n` +
      (pendingBalance > 0 ? `• *Saldo pendiente:* ${formatCurrency(pendingBalance)}\n\n` : `• *Estado de pago:* Pagado totalmente ✅\n\n`) +
      `Puedes pasar a recogerlo en nuestro punto de venta o confirmar tu dirección si es con despacho a domicilio.`
    )
    return `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${text}`
  }

  // Filtered Batches
  const filteredBatches = batches.filter(b => {
    const matchQ = b.recipe_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.baker_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    if (shiftFilter !== 'all' && b.shift !== shiftFilter) return false
    return matchQ
  })

  // Filtered Custom Orders
  const filteredOrders = customOrders.filter(o => {
    const matchQ = o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.dough_flavor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_phone || '').includes(searchQuery)
    return matchQ
  })

  // Filtered Recipes
  const filteredRecipes = recipes.filter(r => {
    const matchQ = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
    if (recipeCategoryFilter !== 'all' && r.category !== recipeCategoryFilter) return false
    return matchQ
  })

  // KPIs
  const todayStr = new Date().toISOString().split('T')[0]
  const batchesTodayCount = batches.filter(b => b.baked_at.startsWith(todayStr)).length
  const unitsBakedToday = batches.filter(b => b.baked_at.startsWith(todayStr)).reduce((sum, b) => sum + Number(b.actual_units), 0)
  const pendingOrdersCount = customOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
  const ordersReadyCount = customOrders.filter(o => o.status === 'ready_for_pickup').length
  const totalReceivables = customOrders
    .filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_price) - Number(o.advance_payment)), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Croissant size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Panadería, Pastelería & Repostería
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Recetas por gramaje/harina, horneadas del día, mermas, tortas personalizadas y pedidos por encargo
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadBakeryData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {recipes.length === 0 && batches.length === 0 && (
            <button onClick={handleSeedBakeryDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Datos Demo de Panadería
            </button>
          )}
          {activeTab === 'batches' && (
            <button onClick={() => setShowBatchModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Registrar Horneada</span>
            </button>
          )}
          {activeTab === 'custom_orders' && (
            <button onClick={() => setShowOrderModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Nuevo Pedido de Torta</span>
            </button>
          )}
          {activeTab === 'recipes' && (
            <button onClick={() => setShowRecipeModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              <span>Nueva Ficha Técnica</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards - Monochrome */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Horneadas de Hoy
            </span>
            <Flame size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {batchesTodayCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {unitsBakedToday} unidades frescas producidas
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tortas por Entregar
            </span>
            <Cake size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {pendingOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Encargos y eventos activos
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
              Saldo por Cobrar
            </span>
            <DollarSign size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {formatCurrency(totalReceivables)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Pendiente contra entrega
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Monochrome */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('batches')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'batches' ? 700 : 500,
            background: activeTab === 'batches' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'batches' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Flame size={15} strokeWidth={2} />
          <span>Horneadas & Producción ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('custom_orders')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'custom_orders' ? 700 : 500,
            background: activeTab === 'custom_orders' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'custom_orders' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Cake size={15} strokeWidth={2} />
          <span>Tortas Personalizadas & Encargos ({customOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'recipes' ? 700 : 500,
            background: activeTab === 'recipes' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'recipes' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Scale size={15} strokeWidth={2} />
          <span>Fichas Técnicas & Recetario ({recipes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('display')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'display' ? 700 : 500,
            background: activeTab === 'display' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'display' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Coffee size={15} strokeWidth={2} />
          <span>Vitrina & Combos de Café</span>
        </button>
      </div>

      {/* ── TAB 1: HORNEADAS & PRODUCCIÓN ── */}
      {activeTab === 'batches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por tanda, producto o panadero..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'manana', 'tarde', 'noche'].map(sh => (
                <button
                  key={sh}
                  onClick={() => setShiftFilter(sh)}
                  className={`btn-neu ${shiftFilter === sh ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {sh === 'all' ? 'Todos los Turnos' : sh === 'manana' ? 'Turno Mañana' : sh === 'tarde' ? 'Turno Tarde' : 'Turno Noche'}
                </button>
              ))}
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Flame size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay horneadas registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Programa las tandas del día para alimentar el inventario fresco de tu vitrina.
              </p>
              <button onClick={() => setShowBatchModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Registrar Primera Horneada
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {filteredBatches.map(batch => {
                const isInOven = batch.status === 'in_oven'
                const isCooling = batch.status === 'cooling'
                const isCompleted = batch.status === 'completed'
                const statusLabel = isInOven ? 'En Horno' : isCooling ? 'En Enfriamiento' : isCompleted ? 'En Vitrina / Listo' : 'Descartado'

                return (
                  <div key={batch.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{batch.batch_number}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({batch.shift === 'manana' ? 'Mañana' : batch.shift === 'tarde' ? 'Tarde' : 'Noche'})</span>
                        </div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                          {batch.recipe_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          Panadero: {batch.baker_name || 'No especificado'}
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
                        {statusLabel}
                      </span>
                    </div>

                    {/* Quantities */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, background: 'var(--bg-deep)', padding: '8px 10px', borderRadius: 8, textAlign: 'center', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem' }}>Planificadas</span>
                        <strong>{batch.planned_units}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem' }}>Obtenidas</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{batch.actual_units}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem' }}>Merma</span>
                        <span style={{ color: Number(batch.waste_units) > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>{batch.waste_units}</span>
                      </div>
                    </div>

                    {batch.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg)', padding: '4px 8px', borderRadius: 4 }}>
                        {batch.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      {isInOven && (
                        <button
                          onClick={() => handleUpdateBatchStatus(batch.id, 'cooling')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Sacar del Horno a Enfriar
                        </button>
                      )}
                      {isCooling && (
                        <button
                          onClick={() => handleUpdateBatchStatus(batch.id, 'completed')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Pasar a Vitrina de Venta
                        </button>
                      )}
                      {isCompleted && (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Horneada en vitrina disponible para POS
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

      {/* ── TAB 2: TORTAS PERSONALIZADAS & ENCARGOS ── */}
      {activeTab === 'custom_orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search Bar */}
          <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 420, padding: '6px 12px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por cliente, pedido, sabor o teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Cake size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay pedidos de tortas registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra encargos especiales para bodas, cumpleaños o aniversarios con anticipos y sabores.
              </p>
              <button onClick={() => setShowOrderModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Registrar Encargo de Torta
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {filteredOrders.map(order => {
                const pendingBalance = Number(order.total_price) - Number(order.advance_payment)
                const isReady = order.status === 'ready_for_pickup'
                const isDelivered = order.status === 'delivered'

                return (
                  <div key={order.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{order.order_number}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({order.portions_count} Porciones)</span>
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                          {order.customer_name}
                        </div>
                        {order.customer_phone && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                            Tel: {order.customer_phone}
                          </div>
                        )}
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
                        {order.status === 'pending' ? 'Por Hornear' :
                         order.status === 'baking' ? 'En Horneado' :
                         order.status === 'decorating' ? 'En Decoración' :
                         order.status === 'ready_for_pickup' ? 'Lista p/ Entrega' :
                         order.status === 'delivered' ? 'Entregada' : 'Cancelada'}
                      </span>
                    </div>

                    {/* Cake Details */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Masa: </span>
                        <strong>{order.dough_flavor}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Relleno: </span>
                        <span>{order.filling_flavor}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Cubierta: </span>
                        <span>{order.covering_type}</span>
                      </div>
                      {order.dedication_text && (
                        <div style={{ fontStyle: 'italic', marginTop: 2, color: 'var(--text-primary)' }}>
                          Dedicatoria: &quot;{order.dedication_text}&quot;
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Fecha de Entrega: {formatDate(order.delivery_date)} a las {order.delivery_time}
                      </div>
                    </div>

                    {/* Financials */}
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

                    {/* Status Transitions & WhatsApp */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'baking')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Iniciar Horneado
                        </button>
                      )}
                      {order.status === 'baking' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'decorating')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Pasar a Decoración
                        </button>
                      )}
                      {order.status === 'decorating' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Marcar Lista p/ Entrega
                        </button>
                      )}
                      {order.status === 'ready_for_pickup' && (
                        <>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="btn-neu btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                          >
                            Entregar al Cliente
                          </button>
                          {order.customer_phone && (
                            <a
                              href={getWhatsAppCakeReadyUrl(order)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-neu btn-ghost"
                              title="Avisar por WhatsApp que la torta está lista"
                              style={{ padding: '7px 10px' }}
                            >
                              <MessageSquare size={14} strokeWidth={2} />
                            </a>
                          )}
                        </>
                      )}
                      {order.status === 'delivered' && (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Torta entregada satisfactoriamente
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

      {/* ── TAB 3: FICHAS TÉCNICAS & RECETARIO ── */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search & Category Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar receta..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['all', 'panes', 'pasteles', 'hojaldres', 'galletas', 'reposteria'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setRecipeCategoryFilter(cat)}
                  className={`btn-neu ${recipeCategoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}
                >
                  {cat === 'all' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Scale size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay recetas registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Estandariza tus fórmulas panaderas con gramajes, porcentaje panadero y escandallo de costos.
              </p>
              <button onClick={() => setShowRecipeModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Crear Ficha Técnica
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {filteredRecipes.map(r => (
                <div key={r.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                        {r.category}
                      </span>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>
                        {r.name}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Rendimiento: <strong>{r.yield_quantity} {r.yield_unit}</strong> • {r.baking_temp_celsius}°C / {r.baking_time_minutes} min
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Costo Unit.</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatCurrency(Number(r.cost_per_unit))}</strong>
                    </div>
                  </div>

                  {/* Ingredients List */}
                  <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>Ingredientes & Escandallo:</div>
                    {(r.bakery_recipe_ingredients || []).map((ing, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-color)', paddingBottom: 2 }}>
                        <span>• {ing.ingredient_name} ({ing.quantity} {ing.unit})</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {ing.bakers_percentage ? `${ing.bakers_percentage}% | ` : ''}{formatCurrency(Number(ing.total_cost))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cost & Price Balance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '6px 8px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Costo Tanda</span>
                      <strong>{formatCurrency(Number(r.cost_per_batch))}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>PVP Sugerido</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(r.suggested_sale_price))}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Margen</span>
                      <span style={{ fontWeight: 700 }}>
                        {r.suggested_sale_price > 0 ? `${Math.round(((Number(r.suggested_sale_price) - Number(r.cost_per_unit)) / Number(r.suggested_sale_price)) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {r.instructions && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {r.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: VITRINA & COMBOS DE CAFÉ ── */}
      {activeTab === 'display' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Vitrina de Venta Rápida & Sugerencias de Cafetería
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Configuración de combos para el Punto de Venta (POS) que combinan productos de panadería recién horneados con bebidas.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Combo Desayuno Francés</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      1 Croissant de Mantequilla + 1 Capuchino 8oz + 1 Jugo de Naranja
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>$ 8.500</strong>
                </div>
              </div>

              <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Combo Merienda Tradicional</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      2 Pan de Bono Valluno + 1 Café con Leche 8oz
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>$ 6.000</strong>
                </div>
              </div>

              <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Combo Tarde Dulce</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      1 Porción de Torta Selva Negra + 1 Café Americano
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>$ 9.500</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: REGISTRAR HORNEADA ── */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 500, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Registrar Nueva Horneada</h3>
              <button onClick={() => setShowBatchModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Seleccionar Receta (Opcional)</label>
                <select
                  className="input-neu"
                  value={batchForm.recipe_id}
                  onChange={e => {
                    const selId = e.target.value
                    const rec = recipes.find(r => r.id === selId)
                    setBatchForm(f => ({
                      ...f,
                      recipe_id: selId,
                      recipe_name: rec ? rec.name : f.recipe_name,
                      planned_units: rec ? rec.yield_quantity : f.planned_units,
                      actual_units: rec ? rec.yield_quantity : f.actual_units
                    }))
                  }}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                >
                  <option value="">-- Personalizado / Sin receta maestra --</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Producto Horneado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pan Francés, Croissants, Buñuelos"
                  className="input-neu"
                  value={batchForm.recipe_name}
                  onChange={e => setBatchForm(f => ({ ...f, recipe_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Panadero a Cargo</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={batchForm.baker_name}
                    onChange={e => setBatchForm(f => ({ ...f, baker_name: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Turno</label>
                  <select
                    className="input-neu"
                    value={batchForm.shift}
                    onChange={e => setBatchForm(f => ({ ...f, shift: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="manana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Planificadas</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-neu"
                    value={batchForm.planned_units}
                    onChange={e => setBatchForm(f => ({ ...f, planned_units: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Obtenidas *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-neu"
                    value={batchForm.actual_units}
                    onChange={e => setBatchForm(f => ({ ...f, actual_units: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Merma</label>
                  <input
                    type="number"
                    min="0"
                    className="input-neu"
                    value={batchForm.waste_units}
                    onChange={e => setBatchForm(f => ({ ...f, waste_units: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas u Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Fermentación de 3h, horneado con vapor"
                  className="input-neu"
                  value={batchForm.notes}
                  onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Registrar Horneada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: NUEVO PEDIDO DE TORTA ── */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 540, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Nuevo Pedido de Torta / Evento</h3>
              <button onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofia Restrepo"
                    className="input-neu"
                    value={orderForm.customer_name}
                    onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 3123456789"
                    className="input-neu"
                    value={orderForm.customer_phone}
                    onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo de Evento</label>
                  <select
                    className="input-neu"
                    value={orderForm.event_type}
                    onChange={e => setOrderForm(f => ({ ...f, event_type: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="cumpleanos">Cumpleaños</option>
                    <option value="boda">Boda</option>
                    <option value="bautizo">Bautizo / Primera Comunión</option>
                    <option value="empresarial">Empresarial</option>
                    <option value="aniversario">Aniversario</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha Entrega *</label>
                  <input
                    type="date"
                    required
                    className="input-neu"
                    value={orderForm.delivery_date}
                    onChange={e => setOrderForm(f => ({ ...f, delivery_date: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Hora Entrega</label>
                  <input
                    type="time"
                    className="input-neu"
                    value={orderForm.delivery_time}
                    onChange={e => setOrderForm(f => ({ ...f, delivery_time: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Porciones</label>
                  <input
                    type="number"
                    min="4"
                    className="input-neu"
                    value={orderForm.portions_count}
                    onChange={e => setOrderForm(f => ({ ...f, portions_count: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Sabor de Masa</label>
                  <input
                    type="text"
                    placeholder="Vainilla, Chocolate, Red Velvet"
                    className="input-neu"
                    value={orderForm.dough_flavor}
                    onChange={e => setOrderForm(f => ({ ...f, dough_flavor: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Relleno</label>
                  <input
                    type="text"
                    placeholder="Arequipe, Nutella, Frutos Rojos"
                    className="input-neu"
                    value={orderForm.filling_flavor}
                    onChange={e => setOrderForm(f => ({ ...f, filling_flavor: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo de Cubierta / Decoración</label>
                <input
                  type="text"
                  placeholder="Crema Chantilly, Fondant, Merengue, Naked Cake"
                  className="input-neu"
                  value={orderForm.covering_type}
                  onChange={e => setOrderForm(f => ({ ...f, covering_type: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Dedicatoria / Letrero en la Torta</label>
                <input
                  type="text"
                  placeholder='Ej: "¡Feliz Cumpleaños Camila!"'
                  className="input-neu"
                  value={orderForm.dedication_text}
                  onChange={e => setOrderForm(f => ({ ...f, dedication_text: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Total ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-neu"
                    value={orderForm.total_price}
                    onChange={e => setOrderForm(f => ({ ...f, total_price: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Abono / Anticipo ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-neu"
                    value={orderForm.advance_payment}
                    onChange={e => setOrderForm(f => ({ ...f, advance_payment: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Crear Pedido de Torta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: NUEVA FICHA TÉCNICA / RECETA ── */}
      {showRecipeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 560, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Nueva Ficha Técnica de Panadería / Pastelería</h3>
              <button onClick={() => setShowRecipeModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRecipe} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre de la Receta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Croissant de Mantequilla"
                    className="input-neu"
                    value={recipeForm.name}
                    onChange={e => setRecipeForm(f => ({ ...f, name: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Categoría</label>
                  <select
                    className="input-neu"
                    value={recipeForm.category}
                    onChange={e => setRecipeForm(f => ({ ...f, category: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="panes">Panes</option>
                    <option value="pasteles">Pasteles</option>
                    <option value="hojaldres">Hojaldres</option>
                    <option value="galletas">Galletas</option>
                    <option value="reposteria">Repostería</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Rendimiento</label>
                  <input
                    type="number"
                    min="1"
                    className="input-neu"
                    value={recipeForm.yield_quantity}
                    onChange={e => setRecipeForm(f => ({ ...f, yield_quantity: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Unidad</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={recipeForm.yield_unit}
                    onChange={e => setRecipeForm(f => ({ ...f, yield_unit: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Horno (°C)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={recipeForm.baking_temp_celsius}
                    onChange={e => setRecipeForm(f => ({ ...f, baking_temp_celsius: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tiempo (min)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={recipeForm.baking_time_minutes}
                    onChange={e => setRecipeForm(f => ({ ...f, baking_time_minutes: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>PVP Sugerido ($)</label>
                <input
                  type="number"
                  min="0"
                  className="input-neu"
                  value={recipeForm.suggested_sale_price}
                  onChange={e => setRecipeForm(f => ({ ...f, suggested_sale_price: Number(e.target.value) }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              {/* Ingredients List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ingredientes de la Receta</span>
                  <button
                    type="button"
                    onClick={() => setRecipeForm(f => ({
                      ...f,
                      ingredients: [...f.ingredients, { ingredient_name: '', quantity: 0.1, unit: 'kg', unit_cost: 5000, total_cost: 500, bakers_percentage: 10 }]
                    }))}
                    className="btn-neu btn-ghost"
                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                  >
                    + Agregar Insumo
                  </button>
                </div>

                {recipeForm.ingredients.map((ing, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Ingrediente"
                      className="input-neu"
                      value={ing.ingredient_name}
                      onChange={e => {
                        const val = e.target.value
                        setRecipeForm(f => {
                          const next = [...f.ingredients]
                          next[idx].ingredient_name = val
                          return { ...f, ingredients: next }
                        })
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    />
                    <input
                      type="number"
                      placeholder="Cantidad"
                      className="input-neu"
                      value={ing.quantity}
                      onChange={e => {
                        const q = Number(e.target.value)
                        setRecipeForm(f => {
                          const next = [...f.ingredients]
                          next[idx].quantity = q
                          next[idx].total_cost = q * next[idx].unit_cost
                          return { ...f, ingredients: next }
                        })
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Unidad (kg/gr)"
                      className="input-neu"
                      value={ing.unit}
                      onChange={e => {
                        const u = e.target.value
                        setRecipeForm(f => {
                          const next = [...f.ingredients]
                          next[idx].unit = u
                          return { ...f, ingredients: next }
                        })
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, textAlign: 'right' }}>
                      {formatCurrency(ing.total_cost)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecipeForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))}
                      className="btn-neu btn-ghost"
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Instrucciones de Amasado / Fermentado / Horneado</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones paso a paso..."
                  className="input-neu"
                  value={recipeForm.instructions}
                  onChange={e => setRecipeForm(f => ({ ...f, instructions: e.target.value }))}
                  style={{ fontSize: '0.8rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowRecipeModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
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
