/**
 * CARCASS YIELD & BUTCHERY CALCULATION ENGINE
 * Specialized algorithms for carcass breakdown, mass balance and value-weighted cost distribution.
 */

export type Species = 'beef' | 'pork' | 'chicken' | 'lamb'

export interface StandardCut {
  id: string
  name: string
  category: 'fino' | 'primera' | 'segunda' | 'procesamiento' | 'hueso_merma'
  defaultYieldPercent: number // % of total carcass weight
  commercialValueWeight: number // Relative value multiplier (e.g. Lomo = 2.5, Hueso = 0.2)
  suggestedMarginPercent: number
  description: string
}

export interface SpeciesConfig {
  id: Species
  name: string
  emoji: string
  defaultCarcassWeightKg: number
  standardCuts: StandardCut[]
}

export const SPECIES_CONFIGS: Record<Species, SpeciesConfig> = {
  beef: {
    id: 'beef',
    name: 'Res / Vacuno',
    emoji: '',
    defaultCarcassWeightKg: 220,
    standardCuts: [
      { id: 'lomo_fino', name: 'Lomo Fino / Solomillo', category: 'fino', defaultYieldPercent: 2.5, commercialValueWeight: 3.2, suggestedMarginPercent: 40, description: 'Corte premium tierno sin grasa' },
      { id: 'punta_anca', name: 'Punta de Anca / Picanha', category: 'fino', defaultYieldPercent: 3.2, commercialValueWeight: 2.8, suggestedMarginPercent: 38, description: 'Corte con cobertura de grasa' },
      { id: 'chatas', name: 'Chatas / Bife de Chorizo / Lomo Ancho', category: 'fino', defaultYieldPercent: 6.5, commercialValueWeight: 2.4, suggestedMarginPercent: 35, description: 'Lomo ancho con grasa dorsal' },
      { id: 'churrasco', name: 'Churrasco / Bife Angosto', category: 'primera', defaultYieldPercent: 4.5, commercialValueWeight: 2.2, suggestedMarginPercent: 35, description: 'Corte marmoleado de lomo' },
      { id: 'cadera', name: 'Cadera / Cuadril', category: 'primera', defaultYieldPercent: 7.0, commercialValueWeight: 1.8, suggestedMarginPercent: 30, description: 'Pulpa jugosa ideal para asar' },
      { id: 'bota', name: 'Bota / Posta', category: 'primera', defaultYieldPercent: 6.5, commercialValueWeight: 1.6, suggestedMarginPercent: 30, description: 'Carne magra para freír o bistec' },
      { id: 'bola', name: 'Bola de Pierna / Nalga', category: 'primera', defaultYieldPercent: 8.0, commercialValueWeight: 1.5, suggestedMarginPercent: 28, description: 'Pulpa tierna para milanesa' },
      { id: 'muchacho', name: 'Muchacho / Peceto', category: 'primera', defaultYieldPercent: 3.5, commercialValueWeight: 1.7, suggestedMarginPercent: 30, description: 'Corte cilíndrico para rellenar' },
      { id: 'sobrebarriga', name: 'Sobrebarriga / Matambre', category: 'segunda', defaultYieldPercent: 4.8, commercialValueWeight: 1.5, suggestedMarginPercent: 30, description: 'Ideal para cocción lenta' },
      { id: 'costilla', name: 'Costilla / Asado de Tira', category: 'segunda', defaultYieldPercent: 9.0, commercialValueWeight: 1.3, suggestedMarginPercent: 28, description: 'Corte con hueso y alto sabor' },
      { id: 'pecho', name: 'Pecho / Brisket', category: 'segunda', defaultYieldPercent: 5.5, commercialValueWeight: 1.2, suggestedMarginPercent: 28, description: 'Corte ahumable o para desmechar' },
      { id: 'carne_molida', name: 'Carne Molida Especial (85/15)', category: 'procesamiento', defaultYieldPercent: 12.0, commercialValueWeight: 1.1, suggestedMarginPercent: 25, description: 'Recortes magros de desposte' },
      { id: 'lagarto', name: 'Lagarto / Osobuco / Jarrete', category: 'segunda', defaultYieldPercent: 5.0, commercialValueWeight: 1.1, suggestedMarginPercent: 25, description: 'Corte con colágeno y médula' },
      { id: 'hueso_blanco', name: 'Hueso Blanco / Poroso para Caldo', category: 'hueso_merma', defaultYieldPercent: 11.0, commercialValueWeight: 0.25, suggestedMarginPercent: 20, description: 'Hueso para sopas y consomé' },
      { id: 'sebo_grasa', name: 'Grasa / Sebo / Empella', category: 'hueso_merma', defaultYieldPercent: 4.0, commercialValueWeight: 0.15, suggestedMarginPercent: 15, description: 'Grasa para fundir o jabonería' },
      { id: 'merma_desposte', name: 'Merma por Deshidratación & Aserrín', category: 'hueso_merma', defaultYieldPercent: 1.0, commercialValueWeight: 0.0, suggestedMarginPercent: 0, description: 'Pérdida natural de humedad y corte' }
    ]
  },
  pork: {
    id: 'pork',
    name: 'Cerdo / Porcino',
    emoji: '',
    defaultCarcassWeightKg: 95,
    standardCuts: [
      { id: 'lomo_cerdo', name: 'Lomo de Cerdo / Cañón', category: 'fino', defaultYieldPercent: 12.0, commercialValueWeight: 2.2, suggestedMarginPercent: 35, description: 'Corte magro y suave' },
      { id: 'solomito_cerdo', name: 'Solomito / Tenderloin', category: 'fino', defaultYieldPercent: 2.2, commercialValueWeight: 2.8, suggestedMarginPercent: 40, description: 'El corte más tierno del cerdo' },
      { id: 'bondiola', name: 'Bondiola / Cabeza de Lomo', category: 'fino', defaultYieldPercent: 7.5, commercialValueWeight: 2.0, suggestedMarginPercent: 35, description: 'Corte marmoleado jugoso' },
      { id: 'costilla_cerdo', name: 'Costilla St. Louis / Baby Back', category: 'fino', defaultYieldPercent: 11.0, commercialValueWeight: 2.5, suggestedMarginPercent: 38, description: 'Costillas para BBQ y horno' },
      { id: 'tocino_panceta', name: 'Tocino / Panceta / Pork Belly', category: 'primera', defaultYieldPercent: 14.0, commercialValueWeight: 2.1, suggestedMarginPercent: 35, description: 'Para chicharrón crocante' },
      { id: 'pierna_cerdo', name: 'Pierna de Cerdo / Pernil Deshuesado', category: 'primera', defaultYieldPercent: 20.0, commercialValueWeight: 1.5, suggestedMarginPercent: 30, description: 'Para asar o embutidos' },
      { id: 'brazuelo', name: 'Brazuelo / Paleta', category: 'segunda', defaultYieldPercent: 12.5, commercialValueWeight: 1.3, suggestedMarginPercent: 28, description: 'Pulpa para picar o pulled pork' },
      { id: 'espinazo', name: 'Espinazo & Huesos de Cerdo', category: 'hueso_merma', defaultYieldPercent: 8.5, commercialValueWeight: 0.4, suggestedMarginPercent: 20, description: 'Para caldos y sancochos' },
      { id: 'tocineta_grasa', name: 'Grasa Dorsal / Tocino de Espalda', category: 'procesamiento', defaultYieldPercent: 6.5, commercialValueWeight: 0.6, suggestedMarginPercent: 25, description: 'Materia prima para chorizos' },
      { id: 'papada_orejas', name: 'Papada, Careta & Orejas', category: 'segunda', defaultYieldPercent: 4.8, commercialValueWeight: 0.8, suggestedMarginPercent: 25, description: 'Para lechona o morcilla' },
      { id: 'merma_cerdo', name: 'Merma por Desposte', category: 'hueso_merma', defaultYieldPercent: 1.0, commercialValueWeight: 0.0, suggestedMarginPercent: 0, description: 'Deshidratación y aserrín' }
    ]
  },
  chicken: {
    id: 'chicken',
    name: 'Pollo / Avícola',
    emoji: '',
    defaultCarcassWeightKg: 2.2,
    standardCuts: [
      { id: 'pechuga_deshuesada', name: 'Pechuga Deshuesada / Filete', category: 'fino', defaultYieldPercent: 32.0, commercialValueWeight: 2.2, suggestedMarginPercent: 35, description: 'Filete magro sin piel ni hueso' },
      { id: 'pernil_pollo', name: 'Pernil / Cuarto Trasero', category: 'primera', defaultYieldPercent: 28.0, commercialValueWeight: 1.4, suggestedMarginPercent: 30, description: 'Muslo y contramuslo jugoso' },
      { id: 'alitas_pollo', name: 'Alas Enteras / Alitas BBQ', category: 'fino', defaultYieldPercent: 11.0, commercialValueWeight: 1.9, suggestedMarginPercent: 38, description: 'Alas seleccionadas para asar' },
      { id: 'rabadilla_costillar', name: 'Rabadilla, Espinazo & Costillar', category: 'hueso_merma', defaultYieldPercent: 15.0, commercialValueWeight: 0.3, suggestedMarginPercent: 20, description: 'Para sopas y fondos' },
      { id: 'menudencias', name: 'Menudencias (Molleja, Hígado, Corazón)', category: 'segunda', defaultYieldPercent: 8.0, commercialValueWeight: 0.7, suggestedMarginPercent: 25, description: 'Menudencia fresca limpia' },
      { id: 'piel_grasa', name: 'Piel y Grasa Excedente', category: 'hueso_merma', defaultYieldPercent: 5.0, commercialValueWeight: 0.1, suggestedMarginPercent: 15, description: 'Grasa para caldos' },
      { id: 'merma_pollo', name: 'Merma por Eviscerado/Lavado', category: 'hueso_merma', defaultYieldPercent: 1.0, commercialValueWeight: 0.0, suggestedMarginPercent: 0, description: 'Agua y recorte' }
    ]
  },
  lamb: {
    id: 'lamb',
    name: 'Cordero / Ovino',
    emoji: '',
    defaultCarcassWeightKg: 25,
    standardCuts: [
      { id: 'rack_cordero', name: 'Rack Francés / Chuletón', category: 'fino', defaultYieldPercent: 14.0, commercialValueWeight: 3.0, suggestedMarginPercent: 40, description: 'Costillar fino con hueso limpio' },
      { id: 'pierna_cordero', name: 'Pierna de Cordero Entera', category: 'fino', defaultYieldPercent: 30.0, commercialValueWeight: 2.2, suggestedMarginPercent: 35, description: 'Para hornear lentamente' },
      { id: 'paleta_cordero', name: 'Paleta / Brazuelo', category: 'primera', defaultYieldPercent: 18.0, commercialValueWeight: 1.6, suggestedMarginPercent: 30, description: 'Corte jugoso para guisos' },
      { id: 'lomo_cordero', name: 'Lomo de Cordero Deshuesado', category: 'fino', defaultYieldPercent: 8.0, commercialValueWeight: 2.8, suggestedMarginPercent: 38, description: 'Carne tierna gourmet' },
      { id: 'costilla_cordero', name: 'Costillar / Falda', category: 'segunda', defaultYieldPercent: 12.0, commercialValueWeight: 1.1, suggestedMarginPercent: 28, description: 'Para asado a la parrilla' },
      { id: 'hueso_merma_cordero', name: 'Huesos, Grasa & Merma', category: 'hueso_merma', defaultYieldPercent: 18.0, commercialValueWeight: 0.2, suggestedMarginPercent: 15, description: 'Huesos para fondo y merma' }
    ]
  }
}

