import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateTenantAccess } from '@/lib/supabase/auth-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const authCheck = validateTenantAccess(user)
    if (!authCheck.ok) {
      return authCheck.response
    }
    const { tenantId } = authCheck.context

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Factura no encontrada o no pertenece a este comercio' }, { status: 404 })
    }

    const searchParams = req.nextUrl.searchParams
    const format = searchParams.get('format') || 'xml'

    if (format === 'xml') {
      const xml = invoice.signed_xml || '<?xml version="1.0" encoding="UTF-8"?><Invoice/>'
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="Factura_${invoice.number}.xml"`
        }
      })
    }

    return NextResponse.json({ invoice })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
