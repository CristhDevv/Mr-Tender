import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/auth'

export default function AttendanceScreen() {
  const { tenantId, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [activeAttendance, setActiveAttendance] = useState<any | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function loadAttendanceStatus() {
      if (!tenantId || !user) return
      try {
        // Resolve employee
        const { data: empData } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (empData) {
          setEmployeeId(empData.id)

          // Find active attendance (check_in today where check_out is null)
          const { data: attData } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', empData.id)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)

          if (attData && attData.length > 0) {
            setActiveAttendance(attData[0])
          }
        }
      } catch (err) {
        console.error('Error fetching attendance:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAttendanceStatus()
  }, [tenantId, user])

  async function handleCheckIn() {
    if (!tenantId || !employeeId) return
    setProcessing(true)

    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          tenant_id: tenantId,
          employee_id: employeeId,
          check_in: new Date().toISOString(),
          notes: 'Fichaje móvil registrado'
        })
        .select('*')
        .single()

      if (error) throw error

      setActiveAttendance(data)
      Alert.alert('Éxito', 'Entrada registrada con éxito')
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err.message || 'No se pudo registrar la entrada')
    } finally {
      setProcessing(false)
    }
  }

  async function handleCheckOut() {
    if (!activeAttendance || !employeeId) return
    setProcessing(true)

    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: new Date().toISOString(),
        })
        .eq('id', activeAttendance.id)

      if (error) throw error

      setActiveAttendance(null)
      Alert.alert('Éxito', 'Salida registrada con éxito')
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err.message || 'No se pudo registrar la salida')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Cargando estado...</Text>
      </View>
    )
  }

  if (!employeeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No estás registrado como empleado activo.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Control de Asistencia</Text>
        <Text style={styles.subtitle}>Registro de jornada laboral</Text>

        <View style={styles.divider} />

        {activeAttendance ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.statusText}>🟢 Fichado</Text>
            <Text style={styles.timeText}>
              Entrada: {new Date(activeAttendance.check_in).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleCheckOut} disabled={processing}>
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Fichar Salida</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.statusText}>🔴 No fichado</Text>
            <Text style={styles.timeText}>Registra tu entrada de hoy</Text>
            <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={handleCheckIn} disabled={processing}>
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Fichar Entrada</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0', justifyContent: 'center', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8ECF0' },
  loadingText: { marginTop: 10, color: '#6B7280', fontWeight: '600' },
  errorText: { color: '#E8745A', fontWeight: '700', fontSize: 15, textAlign: 'center', padding: 20 },
  card: {
    backgroundColor: '#E8ECF0',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 4
  },
  title: { fontSize: 20, fontWeight: '800', color: '#2D3142' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#DDE1E7', width: '100%', marginVertical: 24 },
  statusText: { fontSize: 18, fontWeight: '700', color: '#2D3142', marginBottom: 6 },
  timeText: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  btn: {
    width: 200,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3
  },
  btnSuccess: { backgroundColor: '#5CB85C' },
  btnDanger: { backgroundColor: '#E8745A' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
})
