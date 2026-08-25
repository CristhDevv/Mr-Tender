import QRCode from 'qrcode'
import { DianInvoicePayload } from './types'
import { formatDianAmount } from './cufe'

export interface DianQrParams {
  numFac: string
  fecFac: string
  horFac: string
  nitFac: string
  docAdq: string
  valFac: number
  valIva: number
  valOtroIm?: number
  valTolFac: number
  cufe: string
  environment: '1' | '2'
}

/**
 * Genera la URL oficial de consulta en el catálogo de la DIAN
 */
export function getDianVerificationUrl(cufe: string, environment: '1' | '2' = '2'): string {
  // En producción y habilitación la DIAN dispone el catálogo web
  return `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`
}

/**
 * Construye la cadena formateada de metadatos para el código QR de la DIAN
 * según el Anexo Técnico 1.9
 */
export function buildDianQrString(params: DianQrParams): string {
  const url = getDianVerificationUrl(params.cufe, params.environment)
  const valFac = formatDianAmount(params.valFac)
  const valIva = formatDianAmount(params.valIva)
  const valOtroIm = formatDianAmount(params.valOtroIm || 0)
  const valTolFac = formatDianAmount(params.valTolFac)

  return [
    `NumFac: ${params.numFac}`,
    `FecFac: ${params.fecFac}`,
    `HoraFac: ${params.horFac}`,
    `NitFac: ${params.nitFac}`,
    `DocAdq: ${params.docAdq}`,
    `ValFac: ${valFac}`,
    `ValIva: ${valIva}`,
    `ValOtroIm: ${valOtroIm}`,
    `ValTolFac: ${valTolFac}`,
    `CUFE: ${params.cufe}`,
    `QRCode: ${url}`
  ].join('\n')
}

/**
 * Genera una imagen Data URL (base64 PNG) del código QR oficial de la DIAN
 */
export async function generateDianQrDataUrl(qrTextOrUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(qrTextOrUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Error generating QR Data URL:', err)
    return ''
  }
}

/**
 * Genera un SVG en texto del código QR
 */
export async function generateDianQrSvg(qrTextOrUrl: string): Promise<string> {
  try {
    return await QRCode.toString(qrTextOrUrl, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1
    })
  } catch (err) {
    console.error('Error generating QR SVG:', err)
    return ''
  }
}
