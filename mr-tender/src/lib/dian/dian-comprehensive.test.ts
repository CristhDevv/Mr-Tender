import { describe, it, expect } from 'vitest'
import {
  calculateCUFE,
  calculateCUDE,
  calculateNITVerificationDigit,
  calculateSoftwareSecurityCode
} from './cufe'
import { calculateCUNE } from './payroll-cune'
import { calculateCUDS } from './support-doc-cuds'
import { buildInvoiceUblXml, buildCreditNoteUblXml } from './ubl-builder'
import { DianInvoicePayload } from './types'

describe('DIAN Fiscal Engine Comprehensive Test Suite', () => {
  describe('1. Algoritmo de Dígito de Verificación (Módulo 11)', () => {
    it('calcula correctamente el DV para NITs conocidos en Colombia', () => {
      // 901.234.567 -> DV: 7 (Fórmula oficial DIAN Anexo 1.9)
      expect(calculateNITVerificationDigit('901234567')).toBe('7')
      // 800.197.268 -> DV: 4 (DIAN)
      expect(calculateNITVerificationDigit('800197268')).toBe('4')
      // 860.002.964 -> DV: 4
      expect(calculateNITVerificationDigit('860002964')).toBe('4')
      // Formato con puntos o guiones: 900.123.456 -> DV: 8
      expect(calculateNITVerificationDigit('900.123.456')).toBe('8')
    })
  })

  describe('2. Algoritmos Criptográficos SHA-384 (CUFE, CUDE, CUNE, CUDS)', () => {
    it('calcula el CUFE con formato SHA-384 de 96 caracteres hexadecimales', () => {
      const { cufe, rawString } = calculateCUFE({
        numFac: 'SETP990000001',
        fecFac: '2026-08-26',
        horFac: '11:00:00-05:00',
        valFac: 100000.00,
        codImp1: '01',
        valImp1: 19000.00,
        codImp2: '04',
        valImp2: 0.00,
        codImp3: '03',
        valImp3: 0.00,
        valTot: 119000.00,
        nitOFE: '901234567',
        numAdq: '222222222222',
        claveTecnica: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
        tipoAmbiente: '2'
      })

      expect(cufe).toHaveLength(96)
      expect(rawString).toContain('SETP990000001')
      expect(rawString).toContain('100000.000119000.00')
      expect(rawString).toContain('119000.00')
      expect(rawString).toContain('901234567')
    })

    it('calcula el CUDE para Notas Crédito con PIN de Software', () => {
      const { cude, rawString } = calculateCUDE({
        numDoc: 'NC-001',
        fecDoc: '2026-08-26',
        horDoc: '11:00:00-05:00',
        valDoc: 50000.00,
        codImp1: '01',
        valImp1: 9500.00,
        codImp2: '04',
        valImp2: 0.00,
        codImp3: '03',
        valImp3: 0.00,
        valTot: 59500.00,
        nitOFE: '901234567',
        numAdq: '12345678',
        pinSoftware: '12345',
        tipoAmbiente: '2'
      })

      expect(cude).toHaveLength(96)
      expect(rawString).toContain('NC-001')
      expect(rawString).toContain('123452')
    })

    it('calcula el CUNE para Nómina Electrónica conforme a Res. 000013', () => {
      const { cune, rawString } = calculateCUNE({
        numNom: 'NOM-101',
        fecNom: '2026-08-26',
        horNom: '12:00:00-05:00',
        valDev: 2000000.00,
        valDed: 160000.00,
        valTol: 1840000.00,
        nitOFE: '901234567',
        docEmp: '1020304050',
        pinSoftware: '12345',
        tipoAmbiente: '2'
      })

      expect(cune).toHaveLength(96)
      expect(rawString).toContain('NOM-101')
      expect(rawString).toContain('2000000.00')
      expect(rawString).toContain('160000.00')
      expect(rawString).toContain('1840000.00')
    })

    it('calcula el CUDS para Documento Soporte Electrónico', () => {
      const { cuds, rawString } = calculateCUDS({
        numDoc: 'DS-501',
        fecDoc: '2026-08-26',
        horDoc: '10:30:00-05:00',
        valBruto: 500000.00,
        valRetFuente: 20000.00,
        valRetIca: 4800.00,
        valTotal: 475200.00,
        nitAdquiriente: '901234567',
        docProveedor: '79888999',
        pinSoftware: '12345',
        tipoAmbiente: '2'
      })

      expect(cuds).toHaveLength(96)
      expect(rawString).toContain('DS-501')
      expect(rawString).toContain('500000.00')
      expect(rawString).toContain('475200.00')
    })
  })

  describe('3. Generación UBL 2.1 XML y Estándares DIAN', () => {
    it('construye XML UBL 2.1 válido con namespaces, CUFE, QR y SoftwareSecurityCode', () => {
      const payload: DianInvoicePayload = {
        documentType: '01',
        number: 'SETP990000001',
        prefix: 'SETP',
        folio: 990000001,
        issueDate: '2026-08-26',
        issueTime: '11:00:00-05:00',
        currency: 'COP',
        environment: '2',
        resolution: {
          resolutionNumber: '18760000001',
          prefix: 'SETP',
          fromNumber: 990000000,
          toNumber: 995000000,
          currentNumber: 990000001,
          validFrom: '2026-01-01',
          validTo: '2027-12-31',
          technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
          environment: '2'
        },
        emisor: {
          nit: '901234567',
          dv: '1',
          businessName: 'EMPRESA PRUEBA S.A.S.',
          regime: '48',
          personType: '1',
          idType: '31',
          email: 'factura@empresa.com',
          phone: '3001234567',
          address: 'Calle 100',
          city: 'Bogotá',
          state: 'Bogotá D.C.',
          country: 'Colombia',
          softwareId: 'soft-01',
          softwarePin: '12345'
        },
        adquiriente: {
          id: '222222222222',
          idType: '13',
          name: 'Consumidor Final',
          personType: '2',
          regime: '49'
        },
        paymentMeans: {
          code: '10',
          name: 'Efectivo',
          isCredit: false
        },
        items: [
          {
            id: '1',
            sku: 'SKU-001',
            name: 'Producto Gravado 19%',
            quantity: 2,
            unitCode: 'EA',
            unitPrice: 50000,
            subtotal: 100000,
            taxes: [
              {
                taxCode: '01',
                taxName: 'IVA',
                taxRate: 19,
                taxableAmount: 100000,
                taxAmount: 19000
              }
            ],
            total: 119000
          }
        ],
        totals: {
          lineExtensionAmount: 100000,
          taxExclusiveAmount: 100000,
          taxInclusiveAmount: 119000,
          allowanceTotalAmount: 0,
          payableAmount: 119000,
          taxBreakdown: {
            iva19: { base: 100000, tax: 19000 },
            iva5: { base: 0, tax: 0 },
            iva0: { base: 0, tax: 0 },
            inc: { base: 0, tax: 0 },
            totalTax: 19000
          }
        }
      }

      const { xml, cufe, qrData } = buildInvoiceUblXml(payload)

      expect(xml).toContain('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"')
      expect(xml).toContain('SETP990000001')
      expect(xml).toContain(cufe)
      expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2')
      expect(qrData).toContain('https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=')
    })
  })
})
