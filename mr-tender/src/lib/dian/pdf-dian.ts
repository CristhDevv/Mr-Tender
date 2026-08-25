import { jsPDF } from 'jspdf'
import { DianInvoicePayload, DianCreditNotePayload } from './types'
import { generateDianQrDataUrl, getDianVerificationUrl } from './qr'
import { formatCurrency } from '../utils'

/**
 * Genera la Representación Gráfica Oficial de la Factura Electrónica DIAN (Formato A4)
 */
export async function generateDianInvoicePdfA4(
  payload: DianInvoicePayload,
  cufe: string,
  qrDataOrUrl: string,
  dianStatus: string = 'Validada por la DIAN'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const { emisor, adquiriente, resolution, totals, items, paymentMeans } = payload

  // Generar imagen QR
  const qrDataUrl = await generateDianQrDataUrl(qrDataOrUrl || getDianVerificationUrl(cufe, payload.environment))

  // 1. Header Banner
  doc.setFillColor(15, 23, 42) // Slate-900
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(emisor.businessName || 'MR TENDER S.A.S.', 15, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`NIT: ${emisor.nit}-${emisor.dv}  |  Régimen: ${emisor.regime === '48' ? 'Responsable de IVA' : 'No Responsable de IVA'}`, 15, 20)
  doc.text(`${emisor.address} — ${emisor.city}, ${emisor.state} | Tel: ${emisor.phone}`, 15, 26)

  // Top Right Box: Factura Electrónica N°
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(140, 6, 60, 20, 2, 2, 'F')
  doc.setTextColor(56, 189, 248) // Sky blue
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA ELECTRÓNICA DE VENTA', 170, 12, { align: 'center' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.text(`N° ${payload.number}`, 170, 21, { align: 'center' })

  // 2. Resolution & Fiscal Meta Box
  let y = 38
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(15, y, 180, 14, 2, 2, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Autorización de Facturación DIAN N° ${resolution.resolutionNumber} de Vigencia: ${resolution.validFrom} al ${resolution.validTo}`, 18, y + 5)
  doc.text(`Rango Autorizado: Prefijo ${resolution.prefix} del ${resolution.fromNumber} al ${resolution.toNumber} | Ambiente: ${payload.environment === '1' ? 'Producción' : 'Habilitación (Pruebas)'} | Tipo de Operación: Estándar`, 18, y + 10)

  // 3. Emisor y Adquiriente Columns
  y = 57
  // Adquiriente Box
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(15, y, 105, 36, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('DATOS DEL ADQUIRIENTE (CLIENTE)', 18, y + 6)
  doc.setLineWidth(0.2)
  doc.line(18, y + 8, 115, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Razón Social / Nombre: ${adquiriente.name}`, 18, y + 14)
  doc.text(`Identificación / NIT: ${adquiriente.id}${adquiriente.dv ? '-' + adquiriente.dv : ''}`, 18, y + 20)
  doc.text(`Dirección: ${adquiriente.address || 'Mostrador'} - ${adquiriente.city || 'Colombia'}`, 18, y + 26)
  doc.text(`Tel / Email: ${adquiriente.phone || 'N/A'} | ${adquiriente.email || 'N/A'}`, 18, y + 32)

  // Invoice Dates & Payment Box
  doc.roundedRect(125, y, 70, 36, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('DETALLES DE LA EMISIÓN', 128, y + 6)
  doc.line(128, y + 8, 190, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Fecha Emisión: ${payload.issueDate}`, 128, y + 14)
  doc.text(`Hora Emisión: ${payload.issueTime}`, 128, y + 20)
  doc.text(`Forma de Pago: ${paymentMeans.isCredit ? 'Crédito' : 'Contado'}`, 128, y + 26)
  doc.text(`Medio de Pago: ${paymentMeans.name}`, 128, y + 32)

  // 4. Items Table
  y = 100
  doc.setFillColor(241, 245, 249)
  doc.rect(15, y, 180, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('Ítem / Descripción', 18, y + 5)
  doc.text('Cant.', 105, y + 5, { align: 'right' })
  doc.text('Vr. Unitario', 130, y + 5, { align: 'right' })
  doc.text('IVA %', 150, y + 5, { align: 'right' })
  doc.text('Total', 190, y + 5, { align: 'right' })

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)

  items.forEach((it, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252)
      doc.rect(15, y, 180, 6, 'F')
    }
    const mainTax = it.taxes[0] ? `${it.taxes[0].taxRate}%` : '0%'
    doc.text(it.name.slice(0, 48), 18, y + 4.5)
    doc.text(String(it.quantity), 105, y + 4.5, { align: 'right' })
    doc.text(`$${it.unitPrice.toLocaleString('es-CO')}`, 130, y + 4.5, { align: 'right' })
    doc.text(mainTax, 150, y + 4.5, { align: 'right' })
    doc.text(`$${it.total.toLocaleString('es-CO')}`, 190, y + 4.5, { align: 'right' })
    y += 6
  })

  // 5. Totals & Tax Breakdown
  y += 4
  const totalsY = y
  // Left: Tax Breakdown
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, totalsY, 105, 34, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('DISCRIMINACIÓN DE IMPUESTOS', 18, totalsY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`IVA 19% (Base: $${totals.taxBreakdown.iva19.base.toLocaleString('es-CO')}):`, 18, totalsY + 13)
  doc.text(`$${totals.taxBreakdown.iva19.tax.toLocaleString('es-CO')}`, 115, totalsY + 13, { align: 'right' })
  doc.text(`IVA 5% (Base: $${totals.taxBreakdown.iva5.base.toLocaleString('es-CO')}):`, 18, totalsY + 19)
  doc.text(`$${totals.taxBreakdown.iva5.tax.toLocaleString('es-CO')}`, 115, totalsY + 19, { align: 'right' })
  doc.text(`Operaciones Excluidas / Exentas (0%):`, 18, totalsY + 25)
  doc.text(`$${totals.taxBreakdown.iva0.base.toLocaleString('es-CO')}`, 115, totalsY + 25, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Impuestos Generados:`, 18, totalsY + 31)
  doc.text(`$${totals.taxBreakdown.totalTax.toLocaleString('es-CO')}`, 115, totalsY + 31, { align: 'right' })

  // Right: Legal Monetary Totals
  doc.roundedRect(125, totalsY, 70, 34, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Subtotal:', 128, totalsY + 8)
  doc.text(`$${totals.taxExclusiveAmount.toLocaleString('es-CO')}`, 190, totalsY + 8, { align: 'right' })
  doc.text('Descuentos:', 128, totalsY + 14)
  doc.text(`$${totals.allowanceTotalAmount.toLocaleString('es-CO')}`, 190, totalsY + 14, { align: 'right' })
  doc.text('Total Impuestos:', 128, totalsY + 20)
  doc.text(`$${totals.taxBreakdown.totalTax.toLocaleString('es-CO')}`, 190, totalsY + 20, { align: 'right' })
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(16, 185, 129) // Green
  doc.text('TOTAL A PAGAR:', 128, totalsY + 29)
  doc.text(`$${totals.payableAmount.toLocaleString('es-CO')}`, 190, totalsY + 29, { align: 'right' })

  // 6. CUFE, QR Code & DIAN Verification Footer
  y = totalsY + 42
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(15, y, 180, 44, 2, 2, 'FD')

  // Embed QR Image
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 18, y + 4, 34, 34)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('REPRESENTACIÓN GRÁFICA DE FACTURA ELECTRÓNICA DE VENTA', 56, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.text(`Estado DIAN: ${dianStatus}`, 56, y + 14)
  
  doc.setFont('helvetica', 'bold')
  doc.text('CUFE (Código Único de Factura Electrónica):', 56, y + 20)
  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(15, 23, 42)
  // Split CUFE in 2 lines if long
  doc.text(cufe.slice(0, 48), 56, y + 25)
  doc.text(cufe.slice(48), 56, y + 29)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Escanee el código QR para validar este documento directamente en el catálogo oficial de la DIAN.', 56, y + 36)
  doc.text('Emitido mediante Mr. Tender ERP & AI — Software Autorizado DIAN.', 56, y + 40)

  // Save PDF
  doc.save(`Factura_Electronica_${payload.number}.pdf`)
}

/**
 * Genera la Tirilla POS 80mm de Factura Electrónica DIAN / Documento Equivalente
 */
export async function generateDianInvoicePdfPos(
  payload: DianInvoicePayload,
  cufe: string,
  qrDataOrUrl: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 230]
  })

  const { emisor, adquiriente, resolution, totals, items, paymentMeans } = payload
  const qrDataUrl = await generateDianQrDataUrl(qrDataOrUrl || getDianVerificationUrl(cufe, payload.environment))

  let y = 8

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(emisor.businessName || 'MR TENDER', 40, y, { align: 'center' })
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`NIT: ${emisor.nit}-${emisor.dv}`, 40, y, { align: 'center' })
  y += 3.5
  doc.text(emisor.address || 'Colombia', 40, y, { align: 'center' })
  y += 3.5
  doc.text(`Tel: ${emisor.phone || ''}`, 40, y, { align: 'center' })
  y += 4.5

  // Resolution info
  doc.setFontSize(6.5)
  doc.text(`Res. DIAN N° ${resolution.resolutionNumber}`, 40, y, { align: 'center' })
  y += 3
  doc.text(`Prefijo ${resolution.prefix} del ${resolution.fromNumber} al ${resolution.toNumber}`, 40, y, { align: 'center' })
  y += 3
  doc.text(`Vigencia: ${resolution.validFrom} al ${resolution.validTo}`, 40, y, { align: 'center' })
  y += 4

  // Invoice Number
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`FACTURA ELECTRÓNICA N°: ${payload.number}`, 40, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Fecha: ${payload.issueDate} ${payload.issueTime}`, 40, y, { align: 'center' })
  y += 4

  // Line divider
  doc.setLineWidth(0.2)
  doc.line(4, y, 76, y)
  y += 3.5

  // Adquiriente
  doc.setFontSize(7)
  doc.text(`Cliente: ${adquiriente.name}`, 4, y)
  y += 3.5
  doc.text(`NIT/C.C.: ${adquiriente.id}`, 4, y)
  y += 4
  doc.line(4, y, 76, y)
  y += 4

  // Items
  doc.setFont('helvetica', 'bold')
  doc.text('Cant  Descripción', 4, y)
  doc.text('Total', 76, y, { align: 'right' })
  y += 3.5
  doc.line(4, y, 76, y)
  y += 3.5

  doc.setFont('helvetica', 'normal')
  items.forEach(it => {
    doc.text(`${it.quantity}x ${it.name.slice(0, 20)}`, 4, y)
    doc.text(`$${it.total.toLocaleString('es-CO')}`, 76, y, { align: 'right' })
    y += 3.5
  })

  doc.line(4, y, 76, y)
  y += 4

  // Totals
  doc.text('Subtotal:', 4, y)
  doc.text(`$${totals.taxExclusiveAmount.toLocaleString('es-CO')}`, 76, y, { align: 'right' })
  y += 3.5
  doc.text('Total IVA:', 4, y)
  doc.text(`$${totals.taxBreakdown.totalTax.toLocaleString('es-CO')}`, 76, y, { align: 'right' })
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('TOTAL:', 4, y)
  doc.text(`$${totals.payableAmount.toLocaleString('es-CO')}`, 76, y, { align: 'right' })
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Medio de Pago: ${paymentMeans.name}`, 4, y)
  y += 4

  // QR & CUFE
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 26, y, 28, 28)
    y += 30
  }

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.text('CUFE:', 40, y, { align: 'center' })
  y += 2.5
  doc.setFont('courier', 'normal')
  doc.text(cufe.slice(0, 36), 40, y, { align: 'center' })
  y += 2.5
  doc.text(cufe.slice(36, 72), 40, y, { align: 'center' })
  y += 2.5
  doc.text(cufe.slice(72), 40, y, { align: 'center' })
  y += 4

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.text('¡Gracias por su compra!', 40, y, { align: 'center' })
  y += 3
  doc.text('Mr. Tender ERP & Facturación DIAN', 40, y, { align: 'center' })

  doc.save(`Ticket_FE_${payload.number}.pdf`)
}
