import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useAuthStore } from '../store/auth'

export default function LoginScreen() {
  const { login, loading, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos')
      return
    }
    const success = await login(email, password)
    if (!success) {
      Alert.alert('Error', 'Credenciales incorrectas')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.title}>Mr Tender</Text>
        <Text style={styles.subtitle}>Plataforma ERP Cloud-Native</Text>

        <TextInput style={styles.input} placeholder="Correo electrónico" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="#9CA3AF" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Iniciar Sesión</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8ECF0', justifyContent: 'center', padding: 24 },
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
  logoWrap: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: '#4A90D9', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4A90D9', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    marginBottom: 16
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '800', color: '#2D3142' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, marginBottom: 32 },
  input: {
    width: '100%',
    backgroundColor: '#DDE1E7',
    padding: 14,
    borderRadius: 14,
    color: '#2D3142',
    fontWeight: '500',
    marginBottom: 16,
    shadowColor: '#A3B1C6', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 1
  },
  btn: {
    width: '100%',
    backgroundColor: '#4A90D9',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#A3B1C6', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 3
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
})
