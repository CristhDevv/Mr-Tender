import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getVerticalSeedData } from '@/lib/seeds'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Resolve tenant_id securely
    let tenant_id = user.app_metadata?.tenant_id || user.app_metadata?.tenantId
    if (!tenant_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .limit(1)

      if (userData?.[0]?.tenant_id) {
        tenant_id = userData[0].tenant_id
      } else {
        const { data: ptData } = await supabase
          .from('platform_tenants')
          .select('id')
          .eq('owner_email', user.email)
          .limit(1)

        if (ptData?.[0]?.id) {
          tenant_id = ptData[0].id
        }
      }
    }

    if (!tenant_id) {
      return NextResponse.json({ error: 'No se encontró el comercio asociado' }, { status: 403 })
    }

    const { vertical } = (await req.json()) as { vertical?: string }
    const seedItems = getVerticalSeedData(vertical || 'general')

    // Find or create main warehouse for the tenant
    let { data: whData } = await supabase
      .from('warehouses')
      .select('id')
      .eq('tenant_id', tenant_id)
      .order('is_main', { ascending: false })
      .limit(1)

    let warehouseId = whData?.[0]?.id
    if (!warehouseId) {
      const { data: newWh, error: whErr } = await supabase
        .from('warehouses')
        .insert({
          tenant_id,
          name: 'Bodega Principal',
          is_main: true
        })
        .select('id')
        .single()

      if (!whErr && newWh?.id) {
        warehouseId = newWh.id
      }
    }

    let insertedCount = 0
    let alreadyExistingCount = 0

    // Database-level Atomic UPSERT with ON CONFLICT (tenant_id, sku) DO NOTHING
    for (const item of seedItems) {
      const skuVal = item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`

      // 1. Atomic upsert for Product with DB Unique Constraint
      const { data: upsertedProduct, error: prodErr } = await supabase
        .from('products')
        .upsert(
          {
            tenant_id,
            name: item.name,
            sku: skuVal,
            barcode: item.barcode || skuVal,
            sale_price: item.price,
            cost_price: item.cost_price,
            product_type: 'product',
            is_active: true
          },
          {
            onConflict: 'tenant_id,sku',
            ignoreDuplicates: true
          }
        )
        .select('id')
        .maybeSingle()

      if (prodErr) {
        console.error('Error upserting product:', prodErr)
        continue
      }

      // If product was already existing, upsertedProduct will be null or already present
      if (!upsertedProduct?.id) {
        // Fetch existing product id
        const { data: existingP } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('sku', skuVal)
          .limit(1)

        if (existingP?.[0]?.id) {
          alreadyExistingCount++
          // Ensure inventory row exists even if product was created in past
          if (warehouseId) {
            await supabase.from('inventory').upsert(
              {
                tenant_id,
                product_id: existingP[0].id,
                warehouse_id: warehouseId,
                quantity: item.initial_stock || 10,
                variant_id: null
              },
              {
                onConflict: 'warehouse_id,product_id,variant_id',
                ignoreDuplicates: true
              }
            )
          }
        }
      } else {
        insertedCount++
        // Insert initial inventory row
        if (warehouseId) {
          await supabase.from('inventory').upsert(
            {
              tenant_id,
              product_id: upsertedProduct.id,
              warehouse_id: warehouseId,
              quantity: item.initial_stock || 10,
              variant_id: null
            },
            {
              onConflict: 'warehouse_id,product_id,variant_id',
              ignoreDuplicates: true
            }
          )
        }
      }
    }

    const message = insertedCount > 0
      ? `Se agregaron ${insertedCount} productos de ejemplo a tu catálogo.`
      : `Todos los ${seedItems.length} productos de ejemplo ya están registrados en tu catálogo.`

    return NextResponse.json({
      success: true,
      message,
      insertedCount,
      alreadyExistingCount,
      totalSeeds: seedItems.length
    })
  } catch (err: any) {
    console.error('Error loading seed data:', err)
    return NextResponse.json({ error: err.message || 'Error al cargar datos demo' }, { status: 500 })
  }
}
