-- ============================================================================
-- MR TENDER — AUDITORÍA DE SEGURIDAD MULTI-TENANT & RLS
-- ============================================================================
-- Ejecuta este script en Supabase SQL Editor para auditar:
-- 1. Tablas públicas sin RLS activado.
-- 2. Tablas que carecen de columna 'tenant_id'.
-- 3. Políticas RLS activas por tabla.
-- ============================================================================

-- 1. TABLAS PÚBLICAS SIN RLS (DEBE RETORNAR 0 FILAS)
SELECT 
    schemaname,
    tablename,
    rowsecurity AS is_rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('schema_migrations', '_prisma_migrations', 'spatial_ref_sys')
ORDER BY tablename;

-- 2. TABLAS MULTI-TENANT SIN COLUMNA 'tenant_id' (EXCEPTUANDO TABLAS GLOBALES DEL SISTEMA)
SELECT 
    t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN (
      'platform_subscription_plans',
      'platform_tenants',
      'platform_coupons',
      'platform_audit_logs',
      'schema_migrations'
  )
  AND NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
        AND c.column_name = 'tenant_id'
  )
ORDER BY t.table_name;

-- 3. REPORTE DE POLÍTICAS RLS VIGENTES POR TABLA
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. PLANTILLA ESTÁNDAR PARA POLÍTICAS RLS EN TABLAS NUEVAS
/*
ALTER TABLE public.mi_tabla ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento de inquilino (Lectura y Escritura)
CREATE POLICY "Tenant Isolation Policy" ON public.mi_tabla
    FOR ALL
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'role') = 'superadmin'
    )
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'role') = 'superadmin'
    );
*/
