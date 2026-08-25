import { createHash } from 'crypto'
import { CufeCalculationParams, CudeCalculationParams } from './types'

/**
 * Formatea un número monetario a string con 2 decimales fijos (ej: 12500.00)
 */
export function formatDianAmount(amount: number): string {
  return Number(amount || 0).toFixed(2)
}

/**
 * Calcula el Dígito de Verificación (DV) de un NIT según el algoritmo oficial
 * de la DIAN (Módulo 11 con pesos primos colombianos).
 */
export function calculateNITVerificationDigit(nit: string | number): string {
  const cleanNit = String(nit).replace(/\D/g, '')
  if (!cleanNit) return '0'

  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const len = cleanNit.length
  let sum = 0

  for (let i = 0; i < len; i++) {
    const digit = parseInt(cleanNit.charAt(len - 1 - i), 10)
    sum += digit * primes[i]
  }

  const remainder = sum % 11
  if (remainder === 0 || remainder === 1) {
    return String(remainder)
  }
  return String(11 - remainder)
}

/**
 * Calcula el Código Único de Factura Electrónica (CUFE)
 * Conforme al Anexo Técnico 1.9 de la DIAN.
 *
 * Fórmula:
 * CUFE = SHA-384(
 *   NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
 *   CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot +
 *   NitOFE + NumAdq + ClaveTecnica + TipoAmbiente
 * )
 */
export function calculateCUFE(params: CufeCalculationParams): { cufe: string; rawString: string } {
  const numFac = params.numFac.trim()
  const fecFac = params.fecFac.trim()
  const horFac = params.horFac.trim()
  const valFac = formatDianAmount(params.valFac)
  const codImp1 = params.codImp1 || '01'
  const valImp1 = formatDianAmount(params.valImp1)
  const codImp2 = params.codImp2 || '04'
  const valImp2 = formatDianAmount(params.valImp2)
  const codImp3 = params.codImp3 || '03'
  const valImp3 = formatDianAmount(params.valImp3)
  const valTot = formatDianAmount(params.valTot)
  const nitOFE = String(params.nitOFE).replace(/\D/g, '')
  const numAdq = String(params.numAdq).replace(/[^a-zA-Z0-9]/g, '')
  const claveTecnica = params.claveTecnica.trim()
  const tipoAmbiente = String(params.tipoAmbiente)

  const rawString = `${numFac}${fecFac}${horFac}${valFac}${codImp1}${valImp1}${codImp2}${valImp2}${codImp3}${valImp3}${valTot}${nitOFE}${numAdq}${claveTecnica}${tipoAmbiente}`

  const cufe = createHash('sha384').update(rawString, 'utf8').digest('hex').toLowerCase()

  return { cufe, rawString }
}

/**
 * Calcula el Código Único de Documento Electrónico (CUDE)
 * Usado para Documento Equivalente POS, Notas Crédito y Notas Débito.
 *
 * Fórmula:
 * CUDE = SHA-384(
 *   NumDoc + FecDoc + HorDoc + ValDoc + CodImp1 + ValImp1 +
 *   CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot +
 *   NitOFE + NumAdq + PinSoftware + TipoAmbiente
 * )
 */
export function calculateCUDE(params: CudeCalculationParams): { cude: string; rawString: string } {
  const numDoc = params.numDoc.trim()
  const fecDoc = params.fecDoc.trim()
  const horDoc = params.horDoc.trim()
  const valDoc = formatDianAmount(params.valDoc)
  const codImp1 = params.codImp1 || '01'
  const valImp1 = formatDianAmount(params.valImp1)
  const codImp2 = params.codImp2 || '04'
  const valImp2 = formatDianAmount(params.valImp2)
  const codImp3 = params.codImp3 || '03'
  const valImp3 = formatDianAmount(params.valImp3)
  const valTot = formatDianAmount(params.valTot)
  const nitOFE = String(params.nitOFE).replace(/\D/g, '')
  const numAdq = String(params.numAdq).replace(/[^a-zA-Z0-9]/g, '')
  const pinSoftware = params.pinSoftware.trim()
  const tipoAmbiente = String(params.tipoAmbiente)

  const rawString = `${numDoc}${fecDoc}${horDoc}${valDoc}${codImp1}${valImp1}${codImp2}${valImp2}${codImp3}${valImp3}${valTot}${nitOFE}${numAdq}${pinSoftware}${tipoAmbiente}`

  const cude = createHash('sha384').update(rawString, 'utf8').digest('hex').toLowerCase()

  return { cude, rawString }
}

/**
 * Calcula el SoftwareSecurityCode (Código de Seguridad de Software)
 * SHA-384(SoftwareID + PIN + NumFac)
 */
export function calculateSoftwareSecurityCode(softwareId: string, pin: string, invoiceNumber: string): string {
  const cleanStr = `${softwareId.trim()}${pin.trim()}${invoiceNumber.trim()}`
  return createHash('sha384').update(cleanStr, 'utf8').digest('hex').toLowerCase()
}
