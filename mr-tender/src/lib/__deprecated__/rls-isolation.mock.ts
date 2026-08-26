/**
 * ============================================================================
 * [DEPRECATED / ARCHIVED - SECURITY THEATER WARNING]
 * ============================================================================
 * Este archivo ha sido deprecado y marcado como OBSOLETO tras la auditoría adversarial.
 * 
 * MOTIVO DE OBSOLECENCIA:
 * Este archivo utilizaba una clase TypeScript `MockRlsEngine` con un array en RAM
 * que simulaba de forma tautológica el comportamiento de PostgreSQL sin ejecutar SQL
 * ni evaluar políticas RLS reales.
 * 
 * SUITE DE PRUEBAS REAL ACTIVA:
 * Para pruebas de seguridad y aislamiento multi-tenant end-to-end reales:
 * - Route Handlers: src/lib/api-security-real.test.ts
 * - Script RLS PostgreSQL: src/lib/supabase/remediate-multi-tenant-rls.sql
 * ============================================================================
 */

export interface DeprecatedDatabaseRow {
  id: string
  tenant_id: string
  [key: string]: any
}
