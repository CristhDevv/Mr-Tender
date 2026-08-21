import { jsPDF } from 'jspdf'

export interface InvoicePdfData {
  businessName: string
  merchantPhone?: string
  saleNumber: string
  date: string
  customerName: string
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>
  subtotal: number
  taxAmount: number
  total: number
  paymentMethod: string
  change?: number
}

export interface PnlReportPdfData {
  businessName: string
  periodName: string
  date: string
  grossSales: number
  discounts: number
  netSales: number
  costOfGoods: number
  grossProfit: number
  marginPercent: number
  salesCount: number
  avgTicket: number
}

export function generateInvoicePdf(data: InvoicePdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // 80mm POS Thermal Receipt format
  })

  let y = 10

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(data.businessName || 'MR TENDER', 40, y, { align: 'center' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('FACTURA DE VENTA POS', 40, y, { align: 'center' })
  y += 4

  if (data.merchantPhone) {
    doc.text(`Tel: ${data.merchantPhone}`, 40, y, { align: 'center' })
    y += 4
  }

  doc.text(`Folio: ${data.saleNumber}`, 40, y, { align: 'center' })
  y += 4
  doc.text(`Fecha: ${data.date}`, 40, y, { align: 'center' })
  y += 4
  doc.text(`Cliente: ${data.customerName || 'Público General'}`, 40, y, { align: 'center' })
  y += 4

  // Line divider
  doc.setLineWidth(0.2)
  doc.line(4, y, 76, y)
  y += 4

  // Table header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('Cant  Descripción', 4, y)
  doc.text('Total', 76, y, { align: 'right' })
  y += 4
  doc.line(4, y, 76, y)
  y += 4

  // Items
  doc.setFont('helvetica', 'normal')
  data.items.forEach(item => {
    const itemLine = `${item.quantity}x ${item.name.slice(0, 22)}`
    doc.text(itemLine, 4, y)
    doc.text(`$${item.total.toLocaleString('es-CO')}`, 76, y, { align: 'right' })
    y += 4
  })

  doc.line(4, y, 76, y)
  y += 5

  // Totals
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL:', 4, y)
  doc.text(`$${data.total.toLocaleString('es-CO')}`, 76, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Pago: ${data.paymentMethod}`, 4, y)
  y += 4

  if (data.change && data.change > 0) {
    doc.text(`Cambio: $${data.change.toLocaleString('es-CO')}`, 4, y)
    y += 4
  }

  y += 4
  doc.setFont('helvetica', 'italic')
  doc.text('¡Gracias por su compra!', 40, y, { align: 'center' })
  y += 4
  doc.setFontSize(6.5)
  doc.text('Generado con Mr. Tender ERP & AI', 40, y, { align: 'center' })

  // Save / Download PDF
  doc.save(`Factura_${data.saleNumber}.pdf`)
}

export function generatePnlPdf(data: PnlReportPdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  let y = 20

  // Header
  doc.setFillColor(30, 41, 59) // Slate-800
  doc.rect(0, 0, 210, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(data.businessName || 'MR TENDER ERP', 15, 16)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Estado de Resultados (P&L) — ${data.periodName}`, 15, 24)
  doc.text(`Fecha: ${data.date}`, 195, 24, { align: 'right' })

  y = 42
  doc.setTextColor(30, 41, 59)

  // KPI Boxes
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(15, y, 55, 24, 3, 3, 'F')
  doc.roundedRect(77, y, 55, 24, 3, 3, 'F')
  doc.roundedRect(139, y, 56, 24, 3, 3, 'F')

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('VENTAS NETAS', 20, y + 8)
  doc.text('UTILIDAD BRUTA', 82, y + 8)
  doc.text('MARGEN BRUTO', 144, y + 8)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`$${data.netSales.toLocaleString('es-CO')}`, 20, y + 18)
  doc.setTextColor(16, 185, 129) // Green
  doc.text(`$${data.grossProfit.toLocaleString('es-CO')}`, 82, y + 18)
  doc.setTextColor(59, 130, 246) // Blue
  doc.text(`${data.marginPercent.toFixed(1)}%`, 144, y + 18)

  y += 35
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Desglose Financiero', 15, y)
  y += 6

  // Table Lines
  const lines = [
    { label: 'Ventas Brutas Totales', val: `$${data.grossSales.toLocaleString('es-CO')}`, bold: false },
    { label: '(-) Descuentos Comerciales', val: `-$${data.discounts.toLocaleString('es-CO')}`, bold: false },
    { label: '(=) Ventas Netas Facturadas', val: `$${data.netSales.toLocaleString('es-CO')}`, bold: true },
    { label: '(-) Costo de Mercancía Vendida (COGS)', val: `-$${data.costOfGoods.toLocaleString('es-CO')}`, bold: false },
    { label: '(=) Utilidad Bruta Operativa', val: `$${data.grossProfit.toLocaleString('es-CO')}`, bold: true },
    { label: 'Transacciones Realizadas', val: `${data.salesCount} ventas`, bold: false },
    { label: 'Ticket Promedio', val: `$${data.avgTicket.toLocaleString('es-CO')}`, bold: false }
  ]

  lines.forEach((l, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(15, y - 4, 180, 8, 'F')
    }
    doc.setFont('helvetica', l.bold ? 'bold' : 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text(l.label, 18, y + 1.5)
    doc.text(l.val, 192, y + 1.5, { align: 'right' })
    y += 8
  })

  // Footer
  y = 275
  doc.setDrawColor(226, 232, 240)
  doc.line(15, y, 195, y)
  y += 6
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('Informe oficial generado por Tender Copilot AI — Mr. Tender Cloud ERP', 15, y)
  doc.text('Documento confidencial para toma de decisiones', 195, y, { align: 'right' })

  doc.save(`Reporte_Financiero_PyG_${new Date().toISOString().split('T')[0]}.pdf`)
}
