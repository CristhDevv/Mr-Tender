'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Percent
} from 'lucide-react'

interface ColdUnit {
  id: string
  name: string
  type: 'cuarto_frio' | 'vitrina_exhibidora' | 'cava_maduracion' | 'congelador'
  currentTempCelsius: number
  targetMinTemp: number
  targetMaxTemp: number
  humidityPercent?: number
  lastCheckTime: string
  status: 'optimal' | 'warning' | 'critical'
}

interface AgingPiece {
  id: string
  primalCut: string
  animalSpecies: string
  initialWeightKg: number
  currentWeightKg: number
  agingStartDate: string
  targetAgingDays: number
  currentAgingDays: number
  status: 'maturing' | 'ready_to_cut' | 'overaged'
  lotNumber: string
}

const DEFAULT_UNITS: ColdUnit[] = [
  { id: '1', name: 'Cuarto Frío Principal (piezas de carne de Res/Cerdo)', type: 'cuarto_frio', currentTempCelsius: 1.8, targetMinTemp: 0.0, targetMaxTemp: 4.0, humidityPercent: 82, lastCheckTime: 'Hoy 08:30 AM', status: 'optimal' },
  { id: '2', name: 'Vitrina Mostrador 1 (Cortes Finos & Bistec)', type: 'vitrina_exhibidora', currentTempCelsius: 3.2, targetMinTemp: 1.0, targetMaxTemp: 4.5, humidityPercent: 78, lastCheckTime: 'Hoy 08:35 AM', status: 'optimal' },
  { id: '3', name: 'Vitrina Mostrador 2 (Pollo & Menudencias)', type: 'vitrina_exhibidora', currentTempCelsius: 2.1, targetMinTemp: 0.0, targetMaxTemp: 3.5, humidityPercent: 80, lastCheckTime: 'Hoy 08:35 AM', status: 'optimal' },
  { id: '4', name: 'Cava de refrigeración en Seco (Dry-Aging)', type: 'cava_maduracion', currentTempCelsius: 1.2, targetMinTemp: 0.5, targetMaxTemp: 2.0, humidityPercent: 75, lastCheckTime: 'Hoy 08:40 AM', status: 'optimal' },
  { id: '5', name: 'Congelador de Huesos & Pulpa (-18°C)', type: 'congelador', currentTempCelsius: -19.4, targetMinTemp: -22.0, targetMaxTemp: -16.0, humidityPercent: 60, lastCheckTime: 'Hoy 08:42 AM', status: 'optimal' }
]

const DEFAULT_AGING_PIECES: AgingPiece[] = [
  { id: '1', primalCut: 'Tren de Ribeye / Bife Ancho con Hueso', animalSpecies: 'Res Cebú Macho', initialWeightKg: 18.5, currentWeightKg: 16.1, agingStartDate: '2026-08-10', targetAgingDays: 28, currentAgingDays: 22, status: 'maturing', lotNumber: 'LOTE-GUADALUPE-892' },
  { id: '2', primalCut: 'Lomo Fino Entero Selección Especial', animalSpecies: 'Res Angus Cruzado', initialWeightKg: 6.2, currentWeightKg: 5.6, agingStartDate: '2026-08-05', targetAgingDays: 21, currentAgingDays: 27, status: 'ready_to_cut', lotNumber: 'LOTE-COLGANTE-104' },
  { id: '3', primalCut: 'Punta de Anca con Grasa Dorsal Gruesa', animalSpecies: 'Res Brangus', initialWeightKg: 7.8, currentWeightKg: 7.1, agingStartDate: '2026-08-18', targetAgingDays: 21, currentAgingDays: 14, status: 'maturing', lotNumber: 'LOTE-GUADALUPE-915' }
]

