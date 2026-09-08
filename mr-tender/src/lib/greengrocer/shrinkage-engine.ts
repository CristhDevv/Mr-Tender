/**
 * GREENGROCER & PRODUCE SHRINKAGE CALCULATION ENGINE
 * Specialized algorithms for daily perishable shrinkage, grade reclassification (1st vs 2nd class) and farm basket bundles.
 */

export interface ProduceItem {
  id: string
  name: string
  category: 'fruta' | 'verdura' | 'tuberculo' | 'hierba_aromatica'
  purchaseCostPerKg: number
  salePriceGrade1PerKg: number
  salePriceGrade2PerKg: number // Price for overripe / cooking grade
  expectedDailyShrinkPercent: number // Normal expected biological loss (evaporation/trimming)
  unit: 'kg' | 'lb' | 'atado' | 'unidad'
  pluCode: string
}

export interface DailyShrinkageLog {
  itemId: string
  initialStockKg: number
  soldKg: number
  wasteKg: number // Discarded as spoilage/rot
  reclassifiedGrade2Kg: number // Salvaged for sauces/pulp/discount
  recordedShrinkPercent: number
  wasteCostLoss: number
  salvagedRevenue: number
  effectiveMarginPercent: number
}

export const STANDARD_PRODUCE_CATALOG: ProduceItem[] = [
  { id: 'papa_pastusa', name: 'Papa Pastusa Seleccionada', category: 'tuberculo', purchaseCostPerKg: 1800, salePriceGrade1PerKg: 3200, salePriceGrade2PerKg: 2000, expectedDailyShrinkPercent: 2.0, unit: 'kg', pluCode: '4011' },
  { id: 'tomate_chonto', name: 'Tomate Chonto Maduro / Pintón', category: 'verdura', purchaseCostPerKg: 2800, salePriceGrade1PerKg: 4800, salePriceGrade2PerKg: 2500, expectedDailyShrinkPercent: 4.5, unit: 'kg', pluCode: '4022' },
  { id: 'cebolla_cabezona', name: 'Cebolla Cabezona Blanca', category: 'verdura', purchaseCostPerKg: 2200, salePriceGrade1PerKg: 3800, salePriceGrade2PerKg: 2200, expectedDailyShrinkPercent: 3.0, unit: 'kg', pluCode: '4033' },
  { id: 'cebolla_junca', name: 'Cebolla Junca / Larga', category: 'verdura', purchaseCostPerKg: 2500, salePriceGrade1PerKg: 4200, salePriceGrade2PerKg: 2000, expectedDailyShrinkPercent: 6.0, unit: 'kg', pluCode: '4044' },
  { id: 'platano_harton', name: 'Plátano Hartón Maduro / Verde', category: 'tuberculo', purchaseCostPerKg: 2400, salePriceGrade1PerKg: 4000, salePriceGrade2PerKg: 2200, expectedDailyShrinkPercent: 3.5, unit: 'kg', pluCode: '4055' },
  { id: 'aguacate_hass', name: 'Aguacate Hass / Papelillo', category: 'fruta', purchaseCostPerKg: 5500, salePriceGrade1PerKg: 9500, salePriceGrade2PerKg: 4500, expectedDailyShrinkPercent: 5.0, unit: 'kg', pluCode: '4066' },
  { id: 'mango_tommy', name: 'Mango Tommy Dulce', category: 'fruta', purchaseCostPerKg: 3200, salePriceGrade1PerKg: 5800, salePriceGrade2PerKg: 3000, expectedDailyShrinkPercent: 4.0, unit: 'kg', pluCode: '4077' },
  { id: 'limon_tahiti', name: 'Limón Tahití Jugoso', category: 'fruta', purchaseCostPerKg: 2600, salePriceGrade1PerKg: 4600, salePriceGrade2PerKg: 2000, expectedDailyShrinkPercent: 2.5, unit: 'kg', pluCode: '4088' },
  { id: 'zanahoria', name: 'Zanahoria Lavada Grande', category: 'verdura', purchaseCostPerKg: 1900, salePriceGrade1PerKg: 3400, salePriceGrade2PerKg: 1800, expectedDailyShrinkPercent: 3.0, unit: 'kg', pluCode: '4099' },
  { id: 'fresa_sabana', name: 'Fresa Seleccionada de Sabana', category: 'fruta', purchaseCostPerKg: 6000, salePriceGrade1PerKg: 11000, salePriceGrade2PerKg: 5000, expectedDailyShrinkPercent: 7.0, unit: 'kg', pluCode: '4100' },
  { id: 'lechuga_crespa', name: 'Lechuga Crespa Hidropónica', category: 'verdura', purchaseCostPerKg: 1500, salePriceGrade1PerKg: 3000, salePriceGrade2PerKg: 1200, expectedDailyShrinkPercent: 8.0, unit: 'unidad', pluCode: '4111' },
  { id: 'cilantro_fresco', name: 'Cilantro de Castilla (Atado)', category: 'hierba_aromatica', purchaseCostPerKg: 1200, salePriceGrade1PerKg: 2500, salePriceGrade2PerKg: 800, expectedDailyShrinkPercent: 9.0, unit: 'atado', pluCode: '4122' }
]

export interface BasketBundle {
  id: string
  name: string
  targetTheme: 'familiar' | 'saludable_fitness' | 'sopera' | 'frutal'
  suggestedSalePrice: number
  items: Array<{ produceId: string; quantityKg: number }>
}

export function calculateDailyProduceShrinkage(
  item: ProduceItem,
  initialStockKg: number,
  soldKg: number,
  wasteKg: number,
  reclassifiedGrade2Kg: number
): DailyShrinkageLog {
  const totalAccounted = soldKg + wasteKg + reclassifiedGrade2Kg
  const recordedShrinkPercent = initialStockKg > 0
    ? Math.round(((wasteKg + reclassifiedGrade2Kg * 0.4) / initialStockKg) * 1000) / 10
    : 0

  const wasteCostLoss = Math.round(wasteKg * item.purchaseCostPerKg)
  const salvagedRevenue = Math.round(reclassifiedGrade2Kg * item.salePriceGrade2PerKg)
  
  const totalRevenue = (soldKg * item.salePriceGrade1PerKg) + salvagedRevenue
  const totalCost = initialStockKg * item.purchaseCostPerKg
  const grossProfit = totalRevenue - totalCost
  const effectiveMarginPercent = totalRevenue > 0
    ? Math.round((grossProfit / totalRevenue) * 100)
    : 0

  return {
    itemId: item.id,
    initialStockKg,
    soldKg,
    wasteKg,
    reclassifiedGrade2Kg,
    recordedShrinkPercent,
    wasteCostLoss,
    salvagedRevenue,
    effectiveMarginPercent
  }
}
