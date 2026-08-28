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

    for (const item of seedItems) {
      // Check if product with same name or SKU already exists for this tenant
      let query = supabase
        .from('products')
        .select('id')
        .eq('tenant_id', tenant_id)

      if (item.sku) {
        query = query.or(`name.eq."${item.name}",sku.eq."${item.sku}"`)
      } else {
        query = query.eq('name', item.name)
      }

      const { data: existing } = await query.limit(1)

      if (existing && existing.length > 0) {
        alreadyExistingCount++
        continue
      }

      // Insert new seed product
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          tenant_id,
          name: item.name,
          sku: item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: item.barcode || item.sku || null,
          sale_price: item.price,
          cost_price: item.cost_price,
          product_type: 'simple',
          is_active: true
        })
        .select('id')
        .single()

      if (!prodErr && newProd?.id) {
        insertedCount++

        // Create inventory row if warehouse is resolved and doesn't exist yet
        if (warehouseId) {
          const { data: existingInv } = await supabase
            .from('inventory')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('product_id', newProd.id)
            .eq('warehouse_id', warehouseId)
            .limit(1)

          if (!existingInv || existingInv.length === 0) {
            await supabase.from('inventory').insert({
              tenant_id,
              product_id: newProd.id,
              warehouse_id: warehouseId,
              quantity: item.initial_stock || 10,
              min_stock: item.min_stock || 5
            })
          }
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
