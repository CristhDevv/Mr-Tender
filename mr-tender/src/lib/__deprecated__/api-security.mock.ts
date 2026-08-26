/**
 * ============================================================================
 * [DEPRECATED / ARCHIVED - SECURITY THEATER WARNING]
 * ============================================================================
 * Este archivo ha sido deprecado y marcado como OBSOLETO tras la auditoría adversarial.
 * 
 * MOTIVO DE OBSOLECENCIA:
 * Este archivo utilizaba mocks en memoria (Array.filter / Array.find en RAM)
 * que validaban funciones ficticias sin consultar los Route Handlers reales
 * de Next.js ni la base de datos PostgreSQL.
 * 
 * SUITE DE PRUEBAS REAL ACTIVA:
 * Para pruebas de seguridad y aislamiento multi-tenant end-to-end reales,
 * consultar y ejecutar: src/lib/api-security-real.test.ts
 * ============================================================================
 */

export interface DeprecatedMockSession {
  user: {
    id: string
    email: string
    user_metadata: {
      tenant_id: string
      role: 'superadmin' | 'owner' | 'admin' | 'cashier' | 'employee'
      full_name?: string
    }
  } | null
}
