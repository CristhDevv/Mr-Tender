import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })
    }

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

    // Generar link dinámico de checkout (Wompi / PSE / Nequi compatible)
    // En producción se usa la llave pública de Wompi del tenant o pasarela configurada
    const cleanPhone = (customerPhone || '').replace(/\D/g, '')
    const wompiCheckoutUrl = `https://checkout.wompi.co/p/?public-key=pub_prod_demo&currency=${currency}&amount-in-cents=${Math.round(amount * 100)}&reference=${reference}&redirect-url=https://mr-tender.vercel.app/invoices`

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
