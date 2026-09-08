'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { usePermissions } from '@/lib/hooks/usePermissions'
import {
  Flame,
  Croissant,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  PlusCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChefHat,
  Bell,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  ArrowLeft,
  Calendar,
  Wheat,
  Utensils,
  Trash2,
  Edit2
} from 'lucide-react'

interface OvenPreset {
  id: string
  tenant_id?: string
  name: string
  temp_celsius: number
  time_minutes: number
  has_steam: boolean
  category: string
  color: string
}

interface ActiveTimer {
  id: string
  presetId?: string
  name: string
  trayName: string
  temp_celsius: number
  has_steam: boolean
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  isFinished: boolean
  startedAt: number
  color: string
}

interface BakeryBatch {
  id: string
  batch_number: string
  recipe_name: string
  baker_name?: string | null
  actual_units: number
  waste_units: number
  status: string
  notes?: string | null
  baked_at?: string | null
  created_at: string
}

interface BakeryMoje {
  id: string
  batch_number: string
  dough_type: string
  flour_quantity: number
  flour_unit: string
  water_liters?: number | null
  yeast_grams?: number | null
  expected_units?: number | null
  actual_units?: number | null
  baker_name?: string | null
  notes?: string | null
  created_at: string
}

const DEFAULT_PRESETS: OvenPreset[] = [
  { id: 'def-1', name: 'Pan Francés / Baguette', temp_celsius: 210, time_minutes: 22, has_steam: true, category: 'Salado', color: '#D97706' },
  { id: 'def-2', name: 'Pandebono / Almojábana', temp_celsius: 220, time_minutes: 12, has_steam: false, category: 'Queso', color: '#EA580C' },
  { id: 'def-3', name: 'Croissants / Hojaldres', temp_celsius: 180, time_minutes: 20, has_steam: false, category: 'Hojaldre', color: '#B45309' },
  { id: 'def-4', name: 'Pan Dulce / Roscas', temp_celsius: 175, time_minutes: 18, has_steam: false, category: 'Dulce', color: '#CA8A04' },
  { id: 'def-5', name: 'Pan de Queso Tradicional', temp_celsius: 200, time_minutes: 15, has_steam: false, category: 'Queso', color: '#D97706' },
  { id: 'def-6', name: 'Galletas / Polvorones', temp_celsius: 170, time_minutes: 14, has_steam: false, category: 'Galletería', color: '#92400E' }
]

// Web Audio sound synthesizer for oven timer chime
function playOvenAlarm() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const notes = [587.33, 880, 1174.66, 880, 1174.66] // D5, A5, D6, A5, D6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.18 + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + idx * 0.18)
      osc.stop(ctx.currentTime + idx * 0.18 + 0.36)
    })
  } catch (e) {
    console.warn('Audio alarm error:', e)
  }
}

