import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateTenantAccess } from '@/lib/supabase/auth-helpers'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const authCheck = validateTenantAccess(user)
    if (!authCheck.ok) {
      return authCheck.response
    }
    const { tenantId } = authCheck.context

    const body = await req.json()
    const {
      amount,
      currency = 'COP',
      reference,
      customerEmail,
      customerName,
      customerPhone,
      description
    } = body

    if (!amount || !reference) {
      return NextResponse.json({ error: 'Monto y referencia son requeridos' }, { status: 400 })
    }

    // Consultar configuración del tenant para llave pública de pasarela
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('wompi_public_key')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const wompiPubKey = tenantSettings?.wompi_public_key || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || process.env.WOMPI_PUBLIC_KEY || 'pub_prod_demo'
    const origin = req.nextUrl.origin || 'https://mr-tender.vercel.app'
    const redirectUrl = `${origin}/invoices`

    // Generar link dinámico de checkout (Wompi / PSE / Nequi compatible)
    const wompiCheckoutUrl = `https://checkout.wompi.co/p/?public-key=${wompiPubKey}&currency=${currency}&amount-in-cents=${Math.round(amount * 100)}&reference=${reference}&redirect-url=${encodeURIComponent(redirectUrl)}`

    // QR universal para pago
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(wompiCheckoutUrl)}`

    return NextResponse.json({
      success: true,
      reference,
      amount,
      currency,
      paymentUrl: wompiCheckoutUrl,
      qrCodeUrl,
      message: 'Enlace de pago y código QR generados exitosamente'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al generar link de cobro' }, { status: 500 })
  }
}
