import { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export interface SecureTenantContext {
  tenantId: string
  role: string
  userId: string
  email: string
  fullName: string
}

/**
 * Extrae de forma segura el tenant_id y el rol del usuario autenticado.
 * REGLA DE SEGURIDAD CRÍTICA:
 * NUNCA se debe confiar en user.user_metadata para tenant_id o roles administrativos,
 * ya que user_metadata puede ser manipulado directamente por el cliente vía supabase.auth.updateUser().
 * Solo app_metadata es inmutable por el cliente y seguro para control de acceso multi-tenant.
 */
export function getSecureTenantId(user: User | null | undefined): string | null {
  if (!user) return null

  // 1. Prioridad absoluta: app_metadata (asignado por backend/service role)
  const appTenantId = user.app_metadata?.tenant_id || user.app_metadata?.tenantId
  if (appTenantId && typeof appTenantId === 'string' && appTenantId.trim() !== '') {
    return appTenantId.trim()
  }

  return null
}

/**
 * Obtiene el rol seguro del usuario desde app_metadata o fallback a employee.
 */
export function getSecureRole(user: User | null | undefined): string {
  if (!user) return 'anonymous'
  return user.app_metadata?.role || user.user_metadata?.role || 'employee'
}

/**
 * Valida el acceso del usuario en un Route Handler de Next.js.
 * Si el usuario no está autenticado, responde con 401.
 * Si el usuario no tiene un tenant_id válido en app_metadata, responde con 403.
 */
export function validateTenantAccess(user: User | null | undefined): { ok: true; context: SecureTenantContext } | { ok: false; response: NextResponse } {
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No autenticado. Inicie sesión para continuar.' },
        { status: 401 }
      )
    }
  }

  const tenantId = getSecureTenantId(user)
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Acceso denegado: Tenant no configurado de forma segura en app_metadata o usuario sin comercio asignado.' },
        { status: 403 }
      )
    }
  }

  const role = getSecureRole(user)
  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'

  return {
    ok: true,
    context: {
      tenantId,
      role,
      userId: user.id,
      email: user.email || '',
      fullName
    }
  }
}
