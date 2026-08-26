'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Thermometer,
  Pill,
  Clock,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Droplets,
  Calendar,
  X
} from 'lucide-react'

interface ThermoLog {
  id: string
  tenant_id: string
  log_date: string
  time_slot: 'morning' | 'afternoon'
  ambient_temperature: number
  relative_humidity: number
  fridge_temperature?: number | null
  recorded_by: string
  observations?: string | null
  created_at: string
}

export default function PharmacyTemperaturePage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<ThermoLog[]>([])
  const [showLogModal, setShowLogModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [thermoForm, setThermoForm] = useState({
    log_date: new Date().toISOString().split('T')[0],
    time_slot: 'morning' as 'morning' | 'afternoon',
    ambient_temperature: '21.5',
    relative_humidity: '55',
    fridge_temperature: '4.5',
    recorded_by: 'Regente de Farmacia',
    observations: 'Parámetros dentro del rango óptimo sanitario.'
  })

  useEffect(() => {
    loadThermoLogs()
  }, [])

  async function loadThermoLogs() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('pharmacy_thermo_logs')
        .select('*')
        .eq('tenant_id', tid)
        .order('log_date', { ascending: false })
        .order('time_slot', { ascending: true })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error loading thermo logs:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLog(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('pharmacy_thermo_logs').insert({
        tenant_id: tenantId,
        log_date: thermoForm.log_date,
        time_slot: thermoForm.time_slot,
        ambient_temperature: Number(thermoForm.ambient_temperature),
        relative_humidity: Number(thermoForm.relative_humidity),
        fridge_temperature: thermoForm.fridge_temperature ? Number(thermoForm.fridge_temperature) : null,
        recorded_by: thermoForm.recorded_by,
        observations: thermoForm.observations || null
      })

      if (error) throw error
      setShowLogModal(false)
      await loadThermoLogs()
    } catch (err: any) {
      alert(err.message || 'Error al registrar medición')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoThermo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const demo = [
        {
          tenant_id: tenantId,
          log_date: todayStr,
          time_slot: 'morning',
          ambient_temperature: 21.2,
          relative_humidity: 56,
          fridge_temperature: 4.2,
          recorded_by: 'Regente Farmacéutico',
          observations: 'Medición matutina conforme a normativa.'
        },
        {
          tenant_id: tenantId,
          log_date: yesterday,
          time_slot: 'afternoon',
          ambient_temperature: 23.5,
          relative_humidity: 58,
          fridge_temperature: 4.8,
          recorded_by: 'Regente Farmacéutico',
          observations: 'Medición vespertina conforme a normativa.'
        }
      ]
      await supabase.from('pharmacy_thermo_logs').insert(demo)
      await loadThermoLogs()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const latest = logs[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumbs Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Calidad & Normativa</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Termohigrometría & Salud</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Thermometer size={24} style={{ color: 'var(--accent-green)' }} />
            Control de Temperatura & Humedad Ambiental
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Registro diario obligatorio de condiciones ambientales (15°C - 25°C, HR &lt; 67%) para visitas de Secretaría de Salud e INVIMA.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/pharmacy/medicines"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Pill size={15} />
            <span>Medicamentos</span>
          </Link>
          <button
            onClick={() => setShowLogModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Registrar Medición</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Thermometer size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Temperatura Ambiente</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {latest ? `${latest.ambient_temperature}°C` : '21.5°C'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-green)', fontWeight: 700 }}>Rango: 15°C - 25°C (Óptimo)</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Droplets size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Humedad Relativa</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
              {latest ? `${latest.relative_humidity}%` : '55%'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-green)', fontWeight: 700 }}>Máximo permitido: &lt; 67%</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cadena de Frío (Nevera)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green)' }}>
              {latest?.fridge_temperature ? `${latest.fridge_temperature}°C` : '4.5°C'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-green)', fontWeight: 700 }}>Rango: 2°C - 8°C (Biológicos)</div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {logs.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Thermometer size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay registros de termohigrometría</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Lleva la bitácora sanitaria al día para cumplir con la normatividad de droguerías.
          </p>
          <button onClick={handleSeedDemoThermo} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem', marginTop: 6 }}>
            Cargar Mediciones Demo
          </button>
        </div>
      ) : (
        <div className="neu-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Fecha & Jornada</th>
                  <th style={{ padding: '12px 14px' }}>Temp. Ambiente (°C)</th>
                  <th style={{ padding: '12px 14px' }}>Humedad Relativa (%)</th>
                  <th style={{ padding: '12px 14px' }}>Nevera (°C)</th>
                  <th style={{ padding: '12px 14px' }}>Responsable</th>
                  <th style={{ padding: '12px 16px' }}>Estado Sanitario</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const tempOk = log.ambient_temperature >= 15 && log.ambient_temperature <= 25
                  const humOk = log.relative_humidity <= 67
                  const isCompliant = tempOk && humOk

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formatDate(log.log_date)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Jornada: {log.time_slot === 'morning' ? '☀️ Mañana (08:00)' : '🌙 Tarde (16:00)'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        <span style={{ color: tempOk ? 'var(--text-primary)' : 'var(--accent-coral)' }}>
                          {log.ambient_temperature}°C
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        <span style={{ color: humOk ? 'var(--text-primary)' : 'var(--accent-coral)' }}>
                          {log.relative_humidity}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {log.fridge_temperature ? `${log.fridge_temperature}°C` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {log.recorded_by}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: isCompliant ? 'var(--accent-green-lt)' : 'var(--accent-coral-lt)',
                          color: isCompliant ? 'var(--accent-green)' : 'var(--accent-coral)'
                        }}>
                          {isCompliant ? '✓ ÓPTIMO' : '⚠️ FUERA DE RANGO'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Medición */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 440, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Medición Sanitaria</h3>
              <button onClick={() => setShowLogModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateLog} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha</label>
                  <input
                    type="date"
                    required
                    value={thermoForm.log_date}
                    onChange={e => setThermoForm({ ...thermoForm, log_date: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jornada</label>
                  <select
                    value={thermoForm.time_slot}
                    onChange={e => setThermoForm({ ...thermoForm, time_slot: e.target.value as any })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="morning">☀️ Mañana</option>
                    <option value="afternoon">🌙 Tarde</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Temp. (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={thermoForm.ambient_temperature}
                    onChange={e => setThermoForm({ ...thermoForm, ambient_temperature: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Humedad (%)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={thermoForm.relative_humidity}
                    onChange={e => setThermoForm({ ...thermoForm, relative_humidity: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nevera (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thermoForm.fridge_temperature}
                    onChange={e => setThermoForm({ ...thermoForm, fridge_temperature: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Responsable / Regente</label>
                <input
                  type="text"
                  required
                  value={thermoForm.recorded_by}
                  onChange={e => setThermoForm({ ...thermoForm, recorded_by: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowLogModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Guardar Medición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
