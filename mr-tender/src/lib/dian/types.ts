/**
 * Tipos e Interfaces para Facturación Electrónica DIAN (Colombia)
 * Conforme al Anexo Técnico 1.9 y Resolución 000165 de 2023
 */

export type DianDocumentType = 
  | '01' // Factura Electrónica de Venta Nacional
  | '02' // Factura Electrónica de Exportación
  | '03' // Factura Electrónica de Contingencia Facturador
  | '04' // Factura Electrónica de Contingencia DIAN
  | '91' // Nota Crédito
  | '92' // Nota Débito
  | 'POS' // Documento Equivalente Electrónico POS

export type DianEnvironment = '1' | '2' // 1: Producción, 2: Habilitación / Pruebas

export type DianDocStatus = 
  | 'draft'
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'contingency'

export type DianIdType = 
  | '13' // Cédula de ciudadanía
  | '31' // NIT (Número de Identificación Tributaria)
  | '22' // Cédula de extranjería
  | '41' // Pasaporte
  | '11' // Registro civil
  | '12' // Tarjeta de identidad
  | '42' // Documento de identificación extranjero

export type DianTaxRegime = 
  | '48' // Responsable de IVA (Régimen Común)
  | '49' // No Responsable de IVA (Régimen Simplificado)
  | '04' // Régimen Simple de Tributación (RST)

export type DianPersonType = 
  | '1' // Persona Jurídica y asimiladas
  | '2' // Persona Natural y asimiladas

export type DianPaymentMethod = 
  | '10' // Efectivo
  | '48' // Transferencia Débito / Tarjeta de Débito / Nequi / Daviplata / Bre-B
  | '49' // Tarjeta Débito
  | '48' // Tarjeta de Crédito
  | '1'  // Instrumento no definido / Crédito / Fiao
  | 'ZZZ' // Acuerdo mutuo

export interface DianEmisor {
  nit: string
  dv: string // Dígito de verificación (0-9)
  businessName: string
  tradeName?: string
  regime: DianTaxRegime
  personType: DianPersonType
  idType: DianIdType
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postalCode?: string
  // DIAN Software authorization credentials
  softwareId?: string
  softwarePin?: string
  technicalKey?: string
}

export interface DianAdquiriente {
  id: string
  idType: DianIdType
  dv?: string
  name: string
  personType: DianPersonType
  regime: DianTaxRegime
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
}

export interface DianTaxItem {
  taxCode: '01' | '04' | '03' // 01: IVA, 04: INC (Consumo), 03: ICA
  taxName: string
  taxRate: number // ej. 19.00 o 5.00 o 0.00
  taxableAmount: number // Base imponible
  taxAmount: number // Valor del impuesto
}

export interface DianItem {
  id: string
  sku: string
  name: string
  quantity: number
  unitCode: string // ej. 'EA' (Unidad), 'KGM' (Kilo), etc.
  unitPrice: number
  standardPrice?: number
  discountRate?: number
  discountAmount?: number
  subtotal: number // (quantity * unitPrice) - discountAmount
  taxes: DianTaxItem[]
  total: number // subtotal + sum(taxAmount)
  brandName?: string
  modelName?: string
}

export interface DianResolutionConfig {
  resolutionNumber: string
  prefix: string
  fromNumber: number
  toNumber: number
  currentNumber: number
  validFrom: string // YYYY-MM-DD
  validTo: string // YYYY-MM-DD
  technicalKey: string
  environment: DianEnvironment
}

export interface DianInvoicePayload {
  documentType: DianDocumentType
  number: string // Consecutivo completo con prefijo, ej. 'SETP990000001' o 'FE-1020'
  prefix: string
  folio: number
  issueDate: string // YYYY-MM-DD
  issueTime: string // HH:mm:ss-05:00
  currency: string // 'COP'
  operationType?: '10' // 10: Estándar
  environment: DianEnvironment
  resolution: DianResolutionConfig
  emisor: DianEmisor
  adquiriente: DianAdquiriente
  paymentMeans: {
    code: DianPaymentMethod
    name: string
    isCredit: boolean
    dueDate?: string // YYYY-MM-DD
  }
  items: DianItem[]
  totals: {
    lineExtensionAmount: number // Suma de subtotales de ítems
    taxExclusiveAmount: number // Base gravable total
    taxInclusiveAmount: number // Total con impuestos
    allowanceTotalAmount: number // Total descuentos
    payableAmount: number // Total a pagar
    taxBreakdown: {
      iva19: { base: number; tax: number }
      iva5: { base: number; tax: number }
      iva0: { base: number; tax: number }
      inc: { base: number; tax: number }
      totalTax: number
    }
  }
  notes?: string
}

export interface DianCreditNotePayload {
  creditNoteNumber: string
  prefix: string
  folio: number
  issueDate: string
  issueTime: string
  environment: DianEnvironment
  emisor: DianEmisor
  adquiriente: DianAdquiriente
  billingReference: {
    invoiceNumber: string
    invoiceCufe: string
    invoiceIssueDate: string
  }
  discrepancyResponse: {
    code: '1' | '2' | '3' | '4' | '5' // 1: Devolución parcial, 2: Anulación de factura, 3: Rebaja total/parcial, 4: Ajuste de precio, 5: Otros
    description: string
  }
  items: DianItem[]
  totals: DianInvoicePayload['totals']
  resolution: DianResolutionConfig
}

export interface DianDebitNotePayload {
  debitNoteNumber: string
  prefix: string
  folio: number
  issueDate: string
  issueTime: string
  environment: DianEnvironment
  emisor: DianEmisor
  adquiriente: DianAdquiriente
  billingReference: {
    invoiceNumber: string
    invoiceCufe: string
    invoiceIssueDate: string
  }
  discrepancyResponse: {
    code: '1' | '2' | '3' | '4' // 1: Intereses, 2: Gastos por cobrar, 3: Cambio del valor, 4: Otros
    description: string
  }
  items: DianItem[]
  totals: DianInvoicePayload['totals']
  resolution: DianResolutionConfig
}

export interface CufeCalculationParams {
  numFac: string // Número completo con prefijo
  fecFac: string // YYYY-MM-DD
  horFac: string // HH:mm:ss-05:00
  valFac: number // Total base antes de impuestos
  codImp1: string // '01' (IVA)
  valImp1: number // Valor IVA
  codImp2: string // '04' (INC)
  valImp2: number // Valor INC
  codImp3: string // '03' (ICA)
  valImp3: number // Valor ICA
  valTot: number // Total de la factura
  nitOFE: string // NIT emisor sin DV
  numAdq: string // Documento adquiriente
  claveTecnica: string
  tipoAmbiente: DianEnvironment
}

export interface CudeCalculationParams {
  numDoc: string
  fecDoc: string
  horDoc: string
  valDoc: number
  codImp1: string
  valImp1: number
  codImp2: string
  valImp2: number
  codImp3: string
  valImp3: number
  valTot: number
  nitOFE: string
  numAdq: string
  pinSoftware: string
  tipoAmbiente: DianEnvironment
}

export interface DianResponse {
  success: boolean
  cufe?: string
  trackId?: string
  status: DianDocStatus
  statusCode?: string
  statusMessage?: string
  dianXmlUrl?: string
  qrCodeUrl?: string
  qrCodeData?: string
  signedXml?: string
  rulesViolated?: Array<{ code: string; message: string; severity: 'error' | 'warning' }>
  rawResponse?: any
}
