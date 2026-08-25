import { describe, it, expect } from 'vitest'
import { buildInvoiceUblXml, buildCreditNoteUblXml } from './ubl-builder'
import { DianInvoicePayload, DianCreditNotePayload } from './types'

describe('DIAN UBL 2.1 Builder (ubl-builder.ts)', () => {
  const mockInvoicePayload: DianInvoicePayload = {
    documentType: '01',
    number: 'SETP990000001',
    prefix: 'SETP',
    folio: 990000001,
    issueDate: '2026-08-25',
    issueTime: '09:30:00-05:00',
    currency: 'COP',
    environment: '2',
    resolution: {
      resolutionNumber: '18760000001',
      prefix: 'SETP',
      fromNumber: 1,
      toNumber: 5000,
      currentNumber: 1,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
      environment: '2'
    },
    emisor: {
      nit: '901234567',
      dv: '1',
      businessName: 'MR TENDER S.A.S.',
      tradeName: 'Mr Tender',
      regime: '48',
      personType: '1',
      idType: '31',
      email: 'facturacion@mrtender.com',
      phone: '3001234567',
      address: 'Calle 100 # 15-20',
      city: 'Bogotá',
      state: 'Bogotá D.C.',
      country: 'Colombia',
      softwareId: 'soft-uuid-12345',
      softwarePin: '12345'
    },
    adquiriente: {
      id: '222222222222',
      idType: '13',
      name: 'Consumidor Final',
      personType: '2',
      regime: '49',
      city: 'Bogotá',
      state: 'Bogotá D.C.',
      address: 'Mostrador'
    },
    paymentMeans: {
      code: '10',
      name: 'Efectivo',
      isCredit: false
    },
    items: [
      {
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Arroz Diana 1kg',
        quantity: 2,
        unitCode: 'EA',
        unitPrice: 5000,
        subtotal: 10000,
        taxes: [
          {
            taxCode: '01',
            taxName: 'IVA',
            taxRate: 0,
            taxableAmount: 10000,
            taxAmount: 0
          }
        ],
        total: 10000
      },
      {
        id: 'prod-2',
        sku: 'SKU-002',
        name: 'Gaseosa Coca Cola 1.5L',
        quantity: 1,
        unitCode: 'EA',
        unitPrice: 6000,
        subtotal: 5042.02,
        taxes: [
          {
            taxCode: '01',
            taxName: 'IVA',
            taxRate: 19,
            taxableAmount: 5042.02,
            taxAmount: 957.98
          }
        ],
        total: 6000
      }
    ],
    totals: {
      lineExtensionAmount: 15042.02,
      taxExclusiveAmount: 15042.02,
      taxInclusiveAmount: 16000,
      allowanceTotalAmount: 0,
      payableAmount: 16000,
      taxBreakdown: {
        iva19: { base: 5042.02, tax: 957.98 },
        iva5: { base: 0, tax: 0 },
        iva0: { base: 10000, tax: 0 },
        inc: { base: 0, tax: 0 },
        totalTax: 957.98
      }
    }
  }

  it('generates compliant UBL 2.1 XML with CUFE and DIAN extensions', () => {
    const result = buildInvoiceUblXml(mockInvoicePayload)
    expect(result.xml).toBeDefined()
    expect(result.cufe).toHaveLength(96)
    expect(result.qrData).toContain('SETP990000001')
    expect(result.qrData).toContain(result.cufe)
    expect(result.xml).toContain('<cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>')
    expect(result.xml).toContain('<cbc:CustomizationID>10</cbc:CustomizationID>')
    expect(result.xml).toContain('<cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>')
    expect(result.xml).toContain('<cbc:UUID schemeID="2" schemeName="CUFE-SHA384">' + result.cufe + '</cbc:UUID>')
    expect(result.xml).toContain('<sts:InvoiceAuthorization>18760000001</sts:InvoiceAuthorization>')
    expect(result.xml).toContain('<cac:AccountingSupplierParty>')
    expect(result.xml).toContain('<cac:AccountingCustomerParty>')
    expect(result.xml).toContain('<cac:InvoiceLine>')
  })

  it('generates compliant Credit Note UBL 2.1 XML with CUDE', () => {
    const mockCreditNote: DianCreditNotePayload = {
      creditNoteNumber: 'NC-001',
      prefix: 'NC',
      folio: 1,
      issueDate: '2026-08-25',
      issueTime: '10:00:00-05:00',
      environment: '2',
      resolution: mockInvoicePayload.resolution,
      emisor: mockInvoicePayload.emisor,
      adquiriente: mockInvoicePayload.adquiriente,
      billingReference: {
        invoiceNumber: 'SETP990000001',
        invoiceCufe: 'a'.repeat(96),
        invoiceIssueDate: '2026-08-25'
      },
      discrepancyResponse: {
        code: '2',
        description: 'Anulación de factura electrónica'
      },
      items: mockInvoicePayload.items,
      totals: mockInvoicePayload.totals
    }

    const result = buildCreditNoteUblXml(mockCreditNote)
    expect(result.xml).toBeDefined()
    expect(result.cude).toHaveLength(96)
    expect(result.xml).toContain('<CreditNote')
    expect(result.xml).toContain('<cbc:CreditNoteTypeCode>91</cbc:CreditNoteTypeCode>')
    expect(result.xml).toContain('<cac:DiscrepancyResponse>')
    expect(result.xml).toContain('<cac:BillingReference>')
  })
})
