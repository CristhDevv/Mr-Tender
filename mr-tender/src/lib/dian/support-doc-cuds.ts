import { createHash } from 'crypto'
import { formatDianAmount } from './cufe'

export interface CudsCalculationParams {
  numDoc: string          // Consecutivo del Documento Soporte (ej: DS-001)
  fecDoc: string          // Fecha de emisión (AAAA-MM-DD)
  horDoc: string          // Hora de emisión con offset (HH:mm:ss-05:00)
  valBruto: number        // Subtotal antes de retenciones
  valRetFuente: number    // Retención en la fuente practicada
  valRetIca: number       // Retención de ICA practicada
  valTotal: number        // Total a pagar al proveedor
  nitAdquiriente: string  // NIT Empresa
  docProveedor: string    // Cédula / NIT del no obligado a facturar
  pinSoftware: string     // PIN de Software DIAN
  tipoAmbiente: '1' | '2' // 1: Producción, 2: Habilitación
}

/**
 * Calcula el Código Único de Documento Soporte (CUDS)
 * Conforme a la Resolución 000167 y Anexo Técnico de la DIAN.
 *
 * Fórmula:
 * CUDS = SHA-384(
 *   NumDoc + FecDoc + HorDoc + ValBruto + ValRetFuente + ValRetIca + ValTotal +
 *   NitAdquiriente + DocProveedor + PinSoftware + TipoAmbiente
 * )
 */
export function calculateCUDS(params: CudsCalculationParams): { cuds: string; rawString: string } {
  const numDoc = params.numDoc.trim()
  const fecDoc = params.fecDoc.trim()
  const horDoc = params.horDoc.trim()
  const valBruto = formatDianAmount(params.valBruto)
  const valRetFuente = formatDianAmount(params.valRetFuente)
  const valRetIca = formatDianAmount(params.valRetIca)
  const valTotal = formatDianAmount(params.valTotal)
  const nitAdq = String(params.nitAdquiriente).replace(/\D/g, '')
  const docProv = String(params.docProveedor).replace(/[^a-zA-Z0-9]/g, '')
  const pin = params.pinSoftware.trim()
  const ambiente = params.tipoAmbiente

  const rawString = `${numDoc}${fecDoc}${horDoc}${valBruto}${valRetFuente}${valRetIca}${valTotal}${nitAdq}${docProv}${pin}${ambiente}`
  const cuds = createHash('sha384').update(rawString, 'utf8').digest('hex')

  return { cuds, rawString }
}

/**
 * Genera la URL para el código QR del Documento Soporte DIAN
 */
export function generateSupportDocQRCode(params: {
  numDoc: string
  fecDoc: string
  horDoc: string
  nitAdquiriente: string
  docProveedor: string
  valTotal: number
  cuds: string
  tipoAmbiente: '1' | '2'
}): string {
  const baseUrl = params.tipoAmbiente === '1'
    ? 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey='
    : 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey='
  return `${baseUrl}${params.cuds}`
}
