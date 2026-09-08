/**
 * CANDY, CONFECTIONERY & PARTY BUNDLE CALCULATION ENGINE
 * Algorithms for party surprise bags per kid, bulk candy bar weighing and melting point heat alerts.
 */

export interface CandyItem {
  id: string
  name: string
  category: 'chupeta' | 'chocolate' | 'gomita' | 'caramelo_masticable' | 'masmelo' | 'snack_dulce' | 'pinateria'
  unitPrice: number
  bulkPricePer100g?: number
  piecesPerPackage: number
  packagePrice: number
  heatSensitive: boolean // e.g. Chocolates (melts > 24°C)
  expirationMonths: number
}

export interface PartyBagItemConfig {
  candyId: string
  quantityPerKid: number
}

export interface CalculatedPartyKit {
  kidsCount: number
  totalItemsCount: number
  individualItemsSubtotal: number
  pinataPrice: number
  bagsAndRibbonsPrice: number
  kitSubtotal: number
  bundleDiscountPercent: number
  discountAmount: number
  totalKitPrice: number
  suggestedMarginPercent: number
  shoppingList: Array<{ candyName: string; totalPiecesNeeded: number; packagesNeeded: number; totalCost: number }>
}

export const STANDARD_CANDY_CATALOG: CandyItem[] = [
  { id: 'bon_bon_bum', name: 'Chupeta Bon Bon Bum Rojo Fresa', category: 'chupeta', unitPrice: 700, piecesPerPackage: 24, packagePrice: 12000, heatSensitive: false, expirationMonths: 18 },
  { id: 'chocolatina_jet', name: 'Chocolatina Jet Tradicional 12g', category: 'chocolate', unitPrice: 900, piecesPerPackage: 24, packagePrice: 16500, heatSensitive: true, expirationMonths: 12 },
  { id: 'frunas_surtidas', name: 'Frunas Masticables Surtidas (Tira x 4)', category: 'caramelo_masticable', unitPrice: 600, piecesPerPackage: 30, packagePrice: 12500, heatSensitive: false, expirationMonths: 24 },
  { id: 'gomitas_grissly', name: 'Gomitas Grissly Ositos / Aros (100g)', category: 'gomita', unitPrice: 2200, bulkPricePer100g: 2200, piecesPerPackage: 12, packagePrice: 21000, heatSensitive: true, expirationMonths: 14 },
  { id: 'sparkies_frutales', name: 'Caramelos Sparkies Frutales (Sobre)', category: 'caramelo_masticable', unitPrice: 1000, piecesPerPackage: 20, packagePrice: 15000, heatSensitive: false, expirationMonths: 24 },
  { id: 'masmelos_millows', name: 'Masmelos Millows Bicolor Bolsa', category: 'masmelo', unitPrice: 800, piecesPerPackage: 50, packagePrice: 18000, heatSensitive: true, expirationMonths: 10 },
  { id: 'galleta_mini_oreo', name: 'Mini Galletas Oreo / Wafer', category: 'snack_dulce', unitPrice: 1200, piecesPerPackage: 12, packagePrice: 11000, heatSensitive: false, expirationMonths: 12 }
]

export function calculatePartySurpriseKit(
  kidsCount: number,
  itemsPerKid: Array<{ candy: CandyItem; quantityPerKid: number }>,
  includePinata = true,
  pinataPrice = 35000
): CalculatedPartyKit {
  let totalPiecesAllKids = 0
  let individualItemsSubtotal = 0

  const shoppingList = itemsPerKid.map(it => {
    const totalPiecesNeeded = it.quantityPerKid * kidsCount
    totalPiecesAllKids += totalPiecesNeeded
    const itemSubtotal = totalPiecesNeeded * it.candy.unitPrice
    individualItemsSubtotal += itemSubtotal

    const packagesNeeded = Math.ceil(totalPiecesNeeded / it.candy.piecesPerPackage)
    const totalCost = packagesNeeded * (it.candy.packagePrice * 0.7) // Estimated wholesale cost

    return {
      candyName: it.candy.name,
      totalPiecesNeeded,
      packagesNeeded,
      totalCost: Math.round(totalCost)
    }
  })

  const bagsAndRibbonsPrice = kidsCount * 1200 // Packaging cost per surprise bag
  const finalPinataPrice = includePinata ? pinataPrice : 0
  const kitSubtotal = individualItemsSubtotal + bagsAndRibbonsPrice + finalPinataPrice

  let bundleDiscountPercent = 0
  if (kidsCount >= 30) bundleDiscountPercent = 10
  else if (kidsCount >= 15) bundleDiscountPercent = 5

  const discountAmount = Math.round((kitSubtotal * bundleDiscountPercent) / 100)
  const totalKitPrice = kitSubtotal - discountAmount

  return {
    kidsCount,
    totalItemsCount: totalPiecesAllKids,
    individualItemsSubtotal,
    pinataPrice: finalPinataPrice,
    bagsAndRibbonsPrice,
    kitSubtotal,
    bundleDiscountPercent,
    discountAmount,
    totalKitPrice: Math.round(totalKitPrice / 100) * 100,
    suggestedMarginPercent: 45,
    shoppingList
  }
}