export default function ButcheryColdChainPage() {
  const supabase = createClient()
  const [units, setUnits] = useState<ColdUnit[]>(DEFAULT_UNITS)
  const [agingPieces, setAgingPieces] = useState<AgingPiece[]>(DEFAULT_AGING_PIECES)
  const [newTempLog, setNewTempLog] = useState({ unitId: '1', temp: '2.0', humidity: '80', notes: '' })
  const [showLogSuccess, setShowLogSuccess] = useState(false)

  const handleSaveTemp = (e: React.FormEvent) => {
    e.preventDefault()
    const tempNum = parseFloat(newTempLog.temp) || 0
    setUnits(prev => prev.map(u => {
      if (u.id === newTempLog.unitId) {
        const isOptimal = tempNum >= u.targetMinTemp && tempNum <= u.targetMaxTemp
        return {
          ...u,
          currentTempCelsius: tempNum,
          lastCheckTime: 'Justo ahora',
          status: isOptimal ? 'optimal' : 'warning'
        }
      }
      return u
    }))
    setShowLogSuccess(true)
    setTimeout(() => setShowLogSuccess(false), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Cadena de Frío, Termohigrometría & Cava de refrigeración
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Monitoreo sanitario de cuartos fríos (0°C a 4°C INVIMA) y trazabilidad de refrigeración en seco
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 8 }}>
          <ShieldCheck size={18} />
          <span style={{ fontSize: '0.76rem', fontWeight: 800 }}>Cumplimiento INVIMA: 100% Óptimo</span>
        </div>
      </div>

      {showLogSuccess && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>¡Lectura de temperatura registrada exitosamente en la bitácora sanitaria!</span>
        </div>
      )}

      {/* Grid of Cold Units */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {units.map(unit => {
          const isOptimal = unit.status === 'optimal'
          return (
            <div
              key={unit.id}
              className="neu-card"
              style={{
                padding: '16px 18px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  {unit.type.replace('_', ' ')}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isOptimal ? '#DCFCE7' : '#FEF2F2',
                    color: isOptimal ? '#15803D' : '#DC2626'
                  }}
                >
                  {isOptimal ? 'ÓPTIMO' : 'ALERTA'}
                </span>
              </div>

              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', minHeight: 38 }}>
                {unit.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: isOptimal ? '#00B19D' : '#DC2626' }}>
                  {unit.currentTempCelsius > 0 ? `+${unit.currentTempCelsius}` : unit.currentTempCelsius}°C
                </span>
                {unit.humidityPercent && (
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                    ({unit.humidityPercent}% HR)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 6, fontSize: '0.72rem', color: '#64748B' }}>
                <span>Rango: {unit.targetMinTemp}°C a {unit.targetMaxTemp}°C</span>
                <span>{unit.lastCheckTime}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Two Column Layout: Quick Log Form & Dry-Aging Tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: 16 }}>
        {/* Quick Log Form */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
            Registrar Toma de Temperatura Sanitaria
          </h3>
          <form onSubmit={handleSaveTemp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Equipo o Vitrina
              </label>
              <select
                value={newTempLog.unitId}
                onChange={e => setNewTempLog({ ...newTempLog, unitId: e.target.value })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '0.8rem' }}
              >
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newTempLog.temp}
                  onChange={e => setNewTempLog({ ...newTempLog, temp: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.9rem', fontWeight: 800 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Humedad (% HR)
                </label>
                <input
                  type="number"
                  value={newTempLog.humidity}
                  onChange={e => setNewTempLog({ ...newTempLog, humidity: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.9rem', fontWeight: 800 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Observaciones Sanitarias
              </label>
              <input
                type="text"
                placeholder="Sin escarcha, termómetro calibrado..."
                value={newTempLog.notes}
                onChange={e => setNewTempLog({ ...newTempLog, notes: e.target.value })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '0.8rem' }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '10px',
                fontSize: '0.84rem',
                fontWeight: 800,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Thermometer size={16} />
              <span>Guardar en Bitácora</span>
            </button>
          </form>
        </div>

        {/* Dry Aging Chamber Pieces Tracker */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Cava de refrigeración en Seco (Dry-Aging)
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0 0' }}>
                Control de días de reposo enzimático, ternura y merma de evaporación
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agingPieces.map(piece => {
              const lossKg = piece.initialWeightKg - piece.currentWeightKg
              const lossPct = Math.round((lossKg / piece.initialWeightKg) * 100)
              const isReady = piece.status === 'ready_to_cut'
              return (
                <div
                  key={piece.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: isReady ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    background: isReady ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                        {piece.primalCut}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isReady ? '#DCFCE7' : '#E6F7F5',
                          color: isReady ? '#15803D' : '#008F7E'
                        }}
                      >
                        {isReady ? 'LISTO PARA PORCIONAR' : `DÍA ${piece.currentAgingDays} DE ${piece.targetAgingDays}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                      {piece.animalSpecies} • Lote: <strong>{piece.lotNumber}</strong> • Ingreso: {piece.agingStartDate}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Peso Actual</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0F172A' }}>{piece.currentWeightKg} kg</div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Merma Agua</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#DC2626' }}>-{lossPct}%</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
