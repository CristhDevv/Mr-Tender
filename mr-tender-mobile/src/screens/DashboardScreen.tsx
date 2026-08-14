import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/auth'

export default function DashboardScreen({ navigation }: any) {
  const { user, logout, tenantId } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [personalSales, setPersonalSales] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)

  useEffect(() => {
    async function loadPersonalStats() {
      if (!user || !tenantId) return
      try {
        const todayStr = new Date().toISOString().split('T')[0]

        const { data } = await supabase
          .from('sales')
          .select('total')
          .eq('seller_id', user.id)
          .gte('created_at', todayStr + 'T00:00:00')
          .lte('created_at', todayStr + 'T23:59:59')
        
        if (data) {
          const sum = data.reduce((s, i) => s + Number(i.total), 0)
          setPersonalSales(sum)
          setOrdersCount(data.length)
        }
      } catch (err) {
        console.error('Error loading personal stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPersonalStats()
  }, [user, tenantId])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* User welcome */}
      <View style={styles.card}>
        <Text style={styles.welcomeTitle}>¡Hola, {user.user_metadata?.full_name || 'Vendedor'}! 👋</Text>
        <Text style={styles.welcomeSub}>Plataforma Mr Tender activa</Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.card, styles.kpiCard]}>
          <Text style={styles.kpiLabel}>Mis ventas hoy</Text>
          <Text style={styles.kpiValue}>${personalSales.toFixed(2)}</Text>
        </View>
        <View style={[styles.card, styles.kpiCard]}>
          <Text style={styles.kpiLabel}>Mis pedidos hoy</Text>
          <Text style={styles.kpiValue}>{ordersCount}</Text>
        </View>
      </View>

      {/* Navigation options */}
      <View style={styles.navContainer}>
        <TouchableOpacity style={[styles.card, styles.navBtn]} onPress={() => navigation.navigate('POS')}>
          <Text style={styles.navIcon}>🛒</Text>
          <Text style={styles.navLabel}>Nueva Venta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, styles.navBtn]} onPress={() => navigation.navigate('Attendance')}>
          <Text style={styles.navIcon}>⏰</Text>
          <Text style={styles.navLabel}>Asistencia</Text>
        </TouchableOpacity>
      </View>

      {/* Action button */}
      <TouchableOpacity style={[styles.card, styles.logoutBtn]} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0', padding: 20, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8ECF0' },
  card: {
    backgroundColor: '#E8ECF0',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16
  },
  welcomeTitle: { fontSize: 18, fontWeight: '800', color: '#2D3142' },
  welcomeSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  kpiCard: { flex: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#4A90D9', marginTop: 6 },
  navContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 24 },
  navIcon: { fontSize: 32, marginBottom: 8 },
  navLabel: { fontSize: 13, fontWeight: '700', color: '#2D3142' },
  logoutBtn: { alignItems: 'center', backgroundColor: '#E8745A', padding: 14, shadowColor: '#E8745A', shadowOpacity: 0.3 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '700' }
})
