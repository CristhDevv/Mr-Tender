import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ScrollView, ActivityIndicator, Alert } from 'react-native'
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

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return
      try {
        // Resolve branch & warehouse
        const { data: brs } = await supabase.from('branches').select('id').eq('tenant_id', tenantId).limit(1)
        const { data: whs } = await supabase.from('warehouses').select('id').eq('tenant_id', tenantId).limit(1)
        const { data: regs } = await supabase.from('cash_registers').select('id, current_session_id').eq('tenant_id', tenantId).limit(1)

        const branch_id = brs?.[0]?.id || null
        const warehouse_id = whs?.[0]?.id || null
        const register_id = regs?.[0]?.id || null
        const session_id = regs?.[0]?.current_session_id || null

        setConfig({ branch_id, warehouse_id, register_id, session_id })

        const { data: prods, error } = await supabase
          .from('products')
          .select(`
            id, name, sale_price, cost_price, sku, barcode,
            categories (name),
            inventory (quantity)
          `)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
        
        if (error) throw error

        if (prods) {
          const formatted: Product[] = prods.map((p: any, idx: number) => {
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
        Alert.alert('Error', 'No se pudieron cargar los productos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [tenantId])

  const filtered = products.filter(p => {
    const matchCat = category === 'Todos' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

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

  async function handleCheckout() {
    if (cart.length === 0 || !config || submitting) return
    setSubmitting(true)

    const payload = {
      tenant_id: tenantId,
      seller_id: user.id,
      register_id: config.register_id,
      session_id: config.session_id,
      branch_id: config.branch_id,
      customer_id: null,
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
          payment_method: 'cash',
          amount: total,
          received_amount: total,
          change_amount: 0
        }
      ]
    }

    try {
      const { data, error } = await supabase.rpc('process_sale', { p_sale_data: payload })
      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      Alert.alert('Éxito', `Venta completada. Folio: ${data.number}`)
      setCart([])
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
      {/* Search & Categories */}
      <View style={styles.header}>
        <TextInput style={styles.searchBar} placeholder="🔍 Buscar producto..." placeholderTextColor="#9CA3AF" value={search} onChangeText={setSearch} />
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
        <FlatList data={filtered} keyExtractor={item => item.id} numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.prodCard} onPress={() => addToCart(item)}>
              <Text style={styles.prodEmoji}>{item.emoji}</Text>
              <Text style={styles.prodName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.prodPrice}>${item.price.toFixed(2)}</Text>
              <Text style={styles.prodStock}>{item.stock} disponibles</Text>
            </TouchableOpacity>
          )} />
      </View>

      {/* Cart bottom sheet (Summary) */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Carrito ({cart.reduce((s, i) => s + i.quantity, 0)})</Text>
            <Text style={styles.cartTotal}>Total: ${total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.payBtn} onPress={handleCheckout} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>Confirmar Venta (${total.toFixed(2)})</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8ECF0' },
  loadingText: { marginTop: 10, color: '#6B7280', fontWeight: '600' },
  header: { padding: 16, backgroundColor: '#E8ECF0' },
  searchBar: {
    backgroundColor: '#DDE1E7',
    padding: 12,
    borderRadius: 14,
    color: '#2D3142',
    fontWeight: '500',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3
  },
  catScroll: { marginTop: 12, flexDirection: 'row' },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8ECF0',
    marginRight: 8,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 2
  },
  catBtnActive: { backgroundColor: '#4A90D9' },
  catText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  catTextActive: { color: '#fff' },
  main: { flex: 1, paddingHorizontal: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  prodCard: {
    backgroundColor: '#E8ECF0',
    borderRadius: 16,
    padding: 14,
    width: '48%',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 3
  },
  prodEmoji: { fontSize: 28, marginBottom: 4 },
  prodName: { fontSize: 13, fontWeight: '700', color: '#2D3142' },
  prodPrice: { fontSize: 15, fontWeight: '800', color: '#4A90D9', marginTop: 4 },
  prodStock: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  cartSummary: {
    backgroundColor: '#E8ECF0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8
  },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cartTitle: { fontSize: 15, fontWeight: '700', color: '#2D3142' },
  cartTotal: { fontSize: 17, fontWeight: '800', color: '#4A90D9' },
  payBtn: {
    backgroundColor: '#5CB85C',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3
  },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
})
