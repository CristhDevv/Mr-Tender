import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native'
import { useAuthStore } from './src/store/auth'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import POSScreen from './src/screens/POSScreen'
import AttendanceScreen from './src/screens/AttendanceScreen'

export default function App() {
  const { user, restoreSession } = useAuthStore()
  const [screen, setScreen] = useState<'dashboard' | 'pos' | 'attendance'>('dashboard')

  useEffect(() => {
    restoreSession()
  }, [])

  // Custom navigation router mock
  const navigation = {
    navigate: (screenName: string) => {
      if (screenName === 'POS') setScreen('pos')
      else if (screenName === 'Attendance') setScreen('attendance')
      else setScreen('dashboard')
    },
    goBack: () => setScreen('dashboard')
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#E8ECF0' }}>
        <StatusBar barStyle="dark-content" />
        <LoginScreen />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#E8ECF0' }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Mini top Header for back navigation */}
      {screen !== 'dashboard' && (
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => setScreen('dashboard')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {screen === 'pos' ? '🛒 Nueva Venta' : '⏰ Asistencia'}
          </Text>
          <View style={{ width: 60 }} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {screen === 'dashboard' && <DashboardScreen navigation={navigation} />}
        {screen === 'pos' && <POSScreen navigation={navigation} />}
        {screen === 'attendance' && <AttendanceScreen />}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  topNav: {
    height: 54,
    backgroundColor: '#E8ECF0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE1E7'
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8ECF0',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2
  },
  backBtnText: { color: '#4A90D9', fontWeight: '700', fontSize: 13 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#2D3142' }
})
