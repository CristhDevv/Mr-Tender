/**
 * FLORIST & FLORAL ARRANGEMENT CALCULATION ENGINE
 * Algorithms for stem-by-stem recipe costing, floral foam/base packaging, florist labor and delivery scheduling.
 */

export interface FlowerStem {
  id: string
  name: string
  category: 'flor_principal' | 'flor_secundaria' | 'follaje' | 'relleno'
  costPerStem: number
  salePricePerStem: number
  vaseLifeDays: number
  colorOptions: string[]
}

export interface FloralBase {
  id: string
  name: string
  type: 'caja_lujo' | 'canasta_mimbre' | 'florero_vidrio' | 'cono_kraft' | 'oasis_corazon'
  cost: number
  salePrice: number
}

export interface ArrangementRecipe {
  id: string
  name: string
  occasion: 'cumpleanos' | 'amor_aniversario' | 'condolencias' | 'agradecimiento' | 'grado'
  base: FloralBase
  stems: Array<{ stem: FlowerStem; quantity: number }>
  packagingCost: number // Wrapping paper, ribbons, card, floral food
  floristLaborCost: number
  targetMarginPercent: number
}

export interface CalculatedArrangement {
  totalStemsCount: number
  stemsTotalCost: number
  stemsTotalRevenue: number
  baseCost: number
  basePrice: number
  packagingAndLabor: number
  totalCost: number
  totalSalePrice: number
  grossProfit: number
  profitMarginPercent: number
}

export const STANDARD_STEMS: FlowerStem[] = [
  { id: 'rosa_exportacion', name: 'Rosa de Exportación Premium', category: 'flor_principal', costPerStem: 2200, salePricePerStem: 4500, vaseLifeDays: 12, colorOptions: ['Rojo Pasión', 'Rosa Pastel', 'Blanco Puro', 'Amarillo Sol'] },
  { id: 'girasol_gigante', name: 'Girasol Grande Seleccionado', category: 'flor_principal', costPerStem: 3000, salePricePerStem: 6000, vaseLifeDays: 10, colorOptions: ['Amarillo Clásico'] },
  { id: 'hortensia_azul', name: 'Hortensia Holandesa', category: 'flor_principal', costPerStem: 4500, salePricePerStem: 9000, vaseLifeDays: 8, colorOptions: ['Azul Cielo', 'Blanca', 'Rosa'] },
  { id: 'lirio_oriental', name: 'Lirio Oriental / Lilium', category: 'flor_principal', costPerStem: 5000, salePricePerStem: 10000, vaseLifeDays: 14, colorOptions: ['Rosa Fucsia', 'Blanco Stargazer'] },
  { id: 'clavel_selecto', name: 'Clavel Ecuatoriano', category: 'flor_secundaria', costPerStem: 1200, salePricePerStem: 2500, vaseLifeDays: 16, colorOptions: ['Rojo', 'Blanco', 'Bicolor'] },
  { id: 'gypsophila_lluvia', name: 'Gypsophila / Lluvia de Novia (Tallo)', category: 'relleno', costPerStem: 1500, salePricePerStem: 3000, vaseLifeDays: 10, colorOptions: ['Blanca', 'Teñida Rosa'] },
  { id: 'eucalipto_cinerea', name: 'Follaje Eucalipto Dólar / Cinerea', category: 'follaje', costPerStem: 1000, salePricePerStem: 2200, vaseLifeDays: 18, colorOptions: ['Verde Plata'] },
  { id: 'ruscus_follaje', name: 'Ruscus Italiano', category: 'follaje', costPerStem: 1200, salePricePerStem: 2500, vaseLifeDays: 20, colorOptions: ['Verde Brillante'] }
]

export const STANDARD_BASES: FloralBase[] = [
  { id: 'caja_cilindrica', name: 'Caja Cilíndrica Sombrerera Luxury (Velvet)', type: 'caja_lujo', cost: 12000, salePrice: 25000 },
  { id: 'florero_vidrio', name: 'Florero de Vidrio Cilíndrico Transparente', type: 'florero_vidrio', cost: 8000, salePrice: 18000 },
  { id: 'canasto_artesanal', name: 'Canasta de Mimbre Tejida a Mano', type: 'canasta_mimbre', cost: 9000, salePrice: 20000 },
  { id: 'cono_papel_coreano', name: 'Envoltorio Bouquet Papel Coreano Impermeable', type: 'cono_kraft', cost: 4000, salePrice: 10000 }
]

export function calculateArrangementPricing(
  base: FloralBase,
  stems: Array<{ stem: FlowerStem; quantity: number }>,
  floristLabor = 15000,
  packaging = 5000
): CalculatedArrangement {
  let totalStemsCount = 0
  let stemsTotalCost = 0
  let stemsTotalRevenue = 0

  stems.forEach(item => {
    totalStemsCount += item.quantity
    stemsTotalCost += item.stem.costPerStem * item.quantity
    stemsTotalRevenue += item.stem.salePricePerStem * item.quantity
  })

  const baseCost = base.cost
  const basePrice = base.salePrice
  const packagingAndLabor = floristLabor + packaging

  const totalCost = stemsTotalCost + baseCost + (packagingAndLabor * 0.4) // Material direct cost
  const rawPrice = stemsTotalRevenue + basePrice + packagingAndLabor
  const totalSalePrice = Math.round(rawPrice / 1000) * 1000

  const grossProfit = totalSalePrice - totalCost
  const profitMarginPercent = totalSalePrice > 0 ? Math.round((grossProfit / totalSalePrice) * 100) : 0

  return {
    totalStemsCount,
    stemsTotalCost,
    stemsTotalRevenue,
    baseCost,
    basePrice,
    packagingAndLabor,
    totalCost: Math.round(totalCost),
    totalSalePrice,
    grossProfit: Math.round(grossProfit),
    profitMarginPercent
  }
}
