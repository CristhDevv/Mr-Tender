export interface MasterProduct {
  barcode: string
  name: string
  category: string
  suggestedCost: number
  suggestedPrice: number
  emoji: string
}

export const COLOMBIA_MASTER_CATALOG: MasterProduct[] = [
  { barcode: '7702001001018', name: 'Chocolatina Jet 12g', category: 'Dulcería', suggestedCost: 600, suggestedPrice: 900, emoji: '🍫' },
  { barcode: '7702004005013', name: 'Cerveza Poker Lata 330ml', category: 'Licores', suggestedCost: 2400, suggestedPrice: 3200, emoji: '🍺' },
  { barcode: '7702004006027', name: 'Cerveza Águila 330ml', category: 'Licores', suggestedCost: 2300, suggestedPrice: 3000, emoji: '🍺' },
  { barcode: '7702007001014', name: 'Gaseosa Coca-Cola 1.5L', category: 'Bebidas', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🥤' },
  { barcode: '7702007002021', name: 'Gaseosa Postobón Manzana 1.5L', category: 'Bebidas', suggestedCost: 3800, suggestedPrice: 4800, emoji: '🥤' },
  { barcode: '7702007003038', name: 'Gaseosa Colombiana 1.5L', category: 'Bebidas', suggestedCost: 3800, suggestedPrice: 4800, emoji: '🥤' },
  { barcode: '7702010001018', name: 'Arroz Diana 1kg', category: 'Abarrotes', suggestedCost: 3800, suggestedPrice: 4600, emoji: '🍚' },
  { barcode: '7702010002025', name: 'Arroz Roa 1kg', category: 'Abarrotes', suggestedCost: 3900, suggestedPrice: 4700, emoji: '🍚' },
  { barcode: '7702012001016', name: 'Aceite Premier 1L', category: 'Abarrotes', suggestedCost: 8500, suggestedPrice: 10500, emoji: '🫗' },
  { barcode: '7702015001015', name: 'Leche Alquería Entera 1L', category: 'Lácteos', suggestedCost: 3600, suggestedPrice: 4400, emoji: '🥛' },
  { barcode: '7702015002022', name: 'Leche Alpina Entera 1L', category: 'Lácteos', suggestedCost: 3700, suggestedPrice: 4500, emoji: '🥛' },
  { barcode: '7702015003039', name: 'Arequipe Alpina 220g', category: 'Lácteos', suggestedCost: 4200, suggestedPrice: 5500, emoji: '🫙' },
  { barcode: '7702018001014', name: 'Galletas Festival Chocolate', category: 'Galletas', suggestedCost: 1800, suggestedPrice: 2400, emoji: '🍪' },
  { barcode: '7702018002021', name: 'Galletas Ducales Tradicional 294g', category: 'Galletas', suggestedCost: 4500, suggestedPrice: 5600, emoji: '🍪' },
  { barcode: '7702020001017', name: 'Café Sello Rojo 500g', category: 'Abarrotes', suggestedCost: 14500, suggestedPrice: 17800, emoji: '☕' },
  { barcode: '7702020002024', name: 'Café Colcafé Granulado 170g', category: 'Abarrotes', suggestedCost: 12000, suggestedPrice: 15200, emoji: '☕' },
  { barcode: '7702022001016', name: 'Harina Pan Amarilla 1kg', category: 'Abarrotes', suggestedCost: 4200, suggestedPrice: 5200, emoji: '🌽' },
  { barcode: '7702022002023', name: 'Harina Pan Blanca 1kg', category: 'Abarrotes', suggestedCost: 4200, suggestedPrice: 5200, emoji: '🌽' },
  { barcode: '7702025001015', name: 'Pan Bimbo Blanco Grande', category: 'Panadería', suggestedCost: 6500, suggestedPrice: 8200, emoji: '🍞' },
  { barcode: '7702028001014', name: 'Pastas Doria Conchas 250g', category: 'Abarrotes', suggestedCost: 2100, suggestedPrice: 2800, emoji: '🍝' },
  { barcode: '7702030001013', name: 'Papas Margarita Pollo 105g', category: 'Snacks', suggestedCost: 3200, suggestedPrice: 4200, emoji: '🥔' },
  { barcode: '7702030002020', name: 'De Todito Mixto 165g', category: 'Snacks', suggestedCost: 4800, suggestedPrice: 6000, emoji: '🥔' },
  { barcode: '7702032001012', name: 'Jabón Rey 300g', category: 'Aseo', suggestedCost: 2200, suggestedPrice: 2900, emoji: '🧼' },
  { barcode: '7702032002029', name: 'Detergente Fab Multiactivo 1kg', category: 'Aseo', suggestedCost: 8200, suggestedPrice: 10500, emoji: '🧼' },
  { barcode: '7702035001011', name: 'Papel Higiénico Familia 4 rollos', category: 'Aseo', suggestedCost: 5500, suggestedPrice: 7200, emoji: '🧻' },
  { barcode: '7702038001010', name: 'Crema Dental Colgate 75ml', category: 'Aseo Personal', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🪥' }
]

export function findMasterProduct(code: string): MasterProduct | undefined {
  if (!code) return undefined
  const cleanCode = code.trim()
  return COLOMBIA_MASTER_CATALOG.find(p => p.barcode === cleanCode)
}
