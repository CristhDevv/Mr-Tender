'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useVerticalTerms } from '@/lib/hooks/useVerticalTerms'
import { VERTICAL_ONBOARDINGS } from '@/lib/constants/vertical-onboarding'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  PackagePlus,
  RefreshCw,
  X
} from 'lucide-react'

export default function OnboardingChecklist() {
  const supabase = createClient()
  const { activeVertical, verticalConfig } = useVerticalTerms()
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [loadingSeed, setLoadingSeed] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const fullProgressRef = useRef<Record<string, any>>({})

  const currentVerticalKey = activeVertical || 'general'
  const onboardingConfig = (activeVertical && VERTICAL_ONBOARDINGS[activeVertical])
    ? VERTICAL_ONBOARDINGS[activeVertical]
    : VERTICAL_ONBOARDINGS.general

  useEffect(() => {
    async function loadProgressFromDB() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let tid = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
        if (!tid) {
          const { data: ptData } = await supabase
            .from('platform_tenants')
            .select('id')
            .eq('owner_email', user.email)
            .limit(1)
          tid = ptData?.[0]?.id || null
        }

        if (!tid) return
        setTenantId(tid)

        // 1. Fetch persistent progress from Postgres (tenant_settings with RLS)
        const { data: settingsData } = await supabase
          .from('tenant_settings')
          .select('onboarding_progress')
          .eq('tenant_id', tid)
          .maybeSingle()

        const dbProgress = settingsData?.onboarding_progress || {}
        fullProgressRef.current = dbProgress

        const vertData = dbProgress[currentVerticalKey]
        if (vertData) {
          setCompletedSteps(vertData.completed_steps || {})
          setIsDismissed(vertData.is_dismissed || false)
        } else {
          // Fallback to local cache if DB was blank
          const localCache = localStorage.getItem(`mrtender_onboarding_${tid}_${currentVerticalKey}`)
          if (localCache) {
            try {
              setCompletedSteps(JSON.parse(localCache))
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error loading onboarding progress from DB:', err)
      }
    }

    loadProgressFromDB()
  }, [currentVerticalKey])

  async function saveProgress(nextCompleted: Record<string, boolean>, dismissedState: boolean) {
    if (!tenantId) return

    // Update local state and cache
    const updatedFull = {
      ...fullProgressRef.current,
      [currentVerticalKey]: {
        completed_steps: nextCompleted,
        is_dismissed: dismissedState,
        updated_at: new Date().toISOString()
      }
    }
    fullProgressRef.current = updatedFull

    try {
      localStorage.setItem(`mrtender_onboarding_${tenantId}_${currentVerticalKey}`, JSON.stringify(nextCompleted))
      if (dismissedState) {
        localStorage.setItem(`mrtender_onboarding_${tenantId}_${currentVerticalKey}_dismissed`, 'true')
      }
    } catch {}

    // Persist to Postgres with RLS
    try {
      await supabase
        .from('tenant_settings')
        .update({ onboarding_progress: updatedFull })
        .eq('tenant_id', tenantId)
    } catch (err) {
      console.error('Error persisting onboarding progress to Postgres:', err)
    }
  }

  function toggleStep(stepId: string) {
    const next = { ...completedSteps, [stepId]: !completedSteps[stepId] }
    setCompletedSteps(next)
    saveProgress(next, isDismissed)
  }

  function handleDismiss() {
    setIsDismissed(true)
    saveProgress(completedSteps, true)
  }

  async function handleLoadSeedData() {
    try {
      setLoadingSeed(true)
      setSeedMessage(null)

      const res = await fetch('/api/seeds/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vertical: activeVertical || 'general' })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error cargando datos demo')
      }

      setSeedMessage(`🎉 ${data.message || 'Productos de ejemplo cargados exitosamente.'}`)
      // Auto-mark first step and persist
      if (onboardingConfig.checklist[0]) {
        const next = { ...completedSteps, [onboardingConfig.checklist[0].id]: true }
        setCompletedSteps(next)
        saveProgress(next, isDismissed)
      }
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      setSeedMessage(`⚠️ ${err.message}`)
    } finally {
      setLoadingSeed(false)
    }
  }

  if (isDismissed) {
    return null
  }

  const totalSteps = onboardingConfig.checklist.length
  const completedCount = onboardingConfig.checklist.filter(s => !!completedSteps[s.id]).length
  const progressPercent = Math.round((completedCount / totalSteps) * 100)

  return (
    <div className="neu-card animate-fade-in" style={{
      padding: '18px 20px',
      border: '1.5px solid var(--border-color)',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }}>
      {/* Top Bar with Title, Progress and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 7px',
              borderRadius: 4,
              background: 'var(--bg-deep)',
              border: '1px solid var(--border-color)',
              fontWeight: 800,
              color: verticalConfig?.accentColor || 'var(--text-primary)',
              letterSpacing: '0.04em'
            }}>
              {onboardingConfig.badgeText}
            </span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {onboardingConfig.title}
            </h3>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {onboardingConfig.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Load Sample Demo Data Button */}
          <button
            type="button"
            onClick={handleLoadSeedData}
            disabled={loadingSeed}
            className="btn-neu btn-ghost"
            title="Carga productos realistas de este rubro para ver el sistema funcionando"
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {loadingSeed ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <PackagePlus size={13} strokeWidth={2} style={{ color: verticalConfig?.accentColor || 'var(--accent-blue)' }} />
            )}
            <span>{loadingSeed ? 'Cargando...' : 'Cargar Productos de Ejemplo'}</span>
          </button>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn-neu btn-ghost"
            style={{ padding: '5px', borderRadius: 6 }}
            title={isCollapsed ? "Expandir checklist" : "Colapsar checklist"}
          >
            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="btn-neu btn-ghost"
            style={{ padding: '5px', borderRadius: 6 }}
            title="Ocultar checklist de bienvenida"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Seed Notice Toast */}
      {seedMessage && (
        <div style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--border-color)',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          {seedMessage}
        </div>
      )}

      {/* Progress Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Progreso de Configuración Inicial ({completedCount} de {totalSteps} pasos)
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {progressPercent}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: 6,
          background: 'var(--bg-deep)',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: progressPercent === 100 ? '#10B981' : (verticalConfig?.accentColor || 'var(--text-primary)'),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Steps List (Collapsible) */}
      {!isCollapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginTop: 4 }}>
          {onboardingConfig.checklist.map((step, idx) => {
            const isDone = !!completedSteps[step.id]
            return (
              <div
                key={step.id}
                style={{
                  background: isDone ? 'var(--bg-deep)' : 'var(--bg)',
                  border: isDone ? '1px dashed var(--border-color)' : '1px solid var(--border-color)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                  opacity: isDone ? 0.75 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: isDone ? '#10B981' : 'var(--text-muted)',
                      marginTop: 2,
                      flexShrink: 0
                    }}
                    title={isDone ? "Marcar como pendiente" : "Marcar como completado"}
                  >
                    {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      color: 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none'
                    }}>
                      {idx + 1}. {step.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.25, marginTop: 2 }}>
                      {step.description}
                    </div>
                  </div>
                </div>

                <Link
                  href={step.href}
                  className="btn-neu"
                  style={{
                    padding: '5px 9px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-deep)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{step.buttonText}</span>
                  <ArrowRight size={11} strokeWidth={2} />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
