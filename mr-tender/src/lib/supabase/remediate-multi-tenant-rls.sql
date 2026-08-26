-- ============================================================================
-- MR TENDER — REMEDIACIÓN CRÍTICA DE AISLAMIENTO MULTI-TENANT & RLS
-- ============================================================================
-- Este script ejecuta la remediación en base de datos para las Prioridades 0, 2, 3, 4 y 5.
-- Ejecutar en Supabase SQL Editor con rol 'postgres' / 'service_role'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PRIORIDAD 0: MIGRACIÓN DE TENANT_ID A RAW_APP_META_DATA
-- ----------------------------------------------------------------------------
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'tenant_id', COALESCE(raw_app_meta_data->>'tenant_id', raw_user_meta_data->>'tenant_id'),
    'role', COALESCE(raw_app_meta_data->>'role', raw_user_meta_data->>'role', 'employee')
)
WHERE (raw_user_meta_data->>'tenant_id') IS NOT NULL;

-- Funciones helper de seguridad blindadas (sin depender de user_metadata)
CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NULLIF(
        COALESCE(
            auth.jwt() -> 'app_metadata' ->> 'tenant_id',
            auth.jwt() ->> 'tenant_id',
            (SELECT raw_app_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
        ),
        ''
    )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        public.jwt_tenant_id(),
        (SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin' OR
        (auth.jwt() ->> 'role') = 'superadmin' OR
        (SELECT raw_app_meta_data->>'role' = 'superadmin' FROM auth.users WHERE id = auth.uid()),
        false
    );
$$;

-- ----------------------------------------------------------------------------
-- 2. PRIORIDAD 2 & 3: INVENTARIO DE TABLAS DIRECTAS Y HABILITACIÓN DE RLS
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
    direct_tables text[] := ARRAY[
        'tenant_settings',
        'sales',
        'customers',
        'products',
        'warehouses',
        'inventory',
        'invoices',
        'dian_resolutions',
        'dian_test_sets',
        'employees',
        'roles',
        'permissions',
        'accounts',
        'journal_entries',
        'fixed_assets',
        'suppliers',
        'purchases',
        'payroll_contracts',
        'payroll_settlements',
        'payroll_electronic_documents',
        'support_documents',
        'cash_shifts',
        'cash_movements',
        'customer_credits',
        'credit_payments',
        'pharmacy_medicines',
        'apparel_lookbooks',
        'apparel_products',
        'apparel_fitting_rooms',
        'gym_members',
        'gym_classes',
        'gym_checkins',
        'automotive_orders',
        'automotive_wash_bays',
        'bakery_recipes',
        'bakery_production_batches',
        'bakery_custom_orders',
        'estanco_combos',
        'estanco_bottle_sales',
        'estanco_returns',
        'hardware_quotes',
        'hardware_rentals',
        'veterinary_pets',
        'veterinary_consultations',
        'veterinary_vaccines',
        'optometry_patients',
        'optometry_lab_orders',
        'laundry_orders',
        'laundry_racks',
        'salon_agenda',
        'salon_commissions'
    ];
BEGIN
    FOREACH t IN ARRAY direct_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            
            -- Eliminar políticas previas para evitar colisiones
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I;', t);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.%I;', t);
            EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_isolation" ON public.%I;', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable all for %s" ON public.%I;', t, t);
            
            -- Crear política estricta de aislamiento de inquilino
            EXECUTE format('
                CREATE POLICY "%s_tenant_isolation" ON public.%I
                FOR ALL
                TO authenticated
                USING (
                    tenant_id = public.get_user_tenant_id()
                    OR public.is_superadmin()
                )
                WITH CHECK (
                    tenant_id = public.get_user_tenant_id()
                    OR public.is_superadmin()
                );
            ', t, t);
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. PRIORIDAD 3: POLÍTICAS RLS CON EXISTS PARA TABLAS HIJAS / RELACIONALES
-- ----------------------------------------------------------------------------

-- A. sale_items (Hija de sales)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sale_items') THEN
        ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "sale_items_isolation" ON public.sale_items;
        DROP POLICY IF EXISTS "sale_items_tenant_isolation" ON public.sale_items;
        
        CREATE POLICY "sale_items_tenant_isolation" ON public.sale_items
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.sales s
                WHERE s.id = sale_items.sale_id
                  AND (s.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.sales s
                WHERE s.id = sale_items.sale_id
                  AND (s.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        );
    END IF;
END $$;

-- B. sale_payments (Hija de sales)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sale_payments') THEN
        ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "sale_payments_tenant_isolation" ON public.sale_payments;
        
        CREATE POLICY "sale_payments_tenant_isolation" ON public.sale_payments
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.sales s
                WHERE s.id = sale_payments.sale_id
                  AND (s.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.sales s
                WHERE s.id = sale_payments.sale_id
                  AND (s.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        );
    END IF;
END $$;

-- C. journal_entry_lines (Hija de journal_entries)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journal_entry_lines') THEN
        ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "journal_lines_tenant_isolation" ON public.journal_entry_lines;
        
        CREATE POLICY "journal_lines_tenant_isolation" ON public.journal_entry_lines
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.journal_entries j
                WHERE j.id = journal_entry_lines.entry_id
                  AND (j.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.journal_entries j
                WHERE j.id = journal_entry_lines.entry_id
                  AND (j.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        );
    END IF;
END $$;

-- D. pharmacy_lots (Hija de pharmacy_medicines)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacy_lots') THEN
        ALTER TABLE public.pharmacy_lots ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "pharmacy_lots_tenant_policy" ON public.pharmacy_lots;
        DROP POLICY IF EXISTS "pharmacy_lots_tenant_isolation" ON public.pharmacy_lots;
        
        CREATE POLICY "pharmacy_lots_tenant_isolation" ON public.pharmacy_lots
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.pharmacy_medicines m
                WHERE m.id = pharmacy_lots.medicine_id
                  AND (m.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.pharmacy_medicines m
                WHERE m.id = pharmacy_lots.medicine_id
                  AND (m.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        );
    END IF;
END $$;

-- E. purchase_items (Hija de purchases)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_items') THEN
        ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "purchase_items_tenant_isolation" ON public.purchase_items;
        
        CREATE POLICY "purchase_items_tenant_isolation" ON public.purchase_items
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.purchases p
                WHERE p.id = purchase_items.purchase_id
                  AND (p.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.purchases p
                WHERE p.id = purchase_items.purchase_id
                  AND (p.tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
            )
        );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. PRIORIDAD 4: SEGURIDAD EN SUPABASE REALTIME (WEBSOCKETS)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER TABLE public.sales REPLICA IDENTITY FULL;
        ALTER TABLE public.inventory REPLICA IDENTITY FULL;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. PRIORIDAD 5: AISLAMIENTO MULTI-TENANT EN SUPABASE STORAGE (PDF/XML)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_storage_isolation_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_isolation_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_isolation_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_isolation_delete" ON storage.objects;

CREATE POLICY "tenant_storage_isolation_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    OR public.is_superadmin()
);

CREATE POLICY "tenant_storage_isolation_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    OR public.is_superadmin()
);

CREATE POLICY "tenant_storage_isolation_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
    (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    OR public.is_superadmin()
)
WITH CHECK (
    (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    OR public.is_superadmin()
);

CREATE POLICY "tenant_storage_isolation_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    OR public.is_superadmin()
);
