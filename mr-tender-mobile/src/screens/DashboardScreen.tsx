import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/auth'

export default function DashboardScreen({ navigation }: any) {
  const { user, logout, tenantId } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [personalSales, setPersonalSales] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!user || !tenantId) return
      try {
        const todayStr = new Date().toISOString().split('T')[0]

        const [salesResult, cajaResult] = await Promise.all([
          supabase
            .from('sales')
            .select('total')
            .eq('seller_id', user.id)
            .gte('created_at', todayStr + 'T00:00:00')
            .lte('created_at', todayStr + 'T23:59:59'),
          supabase
            .from('cash_registers')
            .select('current_session_id')
            .eq('tenant_id', tenantId)
            .limit(1)
        ])

        if (salesResult.data) {
          const sum = salesResult.data.reduce((s: number, i: any) => s + Number(i.total), 0)
          setPersonalSales(sum)
          setOrdersCount(salesResult.data.length)
        }

        const sessionId = cajaResult.data?.[0]?.current_session_id || null
        setCajaAbierta(!!sessionId)
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, tenantId])

  function handlePOS() {
    if (!cajaAbierta) {
      Alert.alert(
        'Caja Cerrada',
        'La caja esta cerrada. Podras ingresar al POS pero no podras confirmar ventas hasta abrir un turno de caja.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir al POS de todas formas', onPress: () => navigation.navigate('POS') }
        ]
      )
      return
    }
    navigation.navigate('POS')
  }

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
        <Text style={styles.welcomeTitle}>Hola, {user.user_metadata?.full_name || 'Vendedor'}! 👋</Text>
        <Text style={styles.welcomeSub}>Plataforma Mr Tender activa</Text>
      </View>

      {/* Caja status */}
      {cajaAbierta !== null && (
        <View style={[styles.cajaStatus, cajaAbierta ? styles.cajaOpen : styles.cajaClosed]}>
          <Text style={[styles.cajaStatusText, { color: cajaAbierta ? '#16A34A' : '#DC2626' }]}>
            {cajaAbierta ? 'Caja abierta — Puedes realizar ventas' : 'Caja cerrada — Abre un turno para vender'}
          </Text>
        </View>
      )}

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
      <View style={{ gap: 10, marginBottom: 16 }}>
        <View style={styles.navContainer}>
          <TouchableOpacity style={[styles.card, styles.navBtn]} onPress={handlePOS}>
            <Text style={styles.navIcon}>🛒</Text>
            <Text style={styles.navLabel}>Nueva Venta</Text>
            {cajaAbierta === false && (
              <Text style={styles.navWarning}>Caja cerrada</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, styles.navBtn]} onPress={() => navigation.navigate('Cash')}>
            <Text style={styles.navIcon}>💵</Text>
            <Text style={styles.navLabel}>Caja y Turnos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navContainer}>
          <TouchableOpacity style={[styles.card, styles.navBtn]} onPress={() => navigation.navigate('Sales')}>
            <Text style={styles.navIcon}>🧾</Text>
            <Text style={styles.navLabel}>Historial Ventas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, styles.navBtn]} onPress={() => navigation.navigate('Attendance')}>
            <Text style={styles.navIcon}>⏰</Text>
            <Text style={styles.navLabel}>Asistencia</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action button */}
      <TouchableOpacity style={[styles.card, styles.logoutBtn]} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesion</Text>
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
  cajaStatus: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cajaOpen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  cajaClosed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  cajaStatusText: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  kpiCard: { flex: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#4A90D9', marginTop: 6 },
  navContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 24 },
  navIcon: { fontSize: 32, marginBottom: 8 },
  navLabel: { fontSize: 13, fontWeight: '700', color: '#2D3142' },
  navWarning: { fontSize: 10, color: '#DC2626', fontWeight: '700', marginTop: 4 },
  logoutBtn: { alignItems: 'center', backgroundColor: '#E8745A', padding: 14, shadowColor: '#E8745A', shadowOpacity: 0.3 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '700' }
})
