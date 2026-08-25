import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDianTestSet } from '@/lib/dian/test-set-runner'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })

    const body = await req.json()
    const { testSetId } = body

    if (!testSetId || testSetId.trim() === '') {
      return NextResponse.json({ error: 'TestSetId es requerido para la habilitación DIAN' }, { status: 400 })
    }

    // Ejecutar lote de pruebas DIAN
    const result = await runDianTestSet(tenantId, testSetId.trim())

    return NextResponse.json({
      success: true,
      result
    })
  } catch (err: any) {
    console.error('Error running DIAN test set:', err)
    return NextResponse.json({ error: err.message || 'Error al ejecutar el set de pruebas DIAN' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })

    const { data: testSets, error } = await supabase
      .from('dian_test_sets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ testSets: testSets || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
