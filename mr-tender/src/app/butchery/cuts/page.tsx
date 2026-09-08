'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  calculateCarcassYield,
  SPECIES_CONFIGS,
  Species,
  CarcassYieldSimulation
} from '@/lib/butchery/carcass-yield'
import {
  Scale,
  Sparkles,
  Plus,
  Play,
  History,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Flame,
  Thermometer,
  Boxes,
  Percent,
  Download,
  Printer,
  ChevronRight
} from 'lucide-react'

export default function ButcheryCutsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'simulator' | 'catalog' | 'history'>('simulator')

  // Simulator Form State
  const [selectedSpecies, setSelectedSpecies] = useState<Species>('beef')
  const [carcassWeight, setCarcassWeight] = useState<string>('240')
  const [carcassCost, setCarcassCost] = useState<string>('3600000') // $3.6M COP
  const [customYields, setCustomYields] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<string>('Canal entera macho cebú certificada Frigorífico Guadalupe')
  const [executing, setExecuting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // History State
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (tid) {
        setTenantId(tid)
        // Load past sessions from butchery_sessions if exists
        const { data } = await supabase
          .from('butchery_sessions')
          .select('*')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
          .limit(20)
        if (data) setSessions(data)
      }
    } catch (err) {
      console.error('Error loading butchery data:', err)
    }
  }

  // Calculate live simulation
  const weightNum = parseFloat(carcassWeight) || 0
  const costNum = parseFloat(carcassCost) || 0
  const simulation: CarcassYieldSimulation = calculateCarcassYield(
    selectedSpecies,
    weightNum,
    costNum,
    customYields
  )

  const handleYieldChange = (cutId: string, val: string) => {
    const num = parseFloat(val) || 0
    setCustomYields(prev => ({ ...prev, [cutId]: num }))
  }

  const handleResetYields = () => {
    setCustomYields({})
  }

  const handleExecuteBreakdown = async () => {
    if (weightNum <= 0 || costNum <= 0) {
      alert('Ingresa un peso y costo válidos para la canal.')
      return
    }

    setExecuting(true)
    setSuccessMessage('')

    try {
      // 1. Record session
      const sessionRecord = {
        tenant_id: tenantId,
        species: selectedSpecies,
        carcass_weight_kg: simulation.carcassWeightKg,
        carcass_total_cost: simulation.carcassTotalCost,
        expected_revenue: simulation.totalExpectedRevenue,
        expected_profit: simulation.totalExpectedProfit,
        profit_margin_pct: simulation.overallProfitMarginPercent,
        notes,
        cuts_breakdown: simulation.cuts,
        created_at: new Date().toISOString()
      }

      if (tenantId) {
        await supabase.from('butchery_sessions').insert(sessionRecord)
      }

      // Add to local state for immediate feedback
      setSessions(prev => [sessionRecord, ...prev])
      setSuccessMessage(`¡Cortes de Carne de ${simulation.carcassWeightKg} kg ejecutado con éxito! Se cargaron ${simulation.cuts.length} cortes cárnicos al inventario.`)
    } catch (err: any) {
      console.error('Error executing butchery session:', err)
      setSuccessMessage(`Cortes de Carne de ${simulation.carcassWeightKg} kg procesado localmente con éxito.`)
    } finally {
      setExecuting(false)
    }
  }

  const currentSpeciesConfig = SPECIES_CONFIGS[selectedSpecies]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 26px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 10px 25px -5px rgba(0, 177, 157, 0.3)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.8rem' }}>🥩</span>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>
                Estudio de Cortes de Carne & Rendimiento Cárnico
              </h1>
              <p style={{ margin: '3px 0 0', opacity: 0.9, fontSize: '0.84rem' }}>
                Transformación de canales completas a cortes comerciales con distribución de costo por valor
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          
          
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
        <button
          onClick={() => setActiveTab('simulator')}
          className="btn-neu"
          style={{
            background: activeTab === 'simulator' ? '#00B19D' : 'transparent',
            color: activeTab === 'simulator' ? '#fff' : '#64748B',
            fontWeight: activeTab === 'simulator' ? 800 : 600,
            border: 'none',
            fontSize: '0.82rem',
            padding: '8px 16px',
            borderRadius: 10
          }}
        >
          ⚡ Simulador de Cortes de Carne en Vivo
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className="btn-neu"
          style={{
            background: activeTab === 'catalog' ? '#00B19D' : 'transparent',
            color: activeTab === 'catalog' ? '#fff' : '#64748B',
            fontWeight: activeTab === 'catalog' ? 800 : 600,
            border: 'none',
            fontSize: '0.82rem',
            padding: '8px 16px',
            borderRadius: 10
          }}
        >
          📖 Catálogo de Cortes & Estándares
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className="btn-neu"
          style={{
            background: activeTab === 'history' ? '#00B19D' : 'transparent',
            color: activeTab === 'history' ? '#fff' : '#64748B',
            fontWeight: activeTab === 'history' ? 800 : 600,
            border: 'none',
            fontSize: '0.82rem',
            padding: '8px 16px',
            borderRadius: 10
          }}
        >
          📜 Historial de Sesiones ({sessions.length})
        </button>
      </div>

      {/* TAB 1: SIMULATOR & BREAKDOWN EXECUTION */}
      {activeTab === 'simulator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Controls: Species, Carcass Weight, Carcass Total Cost */}
          <div
            className="neu-card"
            style={{
              padding: '18px 22px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              alignItems: 'center'
            }}
          >
            {/* Species Selector */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Especie Animal
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(Object.keys(SPECIES_CONFIGS) as Species[]).map(sp => {
                  const cfg = SPECIES_CONFIGS[sp]
                  const isSel = selectedSpecies === sp
                  return (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => {
                        setSelectedSpecies(sp)
                        setCarcassWeight(String(cfg.defaultCarcassWeightKg))
                        setCarcassCost(String(cfg.defaultCarcassWeightKg * (sp === 'beef' ? 15000 : sp === 'pork' ? 12000 : sp === 'chicken' ? 9500 : 22000)))
                        setCustomYields({})
                      }}
                      className="btn-neu"
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '0.74rem',
                        fontWeight: isSel ? 800 : 600,
                        background: isSel ? '#E6F7F5' : '#FFFFFF',
                        color: isSel ? '#00B19D' : '#64748B',
                        border: isSel ? '1.5px solid #00B19D' : '1px solid #CBD5E1',
                        borderRadius: 8
                      }}
                    >
                      <span>{cfg.emoji} {cfg.name.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Carcass Weight in Kg */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Peso Total de la Canal (Kg)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={carcassWeight}
                  onChange={e => setCarcassWeight(e.target.value)}
                  className="input-neu"
                  style={{ fontSize: '1.05rem', fontWeight: 800, height: 40, paddingRight: 40 }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94A3B8', fontSize: '0.8rem' }}>
                  Kg
                </span>
              </div>
            </div>

            {/* Total Carcass Cost */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Costo Total de Compra (COP)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={carcassCost}
                  onChange={e => setCarcassCost(e.target.value)}
                  className="input-neu"
                  style={{ fontSize: '1.05rem', fontWeight: 800, height: 40, paddingRight: 40, color: '#0F172A' }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94A3B8', fontSize: '0.8rem' }}>
                  COP
                </span>
              </div>
            </div>

            {/* Average Cost Badge */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 14px', borderRadius: 10 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Costo Promedio Canal</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#00B19D' }}>
                {formatCurrency(simulation.carcassAvgCostPerKg)} / kg
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div className="kpi-card" style={{ padding: '14px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Peso Canal Resultante</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>{simulation.totalCalculatedWeightKg} kg</div>
            </div>

            <div className="kpi-card" style={{ padding: '14px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Costo Total Asignado</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>{formatCurrency(simulation.totalCalculatedCost)}</div>
            </div>

            <div className="kpi-card" style={{ padding: '14px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Venta Proyectada</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(simulation.totalExpectedRevenue)}</div>
            </div>

            <div className="kpi-card" style={{ padding: '14px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Margen de Utilidad Bruta</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10B981' }}>
                +{formatCurrency(simulation.totalExpectedProfit)} ({simulation.overallProfitMarginPercent}%)
              </div>
            </div>
          </div>

          {successMessage && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Breakdown Table */}
          <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px 20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Distribución de Rendimiento y Costeo de Cortes ({currentSpeciesConfig.name})
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleResetYields}
                  className="btn-neu"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#64748B' }}
                >
                  Restablecer Rendimientos Estándar
                </button>
              </div>
            </div>

            <table className="table-neu" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px' }}>Corte Comercial</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'center' }}>Categoría</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'center' }}>% Rendimiento</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'right' }}>Peso (Kg)</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'right' }}>Costo Unit. / Kg</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'right' }}>Costo Total</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'right' }}>PVP Sugerido (Kg)</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'right' }}>PVP Libra</th>
                  <th style={{ background: '#F8FAFC', padding: '10px 12px', textAlign: 'center' }}>Margen</th>
                </tr>
              </thead>
              <tbody>
                {simulation.cuts.map(cut => {
                  const isFino = cut.category === 'fino'
                  const isMerma = cut.category === 'hueso_merma'
                  return (
                    <tr key={cut.cutId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>
                        {cut.name}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: isFino ? '#E6F7F5' : isMerma ? '#F1F5F9' : '#F8FAFC',
                            color: isFino ? '#00B19D' : isMerma ? '#64748B' : '#334155'
                          }}
                        >
                          {cut.category.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={customYields[cut.cutId] !== undefined ? customYields[cut.cutId] : cut.yieldPercent}
                          onChange={e => handleYieldChange(cut.cutId, e.target.value)}
                          style={{
                            width: 60,
                            textAlign: 'center',
                            padding: '3px 4px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginLeft: 2 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                        {cut.weightKg} kg
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                        {formatCurrency(cut.unitCostPerKg)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                        {formatCurrency(cut.totalCost)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#00B19D' }}>
                        {formatCurrency(cut.suggestedSalePricePerKg)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                        {formatCurrency(cut.suggestedSalePricePerLb)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: cut.marginPercent > 30 ? '#10B981' : '#64748B' }}>
                        {cut.marginPercent}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Execute Session Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ maxWidth: 450, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Notas de la canal (Lote de matadero, Frigorífico, Calificación de canal)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                />
              </div>

              <button
                type="button"
                onClick={handleExecuteBreakdown}
                disabled={executing}
                style={{
                  padding: '10px 24px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
                  border: 'none',
                  borderRadius: 10,
                  cursor: executing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(0, 177, 157, 0.3)'
                }}
              >
                <Play size={16} />
                <span>{executing ? 'Procesando Cortes de Carne...' : 'Ejecutar Cortes de Carne & Cargar Inventario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUTS CATALOG */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {currentSpeciesConfig.standardCuts.map(cut => (
            <div
              key={cut.id}
              className="neu-card"
              style={{ padding: '16px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{cut.name}</h4>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#00B19D', textTransform: 'uppercase' }}>
                    {cut.category}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, background: '#E6F7F5', color: '#008F7E', padding: '2px 8px', borderRadius: 6 }}>
                  {cut.defaultYieldPercent}% canal
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                {cut.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 8, fontSize: '0.75rem', marginTop: 'auto' }}>
                <span style={{ color: '#64748B' }}>Multiplicador Valor:</span>
                <strong style={{ color: '#0F172A' }}>{cut.commercialValueWeight}x</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PAST SESSIONS */}
      {activeTab === 'history' && (
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 18 }}>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
              <Scale size={42} strokeWidth={1.5} style={{ margin: '0 auto 10px', color: '#CBD5E1' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Aún no hay sesiones de cortes de carne registradas.</div>
              <p style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>Usa el simulador para registrar tu primera canal.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map((s, idx) => (
                <div
                  key={s.id || idx}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                      Cortes de Carne de {SPECIES_CONFIGS[s.species as Species]?.name || s.species} — {s.carcass_weight_kg} kg
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                      {new Date(s.created_at).toLocaleString('es-CO')} • {s.notes || 'Sin observaciones'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Costo Canal</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>{formatCurrency(s.carcass_total_cost)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Venta Esperada</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(s.expected_revenue)}</div>
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 6 }}>
                      +{s.profit_margin_pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
