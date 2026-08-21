import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/auth'

interface Product {
  id: string
  name: string
  price: number
  sku: string
  emoji: string
  stock: number
  category: string
  cost: number
  warehouse_id?: string
}

interface CartItem extends Product {
  quantity: number
  lineTotal: number
}

interface Customer {
  id: string
  full_name: string
  phone: string | null
  credit_limit: number
  credit_used: number
}

const EMOJIS = ['🥤', '🥛', '🍞', '🫙', '🧼', '🧻', '🧽', '🍚', '☕', '🍗', '🫘', '🧴']

export default function POSScreen({ navigation }: any) {
  const { tenantId, user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(['Todos'])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [config, setConfig] = useState<any>(null)

  // Payment & Customer state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'fiao'>('cash')
  const [transferRef, setTransferRef] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [tenantId])

  async function loadData() {
    if (!tenantId) return
    try {
      setLoading(true)
      const [brs, whs, regs, custs, prods] = await Promise.all([
        supabase.from('branches').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('warehouses').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('cash_registers').select('id, current_session_id').eq('tenant_id', tenantId).limit(1),
        supabase.from('customers').select('id, full_name, phone, credit_limit, credit_used').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('products').select(`id, name, sale_price, cost_price, sku, barcode, categories (name), inventory (quantity)`).eq('tenant_id', tenantId).eq('is_active', true)
      ])

      const branch_id = brs.data?.[0]?.id || null
      const warehouse_id = whs.data?.[0]?.id || null
      const register_id = regs.data?.[0]?.id || null
      const session_id = regs.data?.[0]?.current_session_id || null

      setConfig({ branch_id, warehouse_id, register_id, session_id })
      setCustomers(custs.data || [])

      if (prods.data) {
        const formatted: Product[] = prods.data.map((p: any, idx: number) => {
          const stock = p.inventory?.reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0) || 0
          return {
            id: p.id,
            name: p.name,
            price: Number(p.sale_price),
            cost: Number(p.cost_price),
            sku: p.sku || p.barcode || '',
            emoji: EMOJIS[idx % EMOJIS.length],
            stock,
            category: p.categories?.name || 'General',
            warehouse_id
          }
        })
        setProducts(formatted)
        setCategories(['Todos', ...Array.from(new Set(formatted.map(p => p.category)))])
      }
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', 'No se pudieron cargar los datos del catálogo')
    } finally {
      setLoading(false)
    }
  }

  const filtered = search.trim() === '' ? [] : products.filter(p => {
    const matchCat = category === 'Todos' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const filteredCustomers = customerSearch.trim() === '' ? customers : customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))
  )

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.price } : i)
      }
      return [...prev, { ...product, quantity: 1, lineTotal: product.price }]
    })
  }

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) {
      setCart(prev => prev.filter(i => i.id !== id))
      return
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty, lineTotal: qty * i.price } : i))
  }

  const total = cart.reduce((s, i) => s + i.lineTotal, 0)
  const cajaAbierta = !!(config?.session_id)

  function openCheckout() {
    if (cart.length === 0) return
    if (!cajaAbierta) {
      Alert.alert('Caja Cerrada', 'Debes abrir un turno de caja antes de realizar ventas.')
      return
    }
    setShowPaymentModal(true)
  }

  async function handleCheckout() {
    if (cart.length === 0 || !config || submitting) return

    if (!config.session_id) {
      Alert.alert('Caja Cerrada', 'Debes abrir un turno de caja antes de realizar ventas.')
      return
    }

    if (paymentMethod === 'transfer' && !transferRef.trim()) {
      Alert.alert('Comprobante requerido', 'Ingresa el número de comprobante o referencia de la transferencia.')
      return
    }

    if (paymentMethod === 'fiao') {
      if (!selectedCustomer) {
        Alert.alert('Cliente requerido', 'Debes seleccionar un cliente para registrar una venta a crédito / fiao.')
        return
      }
      const available = Number(selectedCustomer.credit_limit || 0) - Number(selectedCustomer.credit_used || 0)
      if (total > available) {
        Alert.alert('Cupo insuficiente', `El cliente solo tiene $${available.toFixed(2)} disponible de cupo.`)
        return
      }
    }

    setSubmitting(true)

    const payload = {
      tenant_id: tenantId,
      seller_id: user.id,
      register_id: config.register_id,
      session_id: config.session_id,
      branch_id: config.branch_id,
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      subtotal: total,
      discount_amount: 0,
      tax_amount: total * 0.16,
      tip_amount: 0,
      total,
      change_amount: 0,
      points_redeemed: 0,
      items: cart.map(item => ({
        product_id: item.id,
        variant_id: null,
        product_name: item.name,
        product_sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        original_price: item.price,
        discount_percentage: 0,
        discount_amount: 0,
        tax_rate: 16.00,
        tax_amount: item.lineTotal * 0.16,
        subtotal: item.lineTotal / 1.16,
        total: item.lineTotal,
        cost_price: item.cost,
        warehouse_id: config.warehouse_id
      })),
      payments: [
        {
          payment_method: paymentMethod,
          amount: total,
          received_amount: total,
          change_amount: 0,
          reference: paymentMethod === 'transfer' ? transferRef.trim() : null
        }
      ]
    }

    try {
      const { data, error } = await supabase.rpc('process_sale', { p_sale_data: payload })
      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      if (paymentMethod === 'fiao' && selectedCustomer) {
        const newCredit = Number(selectedCustomer.credit_used || 0) + total
        await supabase.from('customers').update({ credit_used: newCredit }).eq('id', selectedCustomer.id)
      }

      Alert.alert('✅ Venta Exitosa', `Venta completada correctamente.\nFolio: ${data.number}\nMétodo: ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'transfer' ? 'Transferencia' : 'Fiao'}`)
      
      setCart([])
      setShowPaymentModal(false)
      setSelectedCustomer(null)
      setTransferRef('')
      setPaymentMethod('cash')
      loadData()
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err.message || 'No se pudo procesar la venta')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Cargando catálogo...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Caja Cerrada Banner */}
      {!cajaAbierta && (
        <View style={styles.cajaBanner}>
          <Text style={styles.cajaBannerText}>🔒 Caja cerrada — Abre un turno para registrar ventas</Text>
        </View>
      )}

      {/* Customer Quick Selector Badge */}
      <View style={styles.topCustomerBar}>
        <TouchableOpacity style={styles.customerSelectorBtn} onPress={() => setShowCustomerModal(true)}>
          <Text style={styles.customerSelectorText}>
            👤 {selectedCustomer ? selectedCustomer.full_name : 'Cliente General (Toca para cambiar)'}
          </Text>
        </TouchableOpacity>
        {selectedCustomer && (
          <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={styles.clearCustBtn}>
            <Text style={{ color: '#E8745A', fontWeight: '800' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search & Categories */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Buscar producto o código..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map(c => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)}
              style={[styles.catBtn, category === c ? styles.catBtnActive : null]}>
              <Text style={[styles.catText, category === c ? styles.catTextActive : null]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Grid */}
      <View style={styles.main}>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={filtered.length > 0 ? styles.row : undefined}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.prodCard} onPress={() => addToCart(item)}>
              <Text style={styles.prodEmoji}>{item.emoji}</Text>
              <Text style={styles.prodName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.prodPrice}>${item.price.toFixed(2)}</Text>
              <Text style={styles.prodStock}>{item.stock} disponibles</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>🔍</Text>
              <Text style={styles.emptyText}>
                {search.trim() === ''
                  ? 'Escribe o escanea un producto para buscar'
                  : 'No se encontraron coincidencias'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Cart bottom summary */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Carrito ({cart.reduce((s, i) => s + i.quantity, 0)})</Text>
            <Text style={styles.cartTotal}>Total: ${total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.payBtn, !cajaAbierta && styles.payBtnDisabled]}
            onPress={openCheckout}
            disabled={!cajaAbierta}
          >
            <Text style={styles.payBtnText}>
              {!cajaAbierta ? '🔒 Caja cerrada' : `Cobrar $${total.toFixed(2)}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL: CUSTOMER PICKER */}
      <Modal visible={showCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Buscar por nombre o teléfono..."
              placeholderTextColor="#9CA3AF"
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />
            <FlatList
              data={filteredCustomers}
              keyExtractor={c => c.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const available = Number(item.credit_limit || 0) - Number(item.credit_used || 0)
                return (
                  <TouchableOpacity
                    style={styles.customerItem}
                    onPress={() => {
                      setSelectedCustomer(item)
                      setShowCustomerModal(false)
                    }}
                  >
                    <View>
                      <Text style={styles.customerName}>{item.full_name}</Text>
                      <Text style={styles.customerPhone}>{item.phone || 'Sin teléfono'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.customerCreditLabel}>Cupo Disp.</Text>
                      <Text style={[styles.customerCreditValue, { color: available > 0 ? '#16A34A' : '#E8745A' }]}>
                        ${available.toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>No se encontraron clientes</Text>
              }
            />
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setSelectedCustomer(null)
                setShowCustomerModal(false)
              }}
            >
              <Text style={styles.modalCancelText}>Dejar como Cliente General</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: PAYMENT METHOD & CHECKOUT */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Método de Pago</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.paymentTotalLabel}>TOTAL A COBRAR</Text>
            <Text style={styles.paymentTotalValue}>${total.toFixed(2)}</Text>

            {/* Payment method selector tabs */}
            <View style={styles.paymentTabs}>
              <TouchableOpacity
                style={[styles.payTab, paymentMethod === 'cash' && styles.payTabActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={[styles.payTabText, paymentMethod === 'cash' && styles.payTabTextActive]}>
                  💵 Efectivo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payTab, paymentMethod === 'transfer' && styles.payTabActive]}
                onPress={() => setPaymentMethod('transfer')}
              >
                <Text style={[styles.payTabText, paymentMethod === 'transfer' && styles.payTabTextActive]}>
                  📱 Nequi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payTab, paymentMethod === 'fiao' && styles.payTabActive]}
                onPress={() => setPaymentMethod('fiao')}
              >
                <Text style={[styles.payTabText, paymentMethod === 'fiao' && styles.payTabTextActive]}>
                  📝 Fiao
                </Text>
              </TouchableOpacity>
            </View>

            {/* Transfer reference input */}
            {paymentMethod === 'transfer' && (
              <View style={{ marginVertical: 10 }}>
                <Text style={styles.inputLabel}>Número de Comprobante / Referencia</Text>
                <TextInput
                  style={styles.modalSearch}
                  placeholder="Ej: M1234567..."
                  placeholderTextColor="#9CA3AF"
                  value={transferRef}
                  onChangeText={setTransferRef}
                />
              </View>
            )}

            {/* Fiao Customer info */}
            {paymentMethod === 'fiao' && (
              <View style={{ marginVertical: 10 }}>
                <Text style={styles.inputLabel}>Cliente asignado al crédito</Text>
                <TouchableOpacity
                  style={styles.customerSelectorBtn}
                  onPress={() => setShowCustomerModal(true)}
                >
                  <Text style={styles.customerSelectorText}>
                    {selectedCustomer ? `👤 ${selectedCustomer.full_name}` : '⚠️ Seleccionar Cliente Obligatorio'}
                  </Text>
                </TouchableOpacity>
                {selectedCustomer && (
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Cupo disponible: ${(Number(selectedCustomer.credit_limit || 0) - Number(selectedCustomer.credit_used || 0)).toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.confirmSaleBtn}
              onPress={handleCheckout}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmSaleText}>Confirmar Venta (${total.toFixed(2)})</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8ECF0' },
  loadingText: { marginTop: 10, color: '#6B7280', fontWeight: '600' },
  cajaBanner: { backgroundColor: '#FEE2E2', borderBottomWidth: 1, borderBottomColor: '#FECACA', paddingVertical: 10, paddingHorizontal: 16 },
  cajaBannerText: { color: '#DC2626', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  topCustomerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  customerSelectorBtn: { flex: 1, backgroundColor: '#DDE1E7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  customerSelectorText: { fontSize: 12, fontWeight: '700', color: '#2D3142' },
  clearCustBtn: { padding: 8 },
  header: { padding: 16, backgroundColor: '#E8ECF0' },
  searchBar: { backgroundColor: '#DDE1E7', padding: 12, borderRadius: 14, color: '#2D3142', fontWeight: '500' },
  catScroll: { marginTop: 12, flexDirection: 'row' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E8ECF0', marginRight: 8, shadowColor: '#A3B1C6', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 2 },
  catBtnActive: { backgroundColor: '#4A90D9' },
  catText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  catTextActive: { color: '#fff' },
  main: { flex: 1, paddingHorizontal: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  prodCard: { backgroundColor: '#E8ECF0', borderRadius: 16, padding: 14, width: '48%', shadowColor: '#A3B1C6', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 3 },
  prodEmoji: { fontSize: 28, marginBottom: 4 },
  prodName: { fontSize: 13, fontWeight: '700', color: '#2D3142' },
  prodPrice: { fontSize: 15, fontWeight: '800', color: '#4A90D9', marginTop: 4 },
  prodStock: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  cartSummary: { backgroundColor: '#E8ECF0', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: '#A3B1C6', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cartTitle: { fontSize: 15, fontWeight: '700', color: '#2D3142' },
  cartTotal: { fontSize: 17, fontWeight: '800', color: '#4A90D9' },
  payBtn: { backgroundColor: '#5CB85C', padding: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#A3B1C6', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 3 },
  payBtnDisabled: { backgroundColor: '#9CA3AF' },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#E8ECF0', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#2D3142' },
  closeModalText: { fontSize: 18, fontWeight: '800', color: '#6B7280' },
  modalSearch: { backgroundColor: '#DDE1E7', padding: 10, borderRadius: 10, color: '#2D3142', marginBottom: 10 },
  customerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#DDE1E7' },
  customerName: { fontSize: 14, fontWeight: '700', color: '#2D3142' },
  customerPhone: { fontSize: 11, color: '#9CA3AF' },
  customerCreditLabel: { fontSize: 10, color: '#9CA3AF' },
  customerCreditValue: { fontSize: 13, fontWeight: '800' },
  modalCancelBtn: { marginTop: 12, padding: 10, alignItems: 'center' },
  modalCancelText: { color: '#4A90D9', fontWeight: '700', fontSize: 13 },
  paymentTotalLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textAlign: 'center' },
  paymentTotalValue: { fontSize: 24, fontWeight: '900', color: '#4A90D9', textAlign: 'center', marginBottom: 16 },
  paymentTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  payTab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#DDE1E7', alignItems: 'center' },
  payTabActive: { backgroundColor: '#4A90D9' },
  payTabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  payTabTextActive: { color: '#fff' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  confirmSaleBtn: { backgroundColor: '#5CB85C', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  confirmSaleText: { color: '#fff', fontSize: 15, fontWeight: '800' }
})