export default function BakerMobilePage() {
  const supabase = createClient()
  const { roleName, isAdmin } = usePermissions()
  const [activeTab, setActiveTab] = useState<'oven' | 'batches' | 'mojes'>('oven')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [bakerName, setBakerName] = useState('Panadero')
  const [loading, setLoading] = useState(true)

  // Presets & Active Timers
  const [presets, setPresets] = useState<OvenPreset[]>(DEFAULT_PRESETS)
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([])
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [editingPreset, setEditingPreset] = useState<OvenPreset | null>(null)
  const [presetForm, setPresetForm] = useState({
    name: '',
    temp_celsius: '200',
    time_minutes: '20',
    has_steam: false,
    category: 'Panadería',
    color: '#D97706'
  })

  // Horneadas (Batches) State
  const [batches, setBatches] = useState<BakeryBatch[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchSubmitting, setBatchSubmitting] = useState(false)
  const [batchForm, setBatchForm] = useState({
    batch_number: 'H-001',
    recipe_name: 'Pan Francés',
    actual_units: '40',
    waste_units: '0',
    exit_time: new Date().toTimeString().slice(0, 5),
    status: 'ready',
    notes: ''
  })

  // Mojes (Dough) State
  const [mojes, setMojes] = useState<BakeryMoje[]>([])
  const [showMojeModal, setShowMojeModal] = useState(false)
  const [mojeSubmitting, setMojeSubmitting] = useState(false)
  const [mojeForm, setMojeForm] = useState({
    batch_number: 'M-001',
    dough_type: 'Masa Salada (Francés / Baguette)',
    flour_quantity: '1',
    flour_unit: 'bulto',
    water_liters: '28',
    yeast_grams: '500',
    expected_units: '360',
    notes: ''
  })

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const tid = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id
        if (tid) setTenantId(tid)
        setBakerName(user.user_metadata?.full_name || 'Maestro Panadero')

        if (tid) {
          // 1. Fetch presets
          const { data: pData } = await supabase
            .from('bakery_oven_presets')
            .select('*')
            .eq('tenant_id', tid)
            .order('created_at', { ascending: true })

          if (pData && pData.length > 0) {
            setPresets(pData)
          }

          // 2. Fetch today batches
          const { data: bData } = await supabase
            .from('bakery_batches')
            .select('*')
            .eq('tenant_id', tid)
            .order('created_at', { ascending: false })
            .limit(30)

          if (bData) setBatches(bData as any)

          // 3. Fetch mojes
          const { data: mData } = await supabase
            .from('bakery_mojes')
            .select('*')
            .eq('tenant_id', tid)
            .order('created_at', { ascending: false })
            .limit(30)

          if (mData) setMojes(mData)
        }
      } catch (err) {
        console.error('Error loading bakery data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Timer Countdown Engine (1000ms tick)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prevTimers => {
        let hasJustFinished = false
        const updated = prevTimers.map(t => {
          if (!t.isRunning || t.isFinished) return t
          if (t.remainingSeconds <= 1) {
            hasJustFinished = true
            return { ...t, remainingSeconds: 0, isRunning: false, isFinished: true }
          }
          return { ...t, remainingSeconds: t.remainingSeconds - 1 }
        })

        if (hasJustFinished) {
          playOvenAlarm()
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([400, 200, 400, 200, 600])
          }
        }
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Start new timer from preset
  const startTimerFromPreset = (preset: OvenPreset) => {
    const count = activeTimers.length + 1
    const totalSec = preset.time_minutes * 60
    const newTimer: ActiveTimer = {
      id: 'timer-' + Date.now(),
      presetId: preset.id,
      name: preset.name,
      trayName: `Bandeja ${count}`,
      temp_celsius: preset.temp_celsius,
      has_steam: preset.has_steam,
      totalSeconds: totalSec,
      remainingSeconds: totalSec,
      isRunning: true,
      isFinished: false,
      startedAt: Date.now(),
      color: preset.color
    }

    setActiveTimers(prev => [newTimer, ...prev])
    setActiveTab('oven')
  }

  // Timer controls
  const toggleTimerPause = (id: string) => {
    setActiveTimers(prev => prev.map(t => t.id === id ? { ...t, isRunning: !t.isRunning } : t))
  }

  const addExtraMinutes = (id: string, mins: number) => {
    setActiveTimers(prev => prev.map(t => {
      if (t.id !== id) return t
      const addedSec = mins * 60
      return {
        ...t,
        remainingSeconds: t.remainingSeconds + addedSec,
        totalSeconds: t.totalSeconds + addedSec,
        isFinished: false,
        isRunning: true
      }
    }))
  }

  const removeTimer = (id: string) => {
    setActiveTimers(prev => prev.filter(t => t.id !== id))
  }

  // Quick convert finished timer into registered batch
  const convertTimerToBatch = (timer: ActiveTimer) => {
    setBatchForm({
      batch_number: `H-${String(batches.length + 1).padStart(3, '0')}`,
      recipe_name: timer.name,
      actual_units: '40',
      waste_units: '0',
      exit_time: new Date().toTimeString().slice(0, 5),
      status: 'ready',
      notes: `Horneado a ${timer.temp_celsius}°C (${timer.trayName})`
    })
    setShowBatchModal(true)
    removeTimer(timer.id)
  }

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Create Batch Form Handler
  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || batchSubmitting) return
    setBatchSubmitting(true)
    try {
      const now = new Date()
      if (batchForm.exit_time) {
        const [h, m] = batchForm.exit_time.split(':')
        now.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0)
      }

      const { data, error } = await supabase
        .from('bakery_batches')
        .insert([{
          tenant_id: tenantId,
          batch_number: batchForm.batch_number || `H-${Date.now().toString().slice(-4)}`,
          recipe_name: batchForm.recipe_name,
          baker_name: bakerName,
          planned_units: Number(batchForm.actual_units) + Number(batchForm.waste_units),
          actual_units: Number(batchForm.actual_units) || 0,
          waste_units: Number(batchForm.waste_units) || 0,
          status: batchForm.status,
          notes: batchForm.notes || null,
          baked_at: now.toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      if (data) setBatches(prev => [data as any, ...prev])
      setShowBatchModal(false)
    } catch (err: any) {
      alert('Error al registrar horneada: ' + err.message)
    } finally {
      setBatchSubmitting(false)
    }
  }

  // Create Moje Form Handler
  async function handleCreateMoje(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || mojeSubmitting) return
    setMojeSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('bakery_mojes')
        .insert([{
          tenant_id: tenantId,
          batch_number: mojeForm.batch_number || `M-${Date.now().toString().slice(-4)}`,
          dough_type: mojeForm.dough_type,
          flour_quantity: Number(mojeForm.flour_quantity) || 1,
          flour_unit: mojeForm.flour_unit,
          water_liters: mojeForm.water_liters ? Number(mojeForm.water_liters) : null,
          yeast_grams: mojeForm.yeast_grams ? Number(mojeForm.yeast_grams) : null,
          expected_units: mojeForm.expected_units ? Number(mojeForm.expected_units) : null,
          baker_name: bakerName,
          notes: mojeForm.notes || null
        }])
        .select()
        .single()

      if (error) throw error
      if (data) setMojes(prev => [data, ...prev])
      setShowMojeModal(false)
    } catch (err: any) {
      alert('Error al registrar moje: ' + err.message)
    } finally {
      setMojeSubmitting(false)
    }
  }

  // Save / Edit Oven Preset
  async function handleSavePreset(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    try {
      if (editingPreset && !editingPreset.id.startsWith('def-')) {
        const { error } = await supabase
          .from('bakery_oven_presets')
          .update({
            name: presetForm.name,
            temp_celsius: Number(presetForm.temp_celsius),
            time_minutes: Number(presetForm.time_minutes),
            has_steam: presetForm.has_steam,
            category: presetForm.category,
            color: presetForm.color
          })
          .eq('id', editingPreset.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('bakery_oven_presets')
          .insert([{
            tenant_id: tenantId,
            name: presetForm.name,
            temp_celsius: Number(presetForm.temp_celsius),
            time_minutes: Number(presetForm.time_minutes),
            has_steam: presetForm.has_steam,
            category: presetForm.category,
            color: presetForm.color
          }])
          .select()
          .single()
        if (error) throw error
        if (data) setPresets(prev => [...prev, data])
      }
      setShowPresetModal(false)
      setEditingPreset(null)
    } catch (err: any) {
      alert('Error al guardar tipo de horneada: ' + err.message)
    }
  }

  const totalPiecesToday = batches.reduce((acc, b) => acc + Number(b.actual_units || 0), 0)
  const totalFlourToday = mojes.reduce((acc, m) => acc + Number(m.flour_quantity || 0), 0)
  const activeTimersCount = activeTimers.filter(t => t.isRunning).length

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      {/* ── TOP MOBILE HEADER ── */}
      <header style={{
        background: '#0F172A',
        color: '#FFFFFF',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #D97706, #EA580C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)'
          }}>
            <ChefHat size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Panel Panadero
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{bakerName}</span>
              <span style={{ fontSize: '0.62rem', background: '#D97706', color: '#FFF', padding: '1px 6px', borderRadius: 10, fontWeight: 800 }}>
                PRODUCCIÓN
              </span>
            </div>
          </div>
        </div>

        {/* Quick Exit to Dashboard if admin */}
        {isAdmin && (
          <Link
            href="/bakery/production"
            className="btn-neu"
            style={{
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: '#1E293B',
              color: '#94A3B8',
              border: '1px solid #334155',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <ArrowLeft size={13} />
            <span>Panel Admin</span>
          </Link>
        )}
      </header>

      {/* ── SUMMARY STATS BAR ── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '10px 14px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        flexShrink: 0
      }}>
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 10px', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>En Horno</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#D97706', lineHeight: 1.2 }}>
            {activeTimersCount} {activeTimersCount === 1 ? 'bandeja' : 'bandejas'}
          </div>
        </div>

        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 10px', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Panes Hoy</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', lineHeight: 1.2 }}>
            {totalPiecesToday} <span style={{ fontSize: '0.72rem' }}>uds</span>
          </div>
        </div>

        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '8px 10px', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>Harina</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#2563EB', lineHeight: 1.2 }}>
            {totalFlourToday} <span style={{ fontSize: '0.72rem' }}>bultos</span>
          </div>
        </div>
      </div>

      {/* ── SEGMENTED TOP NAVIGATION TABS ── */}
      <div style={{
        padding: '10px 14px 4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        background: '#F8FAFC'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('oven')}
          style={{
            padding: '10px 6px',
            borderRadius: 12,
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            background: activeTab === 'oven' ? '#D97706' : '#FFFFFF',
            color: activeTab === 'oven' ? '#FFFFFF' : '#64748B',
            boxShadow: activeTab === 'oven' ? '0 4px 12px rgba(217, 119, 6, 0.35)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <Flame size={16} />
          <span>🔥 Horno {activeTimersCount > 0 && `(${activeTimersCount})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          style={{
            padding: '10px 6px',
            borderRadius: 12,
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            background: activeTab === 'batches' ? '#D97706' : '#FFFFFF',
            color: activeTab === 'batches' ? '#FFFFFF' : '#64748B',
            boxShadow: activeTab === 'batches' ? '0 4px 12px rgba(217, 119, 6, 0.35)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <Croissant size={16} />
          <span>🥐 Horneadas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mojes')}
          style={{
            padding: '10px 6px',
            borderRadius: 12,
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            background: activeTab === 'mojes' ? '#D97706' : '#FFFFFF',
            color: activeTab === 'mojes' ? '#FFFFFF' : '#64748B',
            boxShadow: activeTab === 'mojes' ? '0 4px 12px rgba(217, 119, 6, 0.35)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <Wheat size={16} />
          <span>🥣 Mojes</span>
        </button>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main style={{ flex: 1, padding: '12px 14px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* ════════ TAB 1: HORNO INTELIGENTE ════════ */}
        {activeTab === 'oven' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Active Running Timers Live Studio */}
            {activeTimers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame size={16} color="#D97706" />
                    <span>Horno en Marcha ({activeTimers.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => playOvenAlarm()}
                    style={{ fontSize: '0.68rem', color: '#64748B', background: '#F1F5F9', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    🔔 Probar Alarma
                  </button>
                </div>

                {activeTimers.map(timer => {
                  const progressPct = Math.min(100, Math.max(0, ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100))
                  
                  return (
                    <div
                      key={timer.id}
                      className="neu-card animate-scale-in"
                      style={{
                        padding: '16px',
                        background: timer.isFinished ? '#FEF3C7' : '#FFFFFF',
                        border: timer.isFinished ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                        borderRadius: 16,
                        boxShadow: timer.isFinished ? '0 8px 24px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      {/* Timer Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: timer.color || '#D97706', color: '#FFF', padding: '2px 8px', borderRadius: 6 }}>
                              {timer.trayName}
                            </span>
                            <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700 }}>
                              {timer.temp_celsius}°C {timer.has_steam ? '· 💨 Vapor' : ''}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.08rem', fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>
                            {timer.name}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeTimer(timer.id)}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
                          title="Eliminar temporizador"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Giant Digital Countdown Clock */}
                      <div style={{
                        background: timer.isFinished ? '#D97706' : '#0F172A',
                        color: '#FFFFFF',
                        padding: '14px 18px',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: timer.isFinished ? '#FEF3C7' : '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>
                            {timer.isFinished ? '¡PAN HORNEADO LISTO!' : timer.isRunning ? 'TIEMPO RESTANTE' : 'EN PAUSA'}
                          </div>
                          <div style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '0.05em', fontFamily: 'monospace', lineHeight: 1 }}>
                            {formatTime(timer.remainingSeconds)}
                          </div>
                        </div>

                        {timer.isFinished ? (
                          <div style={{ textAlign: 'center', background: '#FFFFFF', color: '#B45309', padding: '6px 10px', borderRadius: 10, fontWeight: 900, fontSize: '0.76rem' }}>
                            ¡SACAR YA!
                          </div>
                        ) : (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Total</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{Math.round(timer.totalSeconds / 60)} min</div>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            background: timer.isFinished ? '#10B981' : 'linear-gradient(90deg, #D97706, #EA580C)',
                            transition: 'width 1s linear'
                          }}
                        />
                      </div>

                      {/* Action Controls Bar */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {timer.isFinished ? (
                          <button
                            type="button"
                            onClick={() => convertTimerToBatch(timer)}
                            className="btn-neu btn-primary"
                            style={{
                              flex: 1,
                              padding: '12px',
                              fontSize: '0.88rem',
                              fontWeight: 900,
                              background: '#059669',
                              color: '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              borderRadius: 12
                            }}
                          >
                            <CheckCircle2 size={18} />
                            <span>Registrar Horneada Sacada</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleTimerPause(timer.id)}
                              className="btn-neu"
                              style={{
                                flex: 1.2,
                                padding: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                background: timer.isRunning ? '#F1F5F9' : '#00D6BC',
                                color: timer.isRunning ? '#334155' : '#0F172A',
                                borderRadius: 10
                              }}
                            >
                              {timer.isRunning ? <Pause size={15} /> : <Play size={15} />}
                              <span>{timer.isRunning ? 'Pausar' : 'Reanudar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => addExtraMinutes(timer.id, 1)}
                              className="btn-neu"
                              style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 800, borderRadius: 10 }}
                            >
                              +1 min
                            </button>

                            <button
                              type="button"
                              onClick={() => addExtraMinutes(timer.id, 2)}
                              className="btn-neu"
                              style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 800, borderRadius: 10 }}
                            >
                              +2 min
                            </button>

                            <button
                              type="button"
                              onClick={() => convertTimerToBatch(timer)}
                              className="btn-neu"
                              style={{ padding: '10px', fontSize: '0.78rem', fontWeight: 800, color: '#059669', borderRadius: 10 }}
                              title="Terminar y registrar horneada"
                            >
                              Sacar ✓
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Presets Grid Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tipos de Horneada (Presets)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null)
                    setPresetForm({
                      name: '',
                      temp_celsius: '200',
                      time_minutes: '20',
                      has_steam: false,
                      category: 'Panadería',
                      color: '#D97706'
                    })
                    setShowPresetModal(true)
                  }}
                  className="btn-neu"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 8
                  }}
                >
                  <Plus size={13} />
                  <span>+ Nuevo Tipo</span>
                </button>
              </div>

              {/* Grid of Preset Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className="neu-card"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      gap: 8
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1px 6px', borderRadius: 4, color: '#64748B' }}>
                          {preset.category}
                        </span>
                        {preset.has_steam && (
                          <span style={{ fontSize: '0.6rem', color: '#0284C7', fontWeight: 800 }}>💨 Vapor</span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.25 }}>
                        {preset.name}
                      </h4>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, marginTop: 4 }}>
                        🌡️ {preset.temp_celsius}°C · ⏱️ {preset.time_minutes} min
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startTimerFromPreset(preset)}
                      className="btn-neu btn-primary"
                      style={{
                        width: '100%',
                        padding: '9px',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        justifyContent: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'linear-gradient(135deg, #D97706, #EA580C)',
                        color: '#FFF',
                        borderRadius: 10,
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
                      }}
                    >
                      <Play size={13} />
                      <span>INICIAR HORNO</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 2: REGISTRO DE HORNEADAS ════════ */}
        {activeTab === 'batches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Big Action Button */}
            <button
              type="button"
              onClick={() => {
                setBatchForm({
                  batch_number: `H-${String(batches.length + 1).padStart(3, '0')}`,
                  recipe_name: 'Pan Francés',
                  actual_units: '40',
                  waste_units: '0',
                  exit_time: new Date().toTimeString().slice(0, 5),
                  status: 'ready',
                  notes: ''
                })
                setShowBatchModal(true)
              }}
              className="btn-neu btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '0.94rem',
                fontWeight: 900,
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #D97706, #EA580C)',
                color: '#FFF',
                borderRadius: 14,
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
              }}
            >
              <PlusCircle size={20} />
              <span>REGISTRAR HORNEADA</span>
            </button>

            {/* List of Batches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Horneadas Registradas ({batches.length})
              </div>

              {batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', color: '#64748B' }}>
                  <Croissant size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
                  <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Aún no hay horneadas registradas hoy</div>
                  <p style={{ fontSize: '0.74rem', margin: '4px 0 0' }}>Toca el botón superior para registrar la primera horneada.</p>
                </div>
              ) : (
                batches.map(b => (
                  <div
                    key={b.id}
                    className="neu-card"
                    style={{
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: 4 }}>
                          {b.batch_number}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {b.baked_at ? new Date(b.baked_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginTop: 2 }}>
                        {b.recipe_name}
                      </div>
                      {b.notes && (
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 1 }}>{b.notes}</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669' }}>
                        {b.actual_units} <span style={{ fontSize: '0.7rem' }}>uds</span>
                      </div>
                      {b.waste_units > 0 && (
                        <div style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 700 }}>
                          -{b.waste_units} merma
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ════════ TAB 3: REGISTRO DE MOJES ════════ */}
        {activeTab === 'mojes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Big Action Button */}
            <button
              type="button"
              onClick={() => {
                setMojeForm({
                  batch_number: `M-${String(mojes.length + 1).padStart(3, '0')}`,
                  dough_type: 'Masa Salada (Francés / Baguette)',
                  flour_quantity: '1',
                  flour_unit: 'bulto',
                  water_liters: '28',
                  yeast_grams: '500',
                  expected_units: '360',
                  notes: ''
                })
                setShowMojeModal(true)
              }}
              className="btn-neu btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '0.94rem',
                fontWeight: 900,
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFF',
                borderRadius: 14,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
              }}
            >
              <PlusCircle size={20} />
              <span>REGISTRAR MOJE DE HARINA</span>
            </button>

            {/* List of Mojes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Mojes Realizados ({mojes.length})
              </div>

              {mojes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', color: '#64748B' }}>
                  <Wheat size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
                  <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Aún no hay mojes registrados hoy</div>
                  <p style={{ fontSize: '0.74rem', margin: '4px 0 0' }}>Registra el consumo de bultos o kilos de harina.</p>
                </div>
              ) : (
                mojes.map(m => (
                  <div
                    key={m.id}
                    className="neu-card"
                    style={{
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: 4 }}>
                          {m.batch_number}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {formatDateTime(m.created_at)}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#2563EB' }}>
                        {m.flour_quantity} {m.flour_unit}
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                      {m.dough_type}
                    </div>

                    <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#64748B' }}>
                      {m.water_liters && <span>💧 Agua: {m.water_liters}L</span>}
                      {m.yeast_grams && <span>🧪 Levadura: {m.yeast_grams}g</span>}
                      {m.expected_units && <span>🍞 Rend. Esperado: ~{m.expected_units} panes</span>}
                    </div>

                    {m.notes && (
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontStyle: 'italic' }}>{m.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: REGISTRAR HORNEADA ── */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateBatch} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Croissant size={18} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Registrar Horneada
                </h3>
              </div>
              <button type="button" onClick={() => setShowBatchModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Lote N°
              </label>
              <input
                className="input-neu"
                value={batchForm.batch_number}
                onChange={e => setBatchForm(prev => ({ ...prev, batch_number: e.target.value }))}
                required
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Tipo de Pan / Receta *
              </label>
              <input
                className="input-neu"
                placeholder="ej. Pan Francés, Pandebono, Croissant"
                value={batchForm.recipe_name}
                onChange={e => setBatchForm(prev => ({ ...prev, recipe_name: e.target.value }))}
                required
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Unidades Sacadas *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  min="1"
                  value={batchForm.actual_units}
                  onChange={e => setBatchForm(prev => ({ ...prev, actual_units: e.target.value }))}
                  required
                  style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Mermas / Quemados
                </label>
                <input
                  className="input-neu"
                  type="number"
                  min="0"
                  value={batchForm.waste_units}
                  onChange={e => setBatchForm(prev => ({ ...prev, waste_units: e.target.value }))}
                  style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', color: '#DC2626' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Hora de Salida del Horno
              </label>
              <input
                className="input-neu"
                type="time"
                value={batchForm.exit_time}
                onChange={e => setBatchForm(prev => ({ ...prev, exit_time: e.target.value }))}
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Notas / Observaciones
              </label>
              <input
                className="input-neu"
                placeholder="ej. Tanda con vapor, dorado medio"
                value={batchForm.notes}
                onChange={e => setBatchForm(prev => ({ ...prev, notes: e.target.value }))}
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" className="btn-neu btn-ghost" onClick={() => setShowBatchModal(false)} style={{ flex: 1, padding: 10 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-neu btn-primary" disabled={batchSubmitting} style={{ flex: 1.5, padding: 10, fontWeight: 900, background: '#D97706', color: '#FFF' }}>
                {batchSubmitting ? 'Guardando...' : 'Guardar Horneada'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: REGISTRAR MOJE ── */}
      {showMojeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateMoje} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DBEAFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wheat size={18} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Registrar Moje de Harina
                </h3>
              </div>
              <button type="button" onClick={() => setShowMojeModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Tipo de Masa *
              </label>
              <select
                className="input-neu"
                value={mojeForm.dough_type}
                onChange={e => setMojeForm(prev => ({ ...prev, dough_type: e.target.value }))}
                style={{ fontSize: '0.84rem' }}
              >
                <option value="Masa Salada (Francés / Baguette)">Masa Salada (Francés / Baguette)</option>
                <option value="Masa Dulce (Roscas / Piñitas / Mojicones)">Masa Dulce (Roscas / Piñitas / Mojicones)</option>
                <option value="Masa de Queso (Pandebono / Buñuelos)">Masa de Queso (Pandebono / Buñuelos)</option>
                <option value="Masa Hojaldrada (Croissant / Pasteles)">Masa Hojaldrada (Croissant / Pasteles)</option>
                <option value="Masa Integral / Granos">Masa Integral / Granos</option>
                <option value="Masa Especial">Masa Especial</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Cantidad Harina *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={mojeForm.flour_quantity}
                  onChange={e => setMojeForm(prev => ({ ...prev, flour_quantity: e.target.value }))}
                  required
                  style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Unidad
                </label>
                <select
                  className="input-neu"
                  value={mojeForm.flour_unit}
                  onChange={e => setMojeForm(prev => ({ ...prev, flour_unit: e.target.value }))}
                  style={{ fontSize: '0.84rem' }}
                >
                  <option value="bulto">Bulto (50kg)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="arroba">Arroba (12.5kg)</option>
                  <option value="libra">Libras (lb)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Agua (Litros)
                </label>
                <input
                  className="input-neu"
                  type="number"
                  step="0.5"
                  value={mojeForm.water_liters}
                  onChange={e => setMojeForm(prev => ({ ...prev, water_liters: e.target.value }))}
                  style={{ fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Levadura (Gramos)
                </label>
                <input
                  className="input-neu"
                  type="number"
                  value={mojeForm.yeast_grams}
                  onChange={e => setMojeForm(prev => ({ ...prev, yeast_grams: e.target.value }))}
                  style={{ fontSize: '0.84rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Rendimiento Estimado (Piezas)
              </label>
              <input
                className="input-neu"
                type="number"
                placeholder="ej. 360 panes"
                value={mojeForm.expected_units}
                onChange={e => setMojeForm(prev => ({ ...prev, expected_units: e.target.value }))}
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" className="btn-neu btn-ghost" onClick={() => setShowMojeModal(false)} style={{ flex: 1, padding: 10 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-neu btn-primary" disabled={mojeSubmitting} style={{ flex: 1.5, padding: 10, fontWeight: 900, background: '#2563EB', color: '#FFF' }}>
                {mojeSubmitting ? 'Guardando...' : 'Guardar Moje'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: PERSONALIZAR TIPO DE HORNEADA ── */}
      {showPresetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleSavePreset} className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={18} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  {editingPreset ? 'Editar Tipo de Horneada' : 'Nuevo Tipo de Horneada'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowPresetModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Nombre del Pan / Producto *
              </label>
              <input
                className="input-neu"
                placeholder="ej. Pan Aliñado, Mogolla Chicharrona"
                value={presetForm.name}
                onChange={e => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
                required
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Temperatura (°C) *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  value={presetForm.temp_celsius}
                  onChange={e => setPresetForm(prev => ({ ...prev, temp_celsius: e.target.value }))}
                  required
                  style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Tiempo (Minutos) *
                </label>
                <input
                  className="input-neu"
                  type="number"
                  min="1"
                  max="180"
                  value={presetForm.time_minutes}
                  onChange={e => setPresetForm(prev => ({ ...prev, time_minutes: e.target.value }))}
                  required
                  style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <input
                type="checkbox"
                id="steam-check"
                checked={presetForm.has_steam}
                onChange={e => setPresetForm(prev => ({ ...prev, has_steam: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: '#D97706', cursor: 'pointer' }}
              />
              <label htmlFor="steam-check" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                Requiere inyección de vapor (ej. Baguette / Francés)
              </label>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Categoría
              </label>
              <select
                className="input-neu"
                value={presetForm.category}
                onChange={e => setPresetForm(prev => ({ ...prev, category: e.target.value }))}
                style={{ fontSize: '0.84rem' }}
              >
                <option value="Panadería">Panadería</option>
                <option value="Hojaldre">Hojaldre</option>
                <option value="Queso">Queso</option>
                <option value="Dulce">Dulce</option>
                <option value="Galletería">Galletería</option>
                <option value="Pastelería">Pastelería</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" className="btn-neu btn-ghost" onClick={() => setShowPresetModal(false)} style={{ flex: 1, padding: 10 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-neu btn-primary" style={{ flex: 1.5, padding: 10, fontWeight: 900, background: '#D97706', color: '#FFF' }}>
                Guardar Tipo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
