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

    let tenant_id = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
    if (!tenant_id) {
      const { data: ptData } = await supabase
        .from('platform_tenants')
        .select('id')
        .eq('owner_email', user.email)
        .limit(1)

      if (ptData?.[0]?.id) {
        tenant_id = ptData[0].id
      }
    }

    if (!tenant_id) {
      return NextResponse.json({ error: 'No se encontró el comercio asociado' }, { status: 400 })
    }

    const { vertical } = (await req.json()) as { vertical?: string }
    const seedItems = getVerticalSeedData(vertical || 'general')

    // Find main warehouse for the tenant
    let { data: whData } = await supabase
      .from('warehouses')
      .select('id')
      .eq('tenant_id', tenant_id)
      .limit(1)

    let warehouseId = whData?.[0]?.id
    if (!warehouseId) {
      // Create a default main warehouse if none exists
      const { data: newWh } = await supabase
        .from('warehouses')
        .insert({
          tenant_id,
          name: 'Bodega Principal',
          is_main: true
        })
        .select('id')
        .single()

      warehouseId = newWh?.id
    }

    let insertedCount = 0

    for (const item of seedItems) {
      // Check if product with same name already exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('name', item.name)
        .limit(1)

      if (existing && existing.length > 0) {
        continue
      }

      // Insert product
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

        // Create inventory row if warehouse exists
        if (warehouseId) {
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

    return NextResponse.json({
      success: true,
      message: `Se agregaron ${insertedCount} productos de ejemplo a tu catálogo.`,
      insertedCount
    })
  } catch (err: any) {
    console.error('Error loading seed data:', err)
    return NextResponse.json({ error: err.message || 'Error al cargar datos demo' }, { status: 500 })
  }
}
