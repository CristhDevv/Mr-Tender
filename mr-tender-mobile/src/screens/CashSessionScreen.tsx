import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/auth'

export default function CashSessionScreen({ navigation }: any) {
  const { tenantId, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [register, setRegister] = useState<any>(null)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [openAmount, setOpenAmount] = useState('50000')
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeAmount, setCloseAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCashData()
  }, [tenantId])

  async function loadCashData() {
    if (!tenantId) return
    try {
      setLoading(true)
      const { data: regs, error: regErr } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)

      if (regErr) throw regErr

      const reg = regs?.[0]
      setRegister(reg)

      if (reg?.current_session_id) {
        const [sessRes, movRes] = await Promise.all([
          supabase
            .from('cash_sessions')
            .select('*')
            .eq('id', reg.current_session_id)
            .single(),
          supabase
            .from('cash_movements')
            .select('*')
            .eq('session_id', reg.current_session_id)
            .order('created_at', { ascending: false })
            .limit(20)
        ])

        setActiveSession(sessRes.data)
        setMovements(movRes.data || [])
      } else {
        setActiveSession(null)
        setMovements([])
      }
    } catch (err: any) {
      console.error('Error loading cash data:', err)
      Alert.alert('Error', 'No se pudo cargar la información de caja')
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenSession() {
    if (!register || !tenantId || !user || submitting) return
    const openingAmt = parseFloat(openAmount) || 0
    setSubmitting(true)

    try {
      const { data, error } = await supabase.rpc('open_cash_session', {
        p_tenant_id: tenantId,
        p_register_id: register.id,
        p_user_id: user.id,
        p_opening_amount: openingAmt
      })

      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      setShowOpenModal(false)
      loadCashData()
      Alert.alert('✅ Caja Abierta', `Turno iniciado con base de $${openingAmt.toFixed(2)}`)
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err.message || 'No se pudo abrir la caja')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCloseSession() {
    if (!activeSession || !user || submitting) return
    const closingAmt = parseFloat(closeAmount) || 0
    setSubmitting(true)

    try {
      const { data, error } = await supabase.rpc('close_cash_session', {
        p_session_id: activeSession.id,
        p_user_id: user.id,
        p_closing_amount: closingAmt,
        p_notes: 'Cierre desde app móvil'
      })

      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      setShowCloseModal(false)
      setCloseAmount('')
      loadCashData()
      Alert.alert('🔒 Caja Cerrada', `Turno cerrado exitosamente con $${closingAmt.toFixed(2)} reportados.`)
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err.message || 'No se pudo cerrar la caja')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Cargando estado de caja...</Text>
      </View>
    )
  }

  const isSessionOpen = !!activeSession

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Main Status Card */}
      <View style={[styles.card, isSessionOpen ? styles.cardOpen : styles.cardClosed]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.cajaTitle}>{register?.name || 'Caja Principal'}</Text>
            <Text style={styles.cajaSubtitle}>
              {isSessionOpen ? '🟢 Turno actualmente abierto' : '🔴 Caja cerrada'}
            </Text>
          </View>
          <Text style={{ fontSize: 32 }}>{isSessionOpen ? '🔓' : '🔒'}</Text>
        </View>

        {isSessionOpen ? (
          <View style={{ marginTop: 16 }}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fondo inicial (Base):</Text>
              <Text style={styles.detailValue}>${Number(activeSession.opening_amount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ventas en efectivo:</Text>
              <Text style={styles.detailValue}>${Number(activeSession.total_sales || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Apertura:</Text>
              <Text style={styles.detailValue}>
                {new Date(activeSession.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <TouchableOpacity style={[styles.btn, styles.btnClose]} onPress={() => setShowCloseModal(true)}>
              <Text style={styles.btnText}>🔒 Cerrar Turno de Caja</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
              Abre un turno con tu fondo de sencillo para comenzar a vender en el punto de venta.
            </Text>
            <TouchableOpacity style={[styles.btn, styles.btnOpen]} onPress={() => setShowOpenModal(true)}>
              <Text style={styles.btnText}>🔓 Abrir Turno de Caja</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Movements list */}
      {isSessionOpen && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Movimientos del Turno ({movements.length})</Text>
          {movements.map(m => {
            const isPos = m.movement_type === 'sale' || m.movement_type === 'income'
            return (
              <View key={m.id} style={styles.movementItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.movementDesc}>{m.description || m.movement_type}</Text>
                  <Text style={styles.movementTime}>
                    {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={[styles.movementAmount, { color: isPos ? '#16A34A' : '#E8745A' }]}>
                  {isPos ? `+$${Number(m.amount).toFixed(2)}` : `-$${Number(m.amount).toFixed(2)}`}
                </Text>
              </View>
            )
          })}
          {movements.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>No hay movimientos en este turno aún</Text>
          )}
        </View>
      )}

      {/* MODAL: OPEN SESSION */}
      <Modal visible={showOpenModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apertura de Caja</Text>
            <Text style={styles.modalSub}>Ingresa el fondo inicial de sencillo disponible:</Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={openAmount}
              onChangeText={setOpenAmount}
              placeholder="50000"
            />

            <View style={styles.quickButtons}>
              {['20000', '50000', '100000'].map(val => (
                <TouchableOpacity
                  key={val}
                  style={styles.quickBtn}
                  onPress={() => setOpenAmount(val)}
                >
                  <Text style={styles.quickBtnText}>${parseInt(val) / 1000}k</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOpenModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleOpenSession} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Abrir caja</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CLOSE SESSION */}
      <Modal visible={showCloseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cierre de Turno</Text>
            <Text style={styles.modalSub}>Realiza el conteo físico del dinero en caja:</Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={closeAmount}
              onChangeText={setCloseAmount}
              placeholder="Total contado en efectivo..."
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCloseModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#E8745A' }]} onPress={handleCloseSession} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Cerrar turno</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8ECF0' },
  loadingText: { marginTop: 10, color: '#6B7280', fontWeight: '600' },
  card: { backgroundColor: '#E8ECF0', borderRadius: 20, padding: 20, shadowColor: '#A3B1C6', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  cardOpen: { borderLeftWidth: 5, borderLeftColor: '#16A34A' },
  cardClosed: { borderLeftWidth: 5, borderLeftColor: '#DC2626' },
  cajaTitle: { fontSize: 18, fontWeight: '800', color: '#2D3142' },
  cajaSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#DDE1E7' },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '800', color: '#2D3142' },
  btn: { padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  btnOpen: { backgroundColor: '#4A90D9' },
  btnClose: { backgroundColor: '#E8745A' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#2D3142', marginBottom: 10, textTransform: 'uppercase' },
  movementItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#DDE1E7' },
  movementDesc: { fontSize: 13, fontWeight: '700', color: '#2D3142' },
  movementTime: { fontSize: 11, color: '#9CA3AF' },
  movementAmount: { fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#E8ECF0', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2D3142' },
  modalSub: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 14 },
  modalInput: { backgroundColor: '#DDE1E7', padding: 14, borderRadius: 14, fontSize: 18, fontWeight: '800', color: '#2D3142', textAlign: 'center' },
  quickButtons: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickBtn: { flex: 1, backgroundColor: '#DDE1E7', padding: 8, borderRadius: 10, alignItems: 'center' },
  quickBtnText: { fontWeight: '700', color: '#2D3142', fontSize: 12 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#DDE1E7' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
  confirmBtn: { flex: 1.5, padding: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#4A90D9' },
  confirmText: { color: '#fff', fontWeight: '800' }
})
