'use client'
import React from 'react'
import Link from 'next/link'
import { useVerticalTerms } from '@/lib/hooks/useVerticalTerms'
import { VERTICAL_DASHBOARD_CONFIGS } from '@/lib/constants/vertical-dashboard'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function VerticalDashboardWidgets() {
  const { activeVertical, verticalConfig } = useVerticalTerms()

  if (!activeVertical || !VERTICAL_DASHBOARD_CONFIGS[activeVertical]) {
    return null
  }

  const config = VERTICAL_DASHBOARD_CONFIGS[activeVertical]

  return (
    <div className="neu-card animate-fade-in" style={{
      padding: '20px',
      border: '1.5px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      background: 'var(--bg)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '0.68rem',
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--bg-deep)',
              border: '1px solid var(--border-color)',
              fontWeight: 800,
              color: verticalConfig?.accentColor || 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {verticalConfig?.singleWordTitle || 'Especializado'}
            </span>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {config.sectionTitle}
            </h2>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {config.sectionSubtitle}
          </p>
        </div>
      </div>

      {/* Grid of Contextual Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {config.widgets.map(w => {
          const Icon = w.icon
          return (
            <div
              key={w.id}
              style={{
                background: 'var(--bg-deep)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'var(--bg)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: w.color,
                    flexShrink: 0
                  }}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  {w.badgeText && (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--bg)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)'
                    }}>
                      {w.badgeText}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {w.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: 2 }}>
                    {w.subtitle}
                  </div>
                </div>
              </div>

              <Link
                href={w.href}
                className="btn-neu"
                style={{
                  padding: '7px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  background: 'var(--bg)'
                }}
              >
                <span>{w.actionLabel}</span>
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
