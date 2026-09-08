import { describe, it, expect } from 'vitest'
import {
  calculatePrintingJob,
  getBasePageRate,
  calculateSpiralSizeAndCost
} from './pricing-engine'

describe('Stationery & Printing Calculation Engine', () => {
  it('should apply volume discount tiers for B/W printing', () => {
    expect(getBasePageRate('bw', 5)).toBe(200)
    expect(getBasePageRate('bw', 20)).toBe(150)
    expect(getBasePageRate('bw', 50)).toBe(120)
    expect(getBasePageRate('bw', 150)).toBe(90)
    expect(getBasePageRate('bw', 600)).toBe(70)
  })

  it('should calculate full document printing with double-sided and spiral binding', () => {
    const job = calculatePrintingJob({
      pageCount: 80,
      copies: 2,
      colorMode: 'bw',
      paperSize: 'letter',
      paperStock: 'bond_75g',
      duplexMode: 'double_sided',
      binding: 'plastic_spiral',
      lamination: 'none',
      laminationUnits: 0,
      foldingAndStapling: false
    })

    expect(job.totalPagesToPrint).toBe(160)
    // 80 pages double-sided = 40 sheets * 2 copies = 80 sheets
    expect(job.totalSheetsOfPaper).toBe(80)
    expect(job.unitPricePerPage).toBe(90) // Volume rate for 160 pages
    expect(job.printingTotalCost).toBe(160 * 90)
    expect(job.bindingCost).toBeGreaterThan(0)
    expect(job.bindingSpiralSizeMm).toBe(10) // Size for 40 sheets (3/8" / 10mm)
    expect(job.totalPrice).toBeGreaterThan(job.printingTotalCost)
  })

  it('should price color printing on heavy photographic paper with lamination', () => {
    const job = calculatePrintingJob({
      pageCount: 10,
      copies: 1,
      colorMode: 'color',
      paperSize: 'tabloid',
      paperStock: 'photographic',
      duplexMode: 'single_sided',
      binding: 'none',
      lamination: 'tabloid',
      laminationUnits: 10,
      foldingAndStapling: false
    })

    expect(job.totalPagesToPrint).toBe(10)
    expect(job.totalSheetsOfPaper).toBe(10)
    expect(job.paperStockSurcharge).toBeGreaterThan(0)
    expect(job.laminationCost).toBe(6000 * 10)
    expect(job.totalPrice).toBeGreaterThan(50000)
  })
})
