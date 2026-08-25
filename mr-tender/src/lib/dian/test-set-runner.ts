import { createClient } from '../supabase/server'
import { DianInvoicePayload, DianCreditNotePayload, DianDebitNotePayload } from './types'
import { buildInvoiceUblXml, buildCreditNoteUblXml } from './ubl-builder'
import { dianClient } from './dian-client'

export interface TestSetProgress {
  testSetId: string
  totalRequired: number
  invoicesSent: number
  invoicesAccepted: number
  creditNotesSent: number
  creditNotesAccepted: number
  debitNotesSent: number
  debitNotesAccepted: number
  status: 'in_progress' | 'completed' | 'failed'
  logs: Array<{ step: string; status: string; document: string; cufe?: string; message: string }>
}

/**
 * Ejecuta el Set de Pruebas de Habilitación de la DIAN para el software
 */
export async function runDianTestSet(tenantId: string, testSetId: string): Promise<TestSetProgress> {
  const supabase = await createClient()

  // 1. Obtener configuración del tenant
  const { data: tSettings } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const emisor = {
    nit: tSettings?.tax_id || '901234567',
    dv: '1',
    businessName: tSettings?.business_name || 'EMPRESA PRUEBA HABILITACIÓN DIAN',
    tradeName: tSettings?.trade_name || 'Mr Tender Test',
    regime: '48' as const,
    personType: '1' as const,
    idType: '31' as const,
    email: tSettings?.email || 'test@mrtender.com',
    phone: tSettings?.phone || '3001234567',
    address: tSettings?.address || 'Calle 100 # 15-20',
    city: 'Bogotá',
    state: 'Bogotá D.C.',
    country: 'Colombia',
    softwareId: tSettings?.dian_software_id || 'soft-test-01',
    softwarePin: '12345'
  }

  const resolution = {
    resolutionNumber: '18760000001',
    prefix: 'SETP',
    fromNumber: 990000000,
    toNumber: 995000000,
    currentNumber: 990000001,
    validFrom: '2026-01-01',
    validTo: '2027-12-31',
    technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
    environment: '2' as const
  }

  const progress: TestSetProgress = {
    testSetId,
    totalRequired: 10,
    invoicesSent: 0,
    invoicesAccepted: 0,
    creditNotesSent: 0,
    creditNotesAccepted: 0,
    debitNotesSent: 0,
    debitNotesAccepted: 0,
    status: 'in_progress',
    logs: []
  }

  let lastIssuedInvoiceNumber = ''
  let lastIssuedInvoiceCufe = ''

  // 2. Emitir 8 Facturas de Prueba con diferentes combinaciones tributarias
  for (let i = 1; i <= 8; i++) {
    const folio = 990000000 + i
    const docNumber = `SETP${folio}`
    const hasIva19 = i % 2 === 0
    const hasIva5 = i === 3 || i === 7

    const baseAmount = 50000 * i
    const iva19Amount = hasIva19 ? baseAmount * 0.19 : 0
    const iva5Amount = hasIva5 ? baseAmount * 0.05 : 0
    const totalTax = iva19Amount + iva5Amount
    const totalPayable = baseAmount + totalTax

    const invoicePayload: DianInvoicePayload = {
      documentType: '01',
      number: docNumber,
      prefix: 'SETP',
      folio,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().split(' ')[0] + '-05:00',
      currency: 'COP',
      environment: '2',
      resolution,
      emisor,
      adquiriente: {
        id: `10${i}0203040`,
        idType: '13',
        name: `Cliente Set Pruebas DIAN ${i}`,
        personType: '2',
        regime: '49',
        city: 'Bogotá',
        state: 'Bogotá D.C.',
        address: 'Carrera 7 # 32-10'
      },
      paymentMeans: {
        code: i % 2 === 0 ? '10' : '48',
        name: i % 2 === 0 ? 'Efectivo' : 'Transferencia Electrónica',
        isCredit: false
      },
      items: [
        {
          id: `item-test-${i}`,
          sku: `SKU-SET-${i}`,
          name: `Producto Prueba DIAN Caso ${i}`,
          quantity: 1,
          unitCode: 'EA',
          unitPrice: baseAmount,
          subtotal: baseAmount,
          taxes: [
            {
              taxCode: '01',
              taxName: 'IVA',
              taxRate: hasIva19 ? 19 : hasIva5 ? 5 : 0,
              taxableAmount: baseAmount,
              taxAmount: totalTax
            }
          ],
          total: totalPayable
        }
      ],
      totals: {
        lineExtensionAmount: baseAmount,
        taxExclusiveAmount: baseAmount,
        taxInclusiveAmount: totalPayable,
        allowanceTotalAmount: 0,
        payableAmount: totalPayable,
        taxBreakdown: {
          iva19: { base: hasIva19 ? baseAmount : 0, tax: iva19Amount },
          iva5: { base: hasIva5 ? baseAmount : 0, tax: iva5Amount },
          iva0: { base: (!hasIva19 && !hasIva5) ? baseAmount : 0, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax
        }
      }
    }

    const { xml, cufe, qrData } = buildInvoiceUblXml(invoicePayload)
    const dianRes = await dianClient.sendDocument({
      environment: '2',
      xmlContent: xml,
      fileName: `face_f${emisor.nit}00021${String(folio).padStart(10, '0')}`,
      testSetId
    })

    progress.invoicesSent++
    if (dianRes.success) {
      progress.invoicesAccepted++
      lastIssuedInvoiceNumber = docNumber
      lastIssuedInvoiceCufe = cufe
      progress.logs.push({
        step: `Factura ${i}/8`,
        document: docNumber,
        status: 'Aceptada',
        cufe,
        message: dianRes.statusMessage || 'Validada exitosamente'
      })
    } else {
      progress.logs.push({
        step: `Factura ${i}/8`,
        document: docNumber,
        status: 'Rechazada',
        message: dianRes.statusMessage || 'Error al validar'
      })
    }
  }

  // 3. Emitir 1 Nota Crédito de Prueba
  if (lastIssuedInvoiceNumber) {
    const ncPayload: DianCreditNotePayload = {
      creditNoteNumber: 'NC-990000001',
      prefix: 'NC',
      folio: 990000001,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().split(' ')[0] + '-05:00',
      environment: '2',
      resolution,
      emisor,
      adquiriente: {
        id: '1010203040',
        idType: '13',
        name: 'Cliente Set Pruebas DIAN 1',
        personType: '2',
        regime: '49'
      },
      billingReference: {
        invoiceNumber: lastIssuedInvoiceNumber,
        invoiceCufe: lastIssuedInvoiceCufe,
        invoiceIssueDate: new Date().toISOString().split('T')[0]
      },
      discrepancyResponse: {
        code: '2',
        description: 'Anulación de factura de prueba DIAN'
      },
      items: [
        {
          id: 'item-nc-1',
          sku: 'SKU-SET-1',
          name: 'Anulación de ítem prueba',
          quantity: 1,
          unitCode: 'EA',
          unitPrice: 50000,
          subtotal: 50000,
          taxes: [],
          total: 50000
        }
      ],
      totals: {
        lineExtensionAmount: 50000,
        taxExclusiveAmount: 50000,
        taxInclusiveAmount: 50000,
        allowanceTotalAmount: 0,
        payableAmount: 50000,
        taxBreakdown: {
          iva19: { base: 0, tax: 0 },
          iva5: { base: 0, tax: 0 },
          iva0: { base: 50000, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax: 0
        }
      }
    }

    const { xml, cude } = buildCreditNoteUblXml(ncPayload)
    const dianRes = await dianClient.sendDocument({
      environment: '2',
      xmlContent: xml,
      fileName: `nc_f${emisor.nit}000210000000001`,
      testSetId
    })

    progress.creditNotesSent++
    if (dianRes.success) {
      progress.creditNotesAccepted++
      progress.logs.push({
        step: 'Nota Crédito 1/1',
        document: 'NC-990000001',
        status: 'Aceptada',
        cufe: cude,
        message: 'Nota crédito de prueba aprobada'
      })
    }
  }

  // 4. Determinar estado final del set de pruebas
  const allPassed = progress.invoicesAccepted >= 8 && progress.creditNotesAccepted >= 1
  progress.status = allPassed ? 'completed' : 'failed'

  // 5. Guardar en base de datos
  await supabase.from('dian_test_sets').insert([{
    tenant_id: tenantId,
    test_set_id: testSetId,
    status: progress.status,
    invoices_required: 8,
    invoices_sent: progress.invoicesSent,
    invoices_accepted: progress.invoicesAccepted,
    credit_notes_required: 1,
    credit_notes_sent: progress.creditNotesSent,
    credit_notes_accepted: progress.creditNotesAccepted,
    logs: progress.logs
  }])

  return progress
}
