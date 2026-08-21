import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/auth'

export default function SalesHistoryScreen() {
  const { tenantId, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<any | null>(null)

  useEffect(() => {
    loadSales()
  }, [tenantId])

  async function loadSales() {
    if (!tenantId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, number, total, status, created_at,
          customers (full_name, phone),
          sale_payments (payment_method),
          sale_items (product_name, quantity, unit_price, total)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      setSales(data || [])
    } catch (err: any) {
      console.error('Error loading sales history:', err)
      Alert.alert('Error', 'No se pudo cargar el historial de ventas')
    } finally {
      setLoading(false)
    }
  }

  const filtered = search.trim() === '' ? sales : sales.filter(s =>
    s.number?.toLowerCase().includes(search.toLowerCase()) ||
    s.customers?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  function shareTicketWhatsApp(sale: any) {
    let phone = (sale.customers?.phone || '').replace(/\D/g, '')
    const itemsText = (sale.sale_items || [])
      .map((i: any) => `• ${i.quantity}x ${i.product_name} ($${Number(i.total).toFixed(2)})`)
      .join('\n')

    const message = `*FACTURA POS / TICKET DE COMPRA*
*Mr. Tender*
Folio: ${sale.number}
Fecha: ${new Date(sale.created_at).toLocaleString('es-CO')}
Cliente: ${sale.customers?.full_name || 'Público General'}

${itemsText}

*TOTAL: $${Number(sale.total).toFixed(2)}*
Pago: ${sale.sale_payments?.[0]?.payment_method === 'cash' ? 'Efectivo' : sale.sale_payments?.[0]?.payment_method === 'fiao' ? 'Fiao (Crédito)' : 'Transferencia'}

¡Muchas gracias por su compra!`

    if (phone) {
      if (!phone.startsWith('57') && phone.length === 10) phone = '57' + phone
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`)
    } else {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Buscar por folio o cliente..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isSelected = selectedSale?.id === item.id
          const method = item.sale_payments?.[0]?.payment_method || 'cash'
          return (
            <TouchableOpacity
              style={[styles.saleCard, isSelected && styles.saleCardActive]}
              onPress={() => setSelectedSale(isSelected ? null : item)}
            >
              <View style={styles.saleHeader}>
                <View>
                  <Text style={styles.saleNumber}>{item.number}</Text>
                  <Text style={styles.saleCustomer}>👤 {item.customers?.full_name || 'Cliente General'}</Text>
                  <Text style={styles.saleTime}>
                    📅 {new Date(item.created_at).toLocaleDateString('es-CO')} {new Date(item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.saleTotal}>${Number(item.total).toFixed(2)}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {method === 'cash' ? '💵 Efectivo' : method === 'transfer' ? '📱 Nequi' : '📝 Fiao'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expandable items detail */}
              {isSelected && (
                <View style={styles.expandedContent}>
                  <View style={styles.divider} />
                  <Text style={styles.itemsTitle}>Productos ({item.sale_items?.length || 0}):</Text>
                  {(item.sale_items || []).map((prod: any, idx: number) => (
                    <View key={idx} style={styles.prodRow}>
                      <Text style={styles.prodName}>{prod.quantity}x {prod.product_name}</Text>
                      <Text style={styles.prodTotal}>${Number(prod.total).toFixed(2)}</Text>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.waBtn} onPress={() => shareTicketWhatsApp(item)}>
                    <Text style={styles.waBtnText}>💬 Enviar Comprobante WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🧾</Text>
            <Text style={styles.emptyText}>No se encontraron ventas</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8ECF0', padding: 20 },
  loadingText: { marginTop: 10, color: '#6B7280', fontWeight: '600' },
  header: { padding: 16, backgroundColor: '#E8ECF0' },
  searchBar: { backgroundColor: '#DDE1E7', padding: 12, borderRadius: 14, color: '#2D3142', fontWeight: '500' },
  saleCard: { backgroundColor: '#E8ECF0', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#A3B1C6', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 3 },
  saleCardActive: { borderColor: '#4A90D9', borderWidth: 1.5 },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  saleNumber: { fontSize: 14, fontWeight: '800', color: '#2D3142' },
  saleCustomer: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  saleTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  saleTotal: { fontSize: 16, fontWeight: '900', color: '#4A90D9' },
  badge: { backgroundColor: '#DDE1E7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#2D3142' },
  expandedContent: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#DDE1E7', marginVertical: 8 },
  itemsTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 },
  prodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  prodName: { fontSize: 12, color: '#2D3142', fontWeight: '600' },
  prodTotal: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  waBtn: { backgroundColor: '#25D366', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  waBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', textAlign: 'center' }
})
