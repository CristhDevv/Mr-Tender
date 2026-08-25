import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DianCreditNotePayload } from '@/lib/dian/types'
import { buildCreditNoteUblXml } from '@/lib/dian/ubl-builder'
import { dianClient } from '@/lib/dian/dian-client'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })

    const body = await req.json()
    const { invoiceId, discrepancyCode, reason } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requerido' }, { status: 400 })
    }

    // 1. Obtener la factura original
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // 2. Obtener configuración de negocio
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    const emisorNit = tenantSettings?.tax_id ? tenantSettings.tax_id.replace(/\D/g, '') : '901234567'
    const emisorDv = calculateNITVerificationDigit(emisorNit)

    const emisor = {
      nit: emisorNit,
      dv: emisorDv,
      businessName: tenantSettings?.business_name || 'MI EMPRESA S.A.S.',
      regime: '48' as const,
      personType: '1' as const,
      idType: '31' as const,
      email: tenantSettings?.email || 'facturacion@mrtender.com',
      phone: tenantSettings?.phone || '3001234567',
      address: tenantSettings?.address || 'Calle Principal',
      city: tenantSettings?.city || 'Bogotá',
      state: tenantSettings?.state || 'Bogotá D.C.',
      country: 'Colombia',
      softwareId: tenantSettings?.dian_software_id || 'soft-mrtender-01',
      softwarePin: '12345'
    }

    const ncNumber = `NC-${Date.now().toString().slice(-6)}`
    const folio = parseInt(Date.now().toString().slice(-6), 10)

    const resolution = {
      resolutionNumber: invoice.resolution_number || '18760000001',
      prefix: 'NC',
      fromNumber: 1,
      toNumber: 50000,
      currentNumber: folio,
      validFrom: '2026-01-01',
      validTo: '2027-12-31',
      technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
      environment: invoice.dian_environment || '2'
    }

    const items = invoice.items || []
    const subtotal = Number(invoice.subtotal) || 0
    const taxAmount = Number(invoice.tax_amount) || 0
    const total = Number(invoice.total) || 0

    const creditNotePayload: DianCreditNotePayload = {
      creditNoteNumber: ncNumber,
      prefix: 'NC',
      folio,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().split(' ')[0] + '-05:00',
      environment: invoice.dian_environment || '2',
      resolution,
      emisor,
      adquiriente: invoice.customer_tax_data || {
        id: '222222222222',
        idType: '13',
        name: 'Consumidor Final',
        personType: '2',
        regime: '49'
      },
      billingReference: {
        invoiceNumber: invoice.number,
        invoiceCufe: invoice.cufe || invoice.uuid_fiscal || '',
        invoiceIssueDate: invoice.issued_at?.split('T')[0] || new Date().toISOString().split('T')[0]
      },
      discrepancyResponse: {
        code: discrepancyCode || '2',
        description: reason || 'Anulación de factura electrónica'
      },
      items,
      totals: {
        lineExtensionAmount: subtotal,
        taxExclusiveAmount: subtotal,
        taxInclusiveAmount: total,
        allowanceTotalAmount: 0,
        payableAmount: total,
        taxBreakdown: {
          iva19: { base: subtotal, tax: taxAmount },
          iva5: { base: 0, tax: 0 },
          iva0: { base: 0, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax: taxAmount
        }
      }
    }

    // Generar UBL 2.1 XML y CUDE
    const { xml, cude, qrData } = buildCreditNoteUblXml(creditNotePayload)

    // Transmitir a la DIAN
    const fileName = `nc_f${emisor.nit}00021${String(folio).padStart(10, '0')}`
    const dianResponse = await dianClient.sendDocument({
      environment: creditNotePayload.environment,
      xmlContent: xml,
      fileName
    })

    // Registrar en BD
    const { data: newCreditNote, error: ncErr } = await supabase
      .from('invoices')
      .insert([{
        tenant_id: tenantId,
        sale_id: invoice.sale_id,
        customer_id: invoice.customer_id,
        invoice_type: '91',
        note_type: 'credit_note',
        reference_invoice_id: invoice.id,
        series: 'NC',
        number: ncNumber,
        folio,
        cufe: null,
        cude: cude,
        uuid_fiscal: cude,
        dian_status: dianResponse.status,
        dian_response: dianResponse,
        dian_environment: creditNotePayload.environment,
        qr_data: qrData,
        signed_xml: xml,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total: total,
        currency: 'COP',
        exchange_rate: 1,
        status: dianResponse.status === 'validated' ? 'issued' : 'pending',
        issued_at: new Date().toISOString(),
        customer_tax_data: creditNotePayload.adquiriente,
        items: items,
        resolution_number: resolution.resolutionNumber,
        prefix: 'NC'
      }])
      .select()
      .single()

    if (ncErr) throw ncErr

    // Actualizar estado de la factura original a 'cancelled'
    await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', invoice.id)

    return NextResponse.json({
      success: true,
      creditNote: newCreditNote,
      cude,
      dianStatus: dianResponse.status,
      dianMessage: dianResponse.statusMessage,
      qrData,
      xml
    })
  } catch (err: any) {
    console.error('Error emitting credit note:', err)
    return NextResponse.json({ error: err.message || 'Error al emitir nota crédito' }, { status: 500 })
  }
}
