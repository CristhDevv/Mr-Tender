'use client'
import React, { useState, useEffect } from 'react'
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
  const [tenantId, setTenantId] = useState<string>('default')

  const onboardingConfig = (activeVertical && VERTICAL_ONBOARDINGS[activeVertical])
    ? VERTICAL_ONBOARDINGS[activeVertical]
    : VERTICAL_ONBOARDINGS.general

  useEffect(() => {
    async function loadProgress() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const tid = user?.app_metadata?.tenant_id || user?.user_metadata?.tenant_id || 'default'
        setTenantId(tid)

        const storageKey = `mrtender_onboarding_${tid}_${activeVertical || 'general'}`
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try {
            setCompletedSteps(JSON.parse(saved))
          } catch {}
        }

        const dismissed = localStorage.getItem(`${storageKey}_dismissed`)
        if (dismissed === 'true') {
          setIsDismissed(true)
        }
      } catch (err) {
        console.error('Error loading onboarding progress:', err)
      }
    }
    loadProgress()
  }, [activeVertical])

  function toggleStep(stepId: string) {
    const next = { ...completedSteps, [stepId]: !completedSteps[stepId] }
    setCompletedSteps(next)
    try {
      const storageKey = `mrtender_onboarding_${tenantId}_${activeVertical || 'general'}`
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {}
  }

  function handleDismiss() {
    setIsDismissed(true)
    try {
      const storageKey = `mrtender_onboarding_${tenantId}_${activeVertical || 'general'}_dismissed`
      localStorage.setItem(storageKey, 'true')
    } catch {}
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
      // Auto-mark first step
      if (onboardingConfig.checklist[0]) {
        toggleStep(onboardingConfig.checklist[0].id)
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
            title="Carga 6-8 productos realistas de este rubro para ver el sistema funcionando"
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
