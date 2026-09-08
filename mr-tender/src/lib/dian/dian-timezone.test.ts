import { describe, it, expect } from 'vitest'
import { getColombiaDateString, getColombiaTimeString } from '../date-utils'
import { buildInvoiceUblXml, buildCreditNoteUblXml } from './ubl-builder'
import { DianInvoicePayload, DianCreditNotePayload } from './types'

describe('DIAN Electronic Invoicing Timezone & Validation Tests', () => {
  const dummyEmisor = {
    nit: '901234567',
    dv: '1',
    businessName: 'MR TENDER S.A.S.',
    tradeName: 'Mr Tender',
    regime: '48' as const,
    personType: '1' as const,
    idType: '31' as const,
    address: 'Calle 100 # 15-20',
    city: 'Bogotá',
    cityCode: '11001',
    state: 'Bogotá D.C.',
    stateCode: '11',
    country: 'Colombia',
    countryCode: 'CO',
    phone: '3001234567',
    email: 'factura@mrtender.co',
    postalCode: '110111',
    softwareId: 'dian-soft-test',
    softwarePin: '12345'
  }

  const dummyAdquiriente = {
    id: '222222222222',
    idType: '13' as const,
    name: 'Consumidor Final',
    personType: '2' as const,
    regime: '49' as const
  }

  const dummyResolution = {
    resolutionNumber: '18760000001',
    prefix: 'SETP',
    fromNumber: 1,
    toNumber: 50000,
    currentNumber: 101,
    validFrom: '2026-01-01',
    validTo: '2027-12-31',
    technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
    environment: '2' as const
  }

  it('builds valid UBL XML with Colombia local date and time even for evening transactions', () => {
    // Evening sale: 7:45 PM COT on Sept 8 (00:45 UTC Sept 9)
    const mockNightTimestamp = '2026-09-09T00:45:30.000Z'
    const issueDate = getColombiaDateString(mockNightTimestamp)
    const issueTime = getColombiaTimeString(mockNightTimestamp)

    expect(issueDate).toBe('2026-09-08')
    expect(issueTime).toBe('19:45:30-05:00')

    const invoicePayload: DianInvoicePayload = {
      documentType: '01',
      number: 'SETP-101',
      prefix: 'SETP',
      folio: 101,
      issueDate,
      issueTime,
      currency: 'COP',
      environment: '2',
      resolution: dummyResolution,
      emisor: dummyEmisor,
      adquiriente: dummyAdquiriente,
      paymentMeans: {
        code: '10',
        name: 'Efectivo',
        isCredit: false
      },
      totals: {
        lineExtensionAmount: 50000,
        taxExclusiveAmount: 50000,
        taxInclusiveAmount: 59500,
        allowanceTotalAmount: 0,
        payableAmount: 59500,
        taxBreakdown: {
          iva19: { base: 50000, tax: 9500 },
          iva5: { base: 0, tax: 0 },
          iva0: { base: 0, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax: 9500
        }
      },
      items: [
        {
          id: 'item-1',
          sku: 'SKU-001',
          name: 'Producto Nocturno',
          quantity: 1,
          unitCode: 'EA',
          unitPrice: 50000,
          subtotal: 50000,
          total: 59500,
          taxes: [{ taxCode: '01', taxName: 'IVA', taxRate: 19, taxableAmount: 50000, taxAmount: 9500 }]
        }
      ]
    }

    const { xml, cufe } = buildInvoiceUblXml(invoicePayload)

    expect(xml).toContain('<cbc:IssueDate>2026-09-08</cbc:IssueDate>')
    expect(xml).toContain('<cbc:IssueTime>19:45:30-05:00</cbc:IssueTime>')
    expect(cufe).toHaveLength(96) // SHA-384 hex
  })

  it('builds valid Credit Note UBL XML referencing invoice with Colombia dates', () => {
    const mockNightTimestamp = '2026-09-09T01:15:00.000Z' // 8:15 PM COT
    const issueDate = getColombiaDateString(mockNightTimestamp)
    const issueTime = getColombiaTimeString(mockNightTimestamp)

    const ncPayload: DianCreditNotePayload = {
      creditNoteNumber: 'NC-201',
      prefix: 'NC',
      folio: 201,
      issueDate,
      issueTime,
      environment: '2',
      resolution: dummyResolution,
      emisor: dummyEmisor,
      adquiriente: dummyAdquiriente,
      billingReference: {
        invoiceNumber: 'SETP-101',
        invoiceCufe: 'a'.repeat(96),
        invoiceIssueDate: getColombiaDateString('2026-09-08T15:00:00Z')
      },
      discrepancyResponse: {
        code: '2',
        description: 'Anulación de factura electrónica nocturna'
      },
      items: [
        {
          id: 'item-1',
          sku: 'SKU-001',
          name: 'Producto Nocturno',
          quantity: 1,
          unitCode: 'EA',
          unitPrice: 50000,
          subtotal: 50000,
          total: 50000,
          taxes: []
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
          iva0: { base: 0, tax: 0 },
          inc: { base: 0, tax: 0 },
          totalTax: 0
        }
      }
    }

    const { xml, cude } = buildCreditNoteUblXml(ncPayload)

    expect(xml).toContain('<cbc:IssueDate>2026-09-08</cbc:IssueDate>')
    expect(xml).toContain('<cbc:IssueTime>20:15:00-05:00</cbc:IssueTime>')
    expect(xml).toContain('<cbc:IssueDate>2026-09-08</cbc:IssueDate>')
    expect(cude).toHaveLength(96) // CUDE SHA-384
  })
})
