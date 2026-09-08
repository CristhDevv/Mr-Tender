/**
 * STATIONERY & PRINTING CALCULATION ENGINE
 * Pricing algorithms for photocopying, digital printing, paper stocks, lamination and spiral binding.
 */

export type PrintColorMode = 'bw' | 'color' | 'full_photo'
export type PaperSize = 'letter' | 'legal' | 'tabloid' | 'half_letter' | 'pliego'
export type PaperStock = 'bond_75g' | 'bond_90g' | 'propalcote_150g' | 'propalcote_240g' | 'opalina' | 'photographic' | 'sticker'
export type DuplexMode = 'single_sided' | 'double_sided'
export type BindingType = 'none' | 'plastic_spiral' | 'wire_o' | 'velobind' | 'stapled'
export type LaminationType = 'none' | 'carnet' | 'letter' | 'legal' | 'tabloid' | 'matte_roll'

export interface PrintingJobConfig {
  pageCount: number
  copies: number
  colorMode: PrintColorMode
  paperSize: PaperSize
  paperStock: PaperStock
  duplexMode: DuplexMode
  binding: BindingType
  lamination: LaminationType
  laminationUnits: number
  foldingAndStapling: boolean
}

export interface CalculatedPrintJob {
  totalPagesToPrint: number
  totalSheetsOfPaper: number
  unitPricePerPage: number
  printingTotalCost: number
  paperStockSurcharge: number
  bindingCost: number
  bindingSpiralSizeMm: number
  laminationCost: number
  extraServicesCost: number
  subtotal: number
  volumeDiscountPercent: number
  discountAmount: number
  totalPrice: number
  suggestedMarginPercent: number
}

// Volume tiers for B/W and Color printing
export function getBasePageRate(colorMode: PrintColorMode, totalPages: number): number {
  if (colorMode === 'bw') {
    if (totalPages >= 500) return 70
    if (totalPages >= 100) return 90
    if (totalPages >= 30) return 120
    if (totalPages >= 10) return 150
    return 200 // 1-9 pages
  } else if (colorMode === 'color') {
    if (totalPages >= 500) return 300
    if (totalPages >= 100) return 400
    if (totalPages >= 30) return 500
    if (totalPages >= 10) return 700
    return 1000 // 1-9 pages
  } else {
    // Full photo / graphic art
    if (totalPages >= 50) return 1500
    if (totalPages >= 10) return 2000
    return 2500
  }
}

export const PAPER_STOCK_SURCHARGES: Record<PaperStock, number> = {
  bond_75g: 0,
  bond_90g: 50,
  propalcote_150g: 400,
  propalcote_240g: 700,
  opalina: 500,
  photographic: 1200,
  sticker: 1500
}

export const PAPER_SIZE_MULTIPLIERS: Record<PaperSize, number> = {
  letter: 1.0,
  half_letter: 0.7,
  legal: 1.25,
  tabloid: 2.0,
  pliego: 5.0
}

export function calculateSpiralSizeAndCost(sheetsCount: number, binding: BindingType): { sizeMm: number; cost: number } {
  if (binding === 'none') return { sizeMm: 0, cost: 0 }
  if (binding === 'stapled') return { sizeMm: 0, cost: 500 }

  let sizeMm = 8
  let baseCost = 3500

  if (sheetsCount > 250) {
    sizeMm = 32
    baseCost = 9000
  } else if (sheetsCount > 180) {
    sizeMm = 25
    baseCost = 7500
  } else if (sheetsCount > 120) {
    sizeMm = 18
    baseCost = 6000
  } else if (sheetsCount > 60) {
    sizeMm = 14
    baseCost = 5000
  } else if (sheetsCount > 25) {
    sizeMm = 10
    baseCost = 4000
  }

  if (binding === 'wire_o') {
    baseCost = Math.round(baseCost * 1.4 / 100) * 100
  }

  return { sizeMm, cost: baseCost }
}

export const LAMINATION_RATES: Record<LaminationType, number> = {
  none: 0,
  carnet: 1500,
  letter: 3000,
  legal: 3500,
  tabloid: 6000,
  matte_roll: 8000
}

export function calculatePrintingJob(config: PrintingJobConfig): CalculatedPrintJob {
  const totalPagesToPrint = Math.max(1, config.pageCount * config.copies)
  
  // Sheet count depends on duplex
  const sheetsPerPage = config.duplexMode === 'double_sided' ? 0.5 : 1.0
  const totalSheetsOfPaper = Math.ceil(config.pageCount * sheetsPerPage) * config.copies

  // Base page rate
  const rawBaseRate = getBasePageRate(config.colorMode, totalPagesToPrint)
  const sizeMultiplier = PAPER_SIZE_MULTIPLIERS[config.paperSize] || 1.0
  const unitPricePerPage = Math.round(rawBaseRate * sizeMultiplier)
  const printingTotalCost = totalPagesToPrint * unitPricePerPage

  // Paper stock surcharge
  const stockSurchargePerSheet = (PAPER_STOCK_SURCHARGES[config.paperStock] || 0) * sizeMultiplier
  const paperStockSurcharge = totalSheetsOfPaper * stockSurchargePerSheet

  // Binding
  const bindingResult = calculateSpiralSizeAndCost(Math.ceil(config.pageCount * sheetsPerPage), config.binding)
  const bindingCost = bindingResult.cost * config.copies

  // Lamination
  const laminationUnitRate = LAMINATION_RATES[config.lamination] || 0
  const laminationCost = laminationUnitRate * Math.max(1, config.laminationUnits)

  // Extra services (e.g. folding, cutting, stapling)
  const extraServicesCost = config.foldingAndStapling ? totalSheetsOfPaper * 50 : 0

  const subtotal = printingTotalCost + paperStockSurcharge + bindingCost + laminationCost + extraServicesCost

  // Volume discount on massive jobs
  let volumeDiscountPercent = 0
  if (subtotal >= 100000) volumeDiscountPercent = 10
  else if (subtotal >= 50000) volumeDiscountPercent = 5

  const discountAmount = Math.round((subtotal * volumeDiscountPercent) / 100)
  const totalPrice = subtotal - discountAmount

  return {
    totalPagesToPrint,
    totalSheetsOfPaper,
    unitPricePerPage,
    printingTotalCost,
    paperStockSurcharge,
    bindingCost,
    bindingSpiralSizeMm: bindingResult.sizeMm,
    laminationCost,
    extraServicesCost,
    subtotal,
    volumeDiscountPercent,
    discountAmount,
    totalPrice: Math.round(totalPrice / 50) * 50, // Round to nearest 50 COP
    suggestedMarginPercent: 65
  }
}