export interface CalculatedCutResult {
  cutId: string
  name: string
  category: string
  yieldPercent: number
  weightKg: number
  unitCostPerKg: number
  totalCost: number
  suggestedSalePricePerKg: number
  suggestedSalePricePerLb: number
  expectedTotalRevenue: number
  expectedGrossProfit: number
  marginPercent: number
}

export interface CarcassYieldSimulation {
  species: Species
  carcassWeightKg: number
  carcassTotalCost: number
  carcassAvgCostPerKg: number
  totalCalculatedWeightKg: number
  totalCalculatedCost: number
  totalExpectedRevenue: number
  totalExpectedProfit: number
  overallProfitMarginPercent: number
  cuts: CalculatedCutResult[]
}

/**
 * Calculates accurate mass balance and value-weighted costs for a carcass breakdown.
 * Formula: Cost per cut is proportional to its commercial value index, ensuring premium cuts
 * absorb their fair share of cost while low-value bones don't artificially inflate in cost.
 */
export function calculateCarcassYield(
  species: Species,
  carcassWeightKg: number,
  carcassTotalCost: number,
  customYieldPercents?: Record<string, number>
): CarcassYieldSimulation {
  const config = SPECIES_CONFIGS[species] || SPECIES_CONFIGS.beef
  const carcassAvgCostPerKg = carcassWeightKg > 0 ? carcassTotalCost / carcassWeightKg : 0

  // 1. Determine actual yield % per cut (normalizing to 100% if needed)
  let totalRawPercent = 0
  const adjustedCuts = config.standardCuts.map(cut => {
    const yieldPct = customYieldPercents?.[cut.id] !== undefined
      ? customYieldPercents[cut.id]
      : cut.defaultYieldPercent
    totalRawPercent += yieldPct
    return { ...cut, yieldPercent: yieldPct }
  })

  // Normalize percentages if user adjusted them and sum != 100%
  const normalizationFactor = totalRawPercent > 0 ? 100 / totalRawPercent : 1
  const normalizedCuts = adjustedCuts.map(c => ({
    ...c,
    yieldPercent: c.yieldPercent * normalizationFactor,
    weightKg: (carcassWeightKg * (c.yieldPercent * normalizationFactor)) / 100
  }))

  // 2. Calculate Total Weighted Value Points for Cost Distribution
  // Weighted Value = WeightKg * CommercialValueWeight
  let totalValuePoints = 0
  normalizedCuts.forEach(c => {
    totalValuePoints += c.weightKg * c.commercialValueWeight
  })

  // 3. Compute cost and suggested revenue per cut
  let totalCalculatedCost = 0
  let totalExpectedRevenue = 0
  let totalCalculatedWeightKg = 0

  const calculatedCuts: CalculatedCutResult[] = normalizedCuts.map(c => {
    totalCalculatedWeightKg += c.weightKg

    // Distribute carcass cost based on commercial value index
    let cutTotalCost = 0
    if (totalValuePoints > 0 && c.commercialValueWeight > 0) {
      const shareOfValue = (c.weightKg * c.commercialValueWeight) / totalValuePoints
      cutTotalCost = carcassTotalCost * shareOfValue
    }
    totalCalculatedCost += cutTotalCost

    const unitCostPerKg = c.weightKg > 0 ? cutTotalCost / c.weightKg : 0
    
    // Suggested price based on margin: Price = Cost / (1 - Margin%)
    const marginDec = c.suggestedMarginPercent / 100
    const suggestedSalePricePerKg = marginDec < 1 && unitCostPerKg > 0
      ? Math.round(unitCostPerKg / (1 - marginDec) / 100) * 100
      : Math.round(unitCostPerKg * 1.3 / 100) * 100
    
    const suggestedSalePricePerLb = Math.round(suggestedSalePricePerKg / 2 / 50) * 50 // 1 kg ~ 2 lb COP convention

    const expectedTotalRevenue = c.weightKg * suggestedSalePricePerKg
    totalExpectedRevenue += expectedTotalRevenue

    const expectedGrossProfit = expectedTotalRevenue - cutTotalCost
    const marginPercent = expectedTotalRevenue > 0
      ? Math.round((expectedGrossProfit / expectedTotalRevenue) * 100)
      : 0

    return {
      cutId: c.id,
      name: c.name,
      category: c.category,
      yieldPercent: Math.round(c.yieldPercent * 100) / 100,
      weightKg: Math.round(c.weightKg * 100) / 100,
      unitCostPerKg: Math.round(unitCostPerKg),
      totalCost: Math.round(cutTotalCost),
      suggestedSalePricePerKg,
      suggestedSalePricePerLb,
      expectedTotalRevenue: Math.round(expectedTotalRevenue),
      expectedGrossProfit: Math.round(expectedGrossProfit),
      marginPercent
    }
  })

  const totalExpectedProfit = totalExpectedRevenue - totalCalculatedCost
  const overallProfitMarginPercent = totalExpectedRevenue > 0
    ? Math.round((totalExpectedProfit / totalExpectedRevenue) * 100)
    : 0

  return {
    species,
    carcassWeightKg,
    carcassTotalCost,
    carcassAvgCostPerKg: Math.round(carcassAvgCostPerKg),
    totalCalculatedWeightKg: Math.round(totalCalculatedWeightKg * 100) / 100,
    totalCalculatedCost: Math.round(totalCalculatedCost),
    totalExpectedRevenue: Math.round(totalExpectedRevenue),
    totalExpectedProfit: Math.round(totalExpectedProfit),
    overallProfitMarginPercent,
    cuts: calculatedCuts
  }
}
