import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DianInvoicePayload, DianTaxRegime, DianPersonType, DianIdType, DianPaymentMethod } from '@/lib/dian/types'
import { buildInvoiceUblXml } from '@/lib/dian/ubl-builder'
import { dianClient } from '@/lib/dian/dian-client'
import { calculateNITVerificationDigit } from '@/lib/dian/cufe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })
    }

    const body = await req.json()
    const { saleId, customCustomer, customItems, paymentMethod, notes } = body

    // 1. Obtener configuraciones del tenant
    const { data: tenantSettings, error: tErr } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (tErr || !tenantSettings) {
      return NextResponse.json({ error: 'Configuración de negocio no encontrada' }, { status: 404 })
    }

    // 2. Obtener o crear resolución de facturación activa
    let { data: resolution } = await supabase
      .from('dian_resolutions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!resolution) {
      // Usar resolución de prueba por defecto si no ha configurado una
      resolution = {
        resolution_number: tenantSettings.dian_resolution || '18760000001',
        prefix: tenantSettings.dian_prefix || 'SETP',
        from_number: Number(tenantSettings.dian_from || 1),
        to_number: Number(tenantSettings.dian_to || 50000),
        current_number: 1,
        valid_from: '2026-01-01',
        valid_to: '2027-12-31',
        technical_key: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
        environment: '2'
      }
    }

    // Incrementar consecutivo
    const nextFolio = (resolution.current_number || 1) + 1
    const invoiceNumber = `${resolution.prefix}${nextFolio}`

    // 3. Obtener datos de la venta si se proporciona saleId
    let saleData: any = null
    let saleItems: any[] = []
    let customerData: any = null

    if (saleId) {
      const { data: sData } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single()
      saleData = sData

      const { data: sItems } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
      saleItems = sItems || []

      if (saleData?.customer_id) {
        const { data: cData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', saleData.customer_id)
          .single()
        customerData = cData
      }
    }

    // 4. Mapear Emisor
    const emisorNit = tenantSettings.tax_id ? tenantSettings.tax_id.replace(/\D/g, '') : '901234567'
    const emisorDv = calculateNITVerificationDigit(emisorNit)

    const emisor = {
      nit: emisorNit,
      dv: emisorDv,
      businessName: tenantSettings.business_name || 'MI EMPRESA S.A.S.',
      tradeName: tenantSettings.trade_name || tenantSettings.business_name || 'Mi Negocio',
      regime: (tenantSettings.dian_regimen?.includes('No') ? '49' : '48') as DianTaxRegime,
      personType: '1' as DianPersonType,
      idType: '31' as DianIdType,
      email: tenantSettings.email || user.email || 'facturacion@mrtender.com',
      phone: tenantSettings.phone || '3001234567',
      address: tenantSettings.address || 'Calle Principal # 1-23',
      city: tenantSettings.city || 'Bogotá',
      state: tenantSettings.state || 'Bogotá D.C.',
      country: 'Colombia',
      softwareId: tenantSettings.dian_software_id || 'soft-mrtender-01',
      softwarePin: '12345'
    }

    // 5. Mapear Adquiriente (Cliente)
    const adqRawId = customCustomer?.id || customerData?.tax_id || customerData?.phone || '222222222222'
    const adqCleanId = String(adqRawId).replace(/[^a-zA-Z0-9]/g, '')

    const adquiriente = {
      id: adqCleanId,
      idType: (customCustomer?.idType || (adqCleanId.length >= 9 ? '31' : '13')) as DianIdType,
      dv: customCustomer?.idType === '31' ? calculateNITVerificationDigit(adqCleanId) : undefined,
      name: customCustomer?.name || customerData?.full_name || 'Consumidor Final',
      personType: (customCustomer?.personType || (adqCleanId.length >= 9 ? '1' : '2')) as DianPersonType,
      regime: (customCustomer?.regime || '49') as DianTaxRegime,
      email: customCustomer?.email || customerData?.email || '',
      phone: customCustomer?.phone || customerData?.phone || '',
      address: customCustomer?.address || customerData?.address || 'Mostrador',
      city: customCustomer?.city || 'Bogotá',
      state: customCustomer?.state || 'Bogotá D.C.',
      country: 'Colombia'
    }

    // 6. Mapear Ítems
    const itemsSource = customItems || saleItems.map(si => ({
      id: si.product_id || si.id,
      sku: si.product_sku || 'SKU-GEN',
      name: si.product_name,
      quantity: Number(si.quantity),
      unitCode: 'EA',
      unitPrice: Number(si.unit_price),
      discountAmount: Number(si.discount_amount || 0),
      subtotal: Number(si.subtotal || si.unit_price * si.quantity),
      taxRate: Number(si.tax_rate || 0),
      taxAmount: Number(si.tax_amount || 0),
      total: Number(si.total)
    }))

    let taxExclusiveTotal = 0
    let iva19Base = 0
    let iva19Tax = 0
    let iva5Base = 0
    let iva5Tax = 0
    let iva0Base = 0
    let totalDiscount = 0
    let payableTotal = 0

    const mappedItems = itemsSource.map((it: any, index: number) => {
      const lineSubtotal = Number(it.subtotal || it.unitPrice * it.quantity)
      const lineTaxRate = Number(it.taxRate || 0)
      const lineTaxAmount = Number(it.taxAmount || (lineSubtotal * lineTaxRate / 100))
      const lineTotal = Number(it.total || lineSubtotal + lineTaxAmount)
      const lineDiscount = Number(it.discountAmount || 0)

      taxExclusiveTotal += lineSubtotal
      totalDiscount += lineDiscount
      payableTotal += lineTotal

      if (lineTaxRate === 19) {
        iva19Base += lineSubtotal
        iva19Tax += lineTaxAmount
      } else if (lineTaxRate === 5) {
        iva5Base += lineSubtotal
        iva5Tax += lineTaxAmount
      } else {
        iva0Base += lineSubtotal
      }

      return {
        id: String(it.id || index + 1),
        sku: it.sku || `SKU-${index + 1}`,
        name: it.name,
        quantity: it.quantity,
        unitCode: it.unitCode || 'EA',
        unitPrice: it.unitPrice,
        subtotal: lineSubtotal,
        discountAmount: lineDiscount,
        taxes: [
          {
            taxCode: '01' as const,
            taxName: 'IVA',
            taxRate: lineTaxRate,
            taxableAmount: lineSubtotal,
            taxAmount: lineTaxAmount
          }
        ],
        total: lineTotal
      }
    })

    const totalTax = iva19Tax + iva5Tax

    // 7. Mapear Medio de Pago
    const payMethod = paymentMethod || saleData?.payment_method || 'cash'
    let paymentCode: DianPaymentMethod = '10'
    let paymentName = 'Efectivo'
    let isCredit = false

    if (payMethod === 'transfer') {
      paymentCode = '48'
      paymentName = 'Transferencia Electrónica'
    } else if (payMethod === 'card' || payMethod === 'credit_card') {
      paymentCode = '48'
      paymentName = 'Tarjeta de Crédito / Débito'
    } else if (payMethod === 'fiao' || payMethod === 'credit') {
      paymentCode = '1'
      paymentName = 'Crédito'
      isCredit = true
    }

    // 8. Construir Payload Oficial de la Factura
    const invoicePayload: DianInvoicePayload = {
      documentType: '01',
      number: invoiceNumber,
      prefix: resolution.prefix,
      folio: nextFolio,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().split(' ')[0] + '-05:00',
      currency: 'COP',
      environment: resolution.environment || '2',
      resolution: {
        resolutionNumber: resolution.resolution_number,
        prefix: resolution.prefix,
        fromNumber: resolution.from_number,
        toNumber: resolution.to_number,
        currentNumber: nextFolio,
        validFrom: resolution.valid_from,
        validTo: resolution.valid_to,
        technicalKey: resolution.technical_key,
        environment: resolution.environment || '2'
      },
      emisor,
      adquiriente,
      paymentMeans: {
        code: paymentCode,
        name: paymentName,
        isCredit
      },
      items: mappedItems,
      totals: {
        lineExtensionAmount: taxExclusiveTotal,
        taxExclusiveAmount: taxExclusiveTotal,
        taxInclusiveAmount: payableTotal,
        allowanceTotalAmount: totalDiscount,
        payableAmount: payableTotal,
        taxBreakdown: {
          iva19: { base: iva19Base, tax: iva19Tax },
          iva5: { base: iva5Base, tax: iva5Tax },
          iva0: { base: iva0Base, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax
        }
      },
      notes: notes || 'Factura Electrónica emitida con Mr. Tender'
    }

    // 9. Generar XML UBL 2.1, CUFE y QR
    const { xml, cufe, qrData } = buildInvoiceUblXml(invoicePayload)

    // 10. Transmitir a la DIAN
    const fileName = `face_f${emisor.nit}00021${String(nextFolio).padStart(10, '0')}`
    const dianResponse = await dianClient.sendDocument({
      environment: invoicePayload.environment,
      xmlContent: xml,
      fileName
    })

    // 11. Guardar Factura en la Base de Datos
    const { data: newInvoice, error: invErr } = await supabase
      .from('invoices')
      .insert([{
        tenant_id: tenantId,
        sale_id: saleId || null,
        customer_id: customerData?.id || null,
        invoice_type: '01',
        series: resolution.prefix,
        number: invoiceNumber,
        folio: nextFolio,
        cufe: cufe,
        cude: null,
        uuid_fiscal: cufe,
        dian_status: dianResponse.status,
        dian_response: dianResponse,
        dian_environment: invoicePayload.environment,
        qr_data: qrData,
        signed_xml: xml,
        track_id: dianResponse.trackId || null,
        subtotal: taxExclusiveTotal,
        tax_amount: totalTax,
        total: payableTotal,
        currency: 'COP',
        exchange_rate: 1,
        status: dianResponse.status === 'validated' ? 'issued' : 'pending',
        issued_at: new Date().toISOString(),
        customer_tax_data: adquiriente,
        items: mappedItems,
        resolution_number: resolution.resolution_number,
        prefix: resolution.prefix
      }])
      .select()
      .single()

    if (invErr) {
      console.error('Error saving invoice to database:', invErr)
    }

    // 12. Actualizar consecutivo en la resolución si existe
    if (resolution.id) {
      await supabase
        .from('dian_resolutions')
        .update({ current_number: nextFolio })
        .eq('id', resolution.id)
    }

    // 13. Si viene de una venta, asociar el invoice_id a la venta
    if (saleId && newInvoice) {
      await supabase
        .from('sales')
        .update({
          invoice_id: newInvoice.id,
          requires_invoice: true
        })
        .eq('id', saleId)
    }

    return NextResponse.json({
      success: true,
      invoice: newInvoice,
      cufe,
      dianStatus: dianResponse.status,
      dianMessage: dianResponse.statusMessage,
      qrData,
      xml
    })
  } catch (err: any) {
    console.error('Error emitting DIAN invoice:', err)
    return NextResponse.json({ error: err.message || 'Error al emitir la factura electrónica' }, { status: 500 })
  }
}
