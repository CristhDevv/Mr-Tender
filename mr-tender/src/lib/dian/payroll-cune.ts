import { createHash } from 'crypto'
import { formatDianAmount } from './cufe'

export interface CuneCalculationParams {
  numNom: string          // Consecutivo de nómina (ej: NOM-001)
  fecNom: string          // Fecha emisión (AAAA-MM-DD)
  horNom: string          // Hora emisión con offset (HH:mm:ss-05:00)
  valDev: number          // Valor Total Devengado
  valDed: number          // Valor Total Deducciones
  valTol: number          // Valor Total Comprobante (Devengado - Deducciones)
  nitOFE: string | number // NIT Empleador
  docEmp: string | number // Documento Empleado
  pinSoftware: string     // PIN Software DIAN (5 dígitos)
  tipoAmbiente: '1' | '2' // 1: Producción, 2: Habilitación / Pruebas
}

/**
 * Calcula el Código Único de Nómina Electrónica (CUNE)
 * Conforme a la Resolución 000013 y Anexo Técnico 1.0 de la DIAN.
 *
 * Fórmula:
 * CUNE = SHA-384(
 *   NumNom + FecNom + HorNom + ValDev + ValDed + ValTol +
 *   NitOFE + DocEmp + PinSoftware + TipoAmbiente
 * )
 */
export function calculateCUNE(params: CuneCalculationParams): { cune: string; rawString: string } {
  const numNom = params.numNom.trim()
  const fecNom = params.fecNom.trim()
  const horNom = params.horNom.trim()
  const valDev = formatDianAmount(params.valDev)
  const valDed = formatDianAmount(params.valDed)
  const valTol = formatDianAmount(params.valTol)
  const nitOFE = String(params.nitOFE).replace(/\D/g, '')
  const docEmp = String(params.docEmp).replace(/[^a-zA-Z0-9]/g, '')
  const pin = params.pinSoftware.trim()
  const ambiente = params.tipoAmbiente

  const rawString = `${numNom}${fecNom}${horNom}${valDev}${valDed}${valTol}${nitOFE}${docEmp}${pin}${ambiente}`
  const cune = createHash('sha384').update(rawString, 'utf8').digest('hex')

  return { cune, rawString }
}

/**
 * Genera la URL para el código QR de Nómina Electrónica DIAN
 */
export function generatePayrollQRCode(params: {
  numNom: string
  fecNom: string
  horNom: string
  nitOFE: string
  docEmp: string
  valDev: number
  valDed: number
  valTol: number
  cune: string
  tipoAmbiente: '1' | '2'
}): string {
  const baseUrl = params.tipoAmbiente === '1'
    ? 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey='
    : 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey='
  return `${baseUrl}${params.cune}`
}
