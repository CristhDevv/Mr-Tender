'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  VERTICAL_TERMINOLOGY,
  GENERIC_TERMS,
  VerticalTermConfig,
  resolveActiveVertical,
  getVerticalTerm
} from '@/lib/constants/vertical-terminology'

export interface UseVerticalTermsResult {
  activeVertical: string | null
  verticalConfig: VerticalTermConfig | null
  t: (termKey: keyof typeof GENERIC_TERMS | string, fallback?: string) => string
  getSidebarLabel: (href: string, defaultLabel: string) => string
  accentColor: string
  singleWordTitle: string
  loading: boolean
}

export function useVerticalTerms(): UseVerticalTermsResult {
  const [activeVertical, setActiveVertical] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadVertical() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const tenant_id = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
        if (!tenant_id) {
          setLoading(false)
          return
        }

        // Fetch enabled_modules, primary_vertical and business_type
        const [settingsRes, tenantRes] = await Promise.all([
          supabase
            .from('tenant_settings')
            .select('enabled_modules, primary_vertical')
            .eq('tenant_id', tenant_id)
            .limit(1),
          supabase
            .from('platform_tenants')
            .select('business_type')
            .eq('id', tenant_id)
            .limit(1)
        ])

        const enabledMods = settingsRes.data?.[0]?.enabled_modules || null
        const primaryVert = settingsRes.data?.[0]?.primary_vertical || null
        const businessType = tenantRes.data?.[0]?.business_type || null

        const resolved = resolveActiveVertical(enabledMods, businessType, primaryVert)
        setActiveVertical(resolved)
      } catch (err) {
        console.error('Error loading vertical terms:', err)
      } finally {
        setLoading(false)
      }
    }

    loadVertical()
  }, [])

  const verticalConfig = activeVertical ? VERTICAL_TERMINOLOGY[activeVertical] || null : null

  const t = useCallback(
    (termKey: keyof typeof GENERIC_TERMS | string, fallback?: string): string => {
      if (verticalConfig) {
        const custom = (verticalConfig.terms as Record<string, string | undefined>)[termKey]
        if (custom) return custom
      }
      const generic = (GENERIC_TERMS as Record<string, string | undefined>)[termKey]
      if (generic) return generic
      return fallback || termKey
    },
    [verticalConfig]
  )

  const getSidebarLabel = useCallback(
    (href: string, defaultLabel: string): string => {
      if (verticalConfig?.sidebarOverrides && verticalConfig.sidebarOverrides[href]) {
        return verticalConfig.sidebarOverrides[href]
      }
      return defaultLabel
    },
    [verticalConfig]
  )

  return {
    activeVertical,
    verticalConfig,
    t,
    getSidebarLabel,
    accentColor: verticalConfig?.accentColor || 'var(--text-primary)',
    singleWordTitle: verticalConfig?.singleWordTitle || 'General',
    loading
  }
}
