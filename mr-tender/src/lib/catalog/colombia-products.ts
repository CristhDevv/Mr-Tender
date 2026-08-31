export interface MasterProduct {
  barcode: string
  name: string
  category: string
  suggestedCost: number
  suggestedPrice: number
  emoji: string
  wholesalePrice?: number
  wholesaleMinQty?: number
  isWeighted?: boolean
}

export const COLOMBIA_MASTER_CATALOG: MasterProduct[] = [
  // ── LÁCTEOS Y DERIVADOS ──
  { barcode: '7702015001015', name: 'Leche Alquería Entera 1L', category: 'Lácteos', suggestedCost: 3600, suggestedPrice: 4400, emoji: '🥛', wholesalePrice: 4000, wholesaleMinQty: 6 },
  { barcode: '7702015001022', name: 'Leche Alquería Deslactosada 1L', category: 'Lácteos', suggestedCost: 3800, suggestedPrice: 4700, emoji: '🥛', wholesalePrice: 4300, wholesaleMinQty: 6 },
  { barcode: '7702015002022', name: 'Leche Alpina Entera 1L', category: 'Lácteos', suggestedCost: 3700, suggestedPrice: 4500, emoji: '🥛', wholesalePrice: 4100, wholesaleMinQty: 6 },
  { barcode: '7702015002039', name: 'Leche Colanta Entera 1L', category: 'Lácteos', suggestedCost: 3500, suggestedPrice: 4300, emoji: '🥛', wholesalePrice: 3900, wholesaleMinQty: 6 },
  { barcode: '7702015002046', name: 'Leche Colanta Deslactosada 1L', category: 'Lácteos', suggestedCost: 3700, suggestedPrice: 4600, emoji: '🥛', wholesalePrice: 4200, wholesaleMinQty: 6 },
  { barcode: '7702015003039', name: 'Arequipe Alpina 220g', category: 'Lácteos', suggestedCost: 4200, suggestedPrice: 5500, emoji: '🫙', wholesalePrice: 5000, wholesaleMinQty: 4 },
  { barcode: '7702015003046', name: 'Yogurt Alpina Fresa 1000g', category: 'Lácteos', suggestedCost: 7500, suggestedPrice: 9500, emoji: '🍓', wholesalePrice: 8800, wholesaleMinQty: 3 },
  { barcode: '7702015003053', name: 'Yogurt Alpina Melocotón 1000g', category: 'Lácteos', suggestedCost: 7500, suggestedPrice: 9500, emoji: '🍑', wholesalePrice: 8800, wholesaleMinQty: 3 },
  { barcode: '7702015003060', name: 'Alpin Fresa 180ml', category: 'Lácteos', suggestedCost: 2200, suggestedPrice: 2800, emoji: '🧃', wholesalePrice: 2500, wholesaleMinQty: 6 },
  { barcode: '7702015003077', name: 'Alpin Chocolate 180ml', category: 'Lácteos', suggestedCost: 2200, suggestedPrice: 2800, emoji: '🧃', wholesalePrice: 2500, wholesaleMinQty: 6 },
  { barcode: '7702015003084', name: 'Kumis Alpina Vaso 150g', category: 'Lácteos', suggestedCost: 2100, suggestedPrice: 2700, emoji: '🥛', wholesalePrice: 2400, wholesaleMinQty: 6 },
  { barcode: '7702015003091', name: 'Quesito Colanta 500g', category: 'Lácteos', suggestedCost: 9200, suggestedPrice: 11800, emoji: '🧀', wholesalePrice: 10800, wholesaleMinQty: 3 },
  { barcode: '7702015003107', name: 'Mantequilla Colanta con Sal 250g', category: 'Lácteos', suggestedCost: 6500, suggestedPrice: 8200, emoji: '🧈', wholesalePrice: 7500, wholesaleMinQty: 4 },
  { barcode: '7702015003114', name: 'Crema de Leche Alquería 200g', category: 'Lácteos', suggestedCost: 3200, suggestedPrice: 4200, emoji: '🥛', wholesalePrice: 3800, wholesaleMinQty: 6 },
  { barcode: '7702015003121', name: 'Leche Condensada La Lechera 395g', category: 'Lácteos', suggestedCost: 6800, suggestedPrice: 8800, emoji: '🥫', wholesalePrice: 8000, wholesaleMinQty: 4 },

  // ── ABARROTES Y DESPENSA ──
  { barcode: '7702010001018', name: 'Arroz Diana 1kg', category: 'Abarrotes', suggestedCost: 3800, suggestedPrice: 4600, emoji: '🍚', wholesalePrice: 4200, wholesaleMinQty: 10 },
  { barcode: '7702010001025', name: 'Arroz Diana 500g', category: 'Abarrotes', suggestedCost: 2000, suggestedPrice: 2500, emoji: '🍚', wholesalePrice: 2300, wholesaleMinQty: 12 },
  { barcode: '7702010002025', name: 'Arroz Roa 1kg', category: 'Abarrotes', suggestedCost: 3900, suggestedPrice: 4700, emoji: '🍚', wholesalePrice: 4300, wholesaleMinQty: 10 },
  { barcode: '7702010002032', name: 'Arroz Florhuila 1kg', category: 'Abarrotes', suggestedCost: 4000, suggestedPrice: 4900, emoji: '🍚', wholesalePrice: 4400, wholesaleMinQty: 10 },
  { barcode: '7702012001016', name: 'Aceite Premier Girasol 1L', category: 'Abarrotes', suggestedCost: 8500, suggestedPrice: 10500, emoji: '🫗', wholesalePrice: 9600, wholesaleMinQty: 6 },
  { barcode: '7702012001023', name: 'Aceite Diana 900ml', category: 'Abarrotes', suggestedCost: 7800, suggestedPrice: 9800, emoji: '🫗', wholesalePrice: 8900, wholesaleMinQty: 6 },
  { barcode: '7702012001030', name: 'Aceite Gourmet Familia 1L', category: 'Abarrotes', suggestedCost: 11500, suggestedPrice: 14200, emoji: '🫗', wholesalePrice: 13000, wholesaleMinQty: 4 },
  { barcode: '7702020001017', name: 'Café Sello Rojo 500g', category: 'Abarrotes', suggestedCost: 14500, suggestedPrice: 17800, emoji: '☕', wholesalePrice: 16200, wholesaleMinQty: 4 },
  { barcode: '7702020001024', name: 'Café Sello Rojo 250g', category: 'Abarrotes', suggestedCost: 7800, suggestedPrice: 9800, emoji: '☕', wholesalePrice: 8900, wholesaleMinQty: 6 },
  { barcode: '7702020002024', name: 'Café Colcafé Granulado 170g', category: 'Abarrotes', suggestedCost: 12000, suggestedPrice: 15200, emoji: '☕', wholesalePrice: 13800, wholesaleMinQty: 4 },
  { barcode: '7702020002031', name: 'Café Águila Roja 500g', category: 'Abarrotes', suggestedCost: 14000, suggestedPrice: 17200, emoji: '☕', wholesalePrice: 15600, wholesaleMinQty: 4 },
  { barcode: '7702020002048', name: 'Café Nescafé Tradición 200g', category: 'Abarrotes', suggestedCost: 16500, suggestedPrice: 20500, emoji: '☕', wholesalePrice: 18500, wholesaleMinQty: 3 },
  { barcode: '7702022001016', name: 'Harina Pan Amarilla 1kg', category: 'Abarrotes', suggestedCost: 4200, suggestedPrice: 5200, emoji: '🌽', wholesalePrice: 4700, wholesaleMinQty: 10 },
  { barcode: '7702022002023', name: 'Harina Pan Blanca 1kg', category: 'Abarrotes', suggestedCost: 4200, suggestedPrice: 5200, emoji: '🌽', wholesalePrice: 4700, wholesaleMinQty: 10 },
  { barcode: '7702022003037', name: 'Harina Promasa Blanca 1kg', category: 'Abarrotes', suggestedCost: 3800, suggestedPrice: 4800, emoji: '🌽', wholesalePrice: 4300, wholesaleMinQty: 10 },
  { barcode: '7702022004044', name: 'Harina Haz de Oros 1kg', category: 'Abarrotes', suggestedCost: 3900, suggestedPrice: 4900, emoji: '🌾', wholesalePrice: 4400, wholesaleMinQty: 10 },
  { barcode: '7702028001014', name: 'Pastas Doria Conchas 250g', category: 'Abarrotes', suggestedCost: 2100, suggestedPrice: 2800, emoji: '🍝', wholesalePrice: 2500, wholesaleMinQty: 12 },
  { barcode: '7702028001021', name: 'Pastas Doria Spaghetti 250g', category: 'Abarrotes', suggestedCost: 2100, suggestedPrice: 2800, emoji: '🍝', wholesalePrice: 2500, wholesaleMinQty: 12 },
  { barcode: '7702028001038', name: 'Pastas Doria Fideos 250g', category: 'Abarrotes', suggestedCost: 2100, suggestedPrice: 2800, emoji: '🍝', wholesalePrice: 2500, wholesaleMinQty: 12 },
  { barcode: '7702028002042', name: 'Pastas La Muñeca Spaghetti 250g', category: 'Abarrotes', suggestedCost: 2000, suggestedPrice: 2600, emoji: '🍝', wholesalePrice: 2300, wholesaleMinQty: 12 },
  { barcode: '7702028003056', name: 'Azúcar Incauca Blanca 1kg', category: 'Abarrotes', suggestedCost: 3800, suggestedPrice: 4600, emoji: '🍬', wholesalePrice: 4200, wholesaleMinQty: 10 },
  { barcode: '7702028003063', name: 'Azúcar Manuelita Morena 1kg', category: 'Abarrotes', suggestedCost: 3700, suggestedPrice: 4500, emoji: '🍬', wholesalePrice: 4100, wholesaleMinQty: 10 },
  { barcode: '7702028004077', name: 'Panela Cuadrada 500g', category: 'Abarrotes', suggestedCost: 2500, suggestedPrice: 3200, emoji: '🟫', wholesalePrice: 2900, wholesaleMinQty: 8 },
  { barcode: '7702028005081', name: 'Sal Refisal 1kg', category: 'Abarrotes', suggestedCost: 1800, suggestedPrice: 2400, emoji: '🧂', wholesalePrice: 2100, wholesaleMinQty: 12 },
  { barcode: '7702028006098', name: 'Frijol Bola Roja Diana 500g', category: 'Abarrotes', suggestedCost: 5500, suggestedPrice: 6900, emoji: '🫘', wholesalePrice: 6200, wholesaleMinQty: 6 },
  { barcode: '7702028007101', name: 'Lenteja Diana 500g', category: 'Abarrotes', suggestedCost: 3400, suggestedPrice: 4300, emoji: '🍲', wholesalePrice: 3900, wholesaleMinQty: 6 },
  { barcode: '7702028008118', name: 'Arveja Verde Diana 500g', category: 'Abarrotes', suggestedCost: 3100, suggestedPrice: 3900, emoji: '🟢', wholesalePrice: 3500, wholesaleMinQty: 6 },
  { barcode: '7702028009125', name: 'Atún Van Camps en Aceite 160g', category: 'Abarrotes', suggestedCost: 6200, suggestedPrice: 7900, emoji: '🐟', wholesalePrice: 7100, wholesaleMinQty: 6 },
  { barcode: '7702028009132', name: 'Atún Van Camps en Agua 160g', category: 'Abarrotes', suggestedCost: 6200, suggestedPrice: 7900, emoji: '🐟', wholesalePrice: 7100, wholesaleMinQty: 6 },
  { barcode: '7702028009149', name: 'Sardinas San Lucas en Tomate 425g', category: 'Abarrotes', suggestedCost: 5100, suggestedPrice: 6500, emoji: '🥫', wholesalePrice: 5800, wholesaleMinQty: 6 },
  { barcode: '7702028010152', name: 'Salsa de Tomate Fruco Doypack 400g', category: 'Abarrotes', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🍅', wholesalePrice: 5200, wholesaleMinQty: 6 },
  { barcode: '7702028010169', name: 'Mayonesa Fruco Doypack 380g', category: 'Abarrotes', suggestedCost: 5800, suggestedPrice: 7400, emoji: '🧴', wholesalePrice: 6700, wholesaleMinQty: 6 },
  { barcode: '7702028010176', name: 'Caldo de Gallina Maggi x 12 cubos', category: 'Abarrotes', suggestedCost: 3200, suggestedPrice: 4200, emoji: '📦', wholesalePrice: 3700, wholesaleMinQty: 6 },
  { barcode: '7702028010183', name: 'Chocolate Corona Tradicional 500g', category: 'Abarrotes', suggestedCost: 5900, suggestedPrice: 7500, emoji: '🍫', wholesalePrice: 6800, wholesaleMinQty: 6 },
  { barcode: '7702028010190', name: 'Chocolate Luker 500g', category: 'Abarrotes', suggestedCost: 5800, suggestedPrice: 7400, emoji: '🍫', wholesalePrice: 6700, wholesaleMinQty: 6 },

  // ── BEBIDAS Y REFRESCOS ──
  { barcode: '7702007001014', name: 'Gaseosa Coca-Cola 1.5L', category: 'Bebidas', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🥤', wholesalePrice: 5200, wholesaleMinQty: 6 },
  { barcode: '7702007001021', name: 'Gaseosa Coca-Cola 400ml Pet', category: 'Bebidas', suggestedCost: 2200, suggestedPrice: 3000, emoji: '🥤', wholesalePrice: 2600, wholesaleMinQty: 12 },
  { barcode: '7702007001038', name: 'Gaseosa Coca-Cola 3L Pet', category: 'Bebidas', suggestedCost: 7800, suggestedPrice: 9800, emoji: '🥤', wholesalePrice: 8900, wholesaleMinQty: 4 },
  { barcode: '7702007001045', name: 'Gaseosa Coca-Cola Zero 1.5L', category: 'Bebidas', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🥤', wholesalePrice: 5200, wholesaleMinQty: 6 },
  { barcode: '7702007002021', name: 'Gaseosa Postobón Manzana 1.5L', category: 'Bebidas', suggestedCost: 3800, suggestedPrice: 4800, emoji: '🥤', wholesalePrice: 4300, wholesaleMinQty: 6 },
  { barcode: '7702007002038', name: 'Gaseosa Postobón Manzana 3L', category: 'Bebidas', suggestedCost: 6500, suggestedPrice: 8200, emoji: '🥤', wholesalePrice: 7400, wholesaleMinQty: 4 },
  { barcode: '7702007003038', name: 'Gaseosa Colombiana 1.5L', category: 'Bebidas', suggestedCost: 3800, suggestedPrice: 4800, emoji: '🥤', wholesalePrice: 4300, wholesaleMinQty: 6 },
  { barcode: '7702007003045', name: 'Gaseosa Colombiana 3L', category: 'Bebidas', suggestedCost: 6500, suggestedPrice: 8200, emoji: '🥤', wholesalePrice: 7400, wholesaleMinQty: 4 },
  { barcode: '7702007004059', name: 'Gaseosa Cuatro Toronja 1.5L', category: 'Bebidas', suggestedCost: 4200, suggestedPrice: 5500, emoji: '🥤', wholesalePrice: 4900, wholesaleMinQty: 6 },
  { barcode: '7702007005063', name: 'Gaseosa Sprite 1.5L', category: 'Bebidas', suggestedCost: 4200, suggestedPrice: 5500, emoji: '🥤', wholesalePrice: 4900, wholesaleMinQty: 6 },
  { barcode: '7702007006070', name: 'Agua Cristal Sin Gas 600ml', category: 'Bebidas', suggestedCost: 1500, suggestedPrice: 2200, emoji: '💧', wholesalePrice: 1800, wholesaleMinQty: 12 },
  { barcode: '7702007006087', name: 'Agua Cristal Sin Gas 5L Garrafa', category: 'Bebidas', suggestedCost: 5500, suggestedPrice: 7200, emoji: '🧴', wholesalePrice: 6400, wholesaleMinQty: 4 },
  { barcode: '7702007007094', name: 'Agua Brisa Con Gas 600ml', category: 'Bebidas', suggestedCost: 1600, suggestedPrice: 2400, emoji: '🫧', wholesalePrice: 2000, wholesaleMinQty: 12 },
  { barcode: '7702007008107', name: 'Jugo Hit Mango 500ml Pet', category: 'Bebidas', suggestedCost: 2300, suggestedPrice: 3000, emoji: '🥭', wholesalePrice: 2700, wholesaleMinQty: 12 },
  { barcode: '7702007008114', name: 'Jugo Hit Mora 500ml Pet', category: 'Bebidas', suggestedCost: 2300, suggestedPrice: 3000, emoji: '🫐', wholesalePrice: 2700, wholesaleMinQty: 12 },
  { barcode: '7702007008121', name: 'Jugo Hit Lulo 500ml Pet', category: 'Bebidas', suggestedCost: 2300, suggestedPrice: 3000, emoji: '🧃', wholesalePrice: 2700, wholesaleMinQty: 12 },
  { barcode: '7702007009138', name: 'Pony Malta Pet 330ml', category: 'Bebidas', suggestedCost: 1800, suggestedPrice: 2500, emoji: '🌾', wholesalePrice: 2100, wholesaleMinQty: 12 },
  { barcode: '7702007009145', name: 'Pony Malta 1.5L', category: 'Bebidas', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🌾', wholesalePrice: 5200, wholesaleMinQty: 6 },
  { barcode: '7702007010158', name: 'Bebida Energizante Speed Max 269ml', category: 'Bebidas', suggestedCost: 1800, suggestedPrice: 2500, emoji: '⚡', wholesalePrice: 2100, wholesaleMinQty: 12 },
  { barcode: '7702007010165', name: 'Bebida Energizante Red Bull 250ml', category: 'Bebidas', suggestedCost: 5500, suggestedPrice: 7500, emoji: '⚡', wholesalePrice: 6700, wholesaleMinQty: 6 },
  { barcode: '7702007011172', name: 'Gatorade Frutas Tropicales 500ml', category: 'Bebidas', suggestedCost: 3200, suggestedPrice: 4200, emoji: '🏃', wholesalePrice: 3700, wholesaleMinQty: 6 },

  // ── CERVEZAS Y LICORES ──
  { barcode: '7702004005013', name: 'Cerveza Poker Lata 330ml', category: 'Licores', suggestedCost: 2400, suggestedPrice: 3200, emoji: '🍺', wholesalePrice: 2800, wholesaleMinQty: 24 },
  { barcode: '7702004006027', name: 'Cerveza Águila Original Lata 330ml', category: 'Licores', suggestedCost: 2300, suggestedPrice: 3000, emoji: '🍺', wholesalePrice: 2700, wholesaleMinQty: 24 },
  { barcode: '7702004006034', name: 'Cerveza Águila Light Lata 330ml', category: 'Licores', suggestedCost: 2300, suggestedPrice: 3000, emoji: '🍺', wholesalePrice: 2700, wholesaleMinQty: 24 },
  { barcode: '7702004007041', name: 'Cerveza Club Colombia Dorada Lata 330ml', category: 'Licores', suggestedCost: 2800, suggestedPrice: 3800, emoji: '🍺', wholesalePrice: 3300, wholesaleMinQty: 24 },
  { barcode: '7702004007058', name: 'Cerveza Club Colombia Roja Lata 330ml', category: 'Licores', suggestedCost: 2800, suggestedPrice: 3800, emoji: '🍺', wholesalePrice: 3300, wholesaleMinQty: 24 },
  { barcode: '7702004008065', name: 'Cerveza Corona Extra 355ml Botella', category: 'Licores', suggestedCost: 4500, suggestedPrice: 6000, emoji: '🍻', wholesalePrice: 5200, wholesaleMinQty: 12 },
  { barcode: '7702004009072', name: 'Aguardiente Antioqueño Azul 750ml', category: 'Licores', suggestedCost: 38000, suggestedPrice: 46000, emoji: '🍶', wholesalePrice: 42000, wholesaleMinQty: 3 },
  { barcode: '7702004009089', name: 'Aguardiente Antioqueño Verde 750ml', category: 'Licores', suggestedCost: 38000, suggestedPrice: 46000, emoji: '🍶', wholesalePrice: 42000, wholesaleMinQty: 3 },
  { barcode: '7702004009096', name: 'Aguardiente Néctar Azul 750ml', category: 'Licores', suggestedCost: 36000, suggestedPrice: 44000, emoji: '🍶', wholesalePrice: 40000, wholesaleMinQty: 3 },
  { barcode: '7702004010108', name: 'Ron Viejo de Caldas 3 Años 750ml', category: 'Licores', suggestedCost: 42000, suggestedPrice: 52000, emoji: '🥃', wholesalePrice: 47000, wholesaleMinQty: 3 },
  { barcode: '7702004010115', name: 'Ron Medellín Añejo 3 Años 750ml', category: 'Licores', suggestedCost: 40000, suggestedPrice: 50000, emoji: '🥃', wholesalePrice: 45000, wholesaleMinQty: 3 },

  // ── DULCERÍA, GALLETAS Y SNACKS ──
  { barcode: '7702001001018', name: 'Chocolatina Jet 12g', category: 'Dulcería', suggestedCost: 600, suggestedPrice: 900, emoji: '🍫', wholesalePrice: 750, wholesaleMinQty: 24 },
  { barcode: '7702001001025', name: 'Chocolatina Jet Jumbo Maní 100g', category: 'Dulcería', suggestedCost: 4200, suggestedPrice: 5500, emoji: '🍫', wholesalePrice: 4900, wholesaleMinQty: 6 },
  { barcode: '7702001002039', name: 'Bombón Bon Bon Bum Fresa x 24', category: 'Dulcería', suggestedCost: 8500, suggestedPrice: 11500, emoji: '🍭', wholesalePrice: 10000, wholesaleMinQty: 4 },
  { barcode: '7702001003043', name: 'Gomas Trululu Aros 90g', category: 'Dulcería', suggestedCost: 2500, suggestedPrice: 3400, emoji: '🍬', wholesalePrice: 3000, wholesaleMinQty: 10 },
  { barcode: '7702001004057', name: 'Chiclets Adams Menta x 2s', category: 'Dulcería', suggestedCost: 400, suggestedPrice: 600, emoji: '🍬', wholesalePrice: 500, wholesaleMinQty: 20 },
  { barcode: '7702018001014', name: 'Galletas Festival Chocolate 402g', category: 'Galletas', suggestedCost: 5200, suggestedPrice: 6800, emoji: '🍪', wholesalePrice: 6000, wholesaleMinQty: 6 },
  { barcode: '7702018001021', name: 'Galletas Festival Vainilla 402g', category: 'Galletas', suggestedCost: 5200, suggestedPrice: 6800, emoji: '🍪', wholesalePrice: 6000, wholesaleMinQty: 6 },
  { barcode: '7702018002021', name: 'Galletas Ducales Tradicional 294g', category: 'Galletas', suggestedCost: 4500, suggestedPrice: 5600, emoji: '🍪', wholesalePrice: 5000, wholesaleMinQty: 6 },
  { barcode: '7702018003038', name: 'Galletas Saltín Noel Tradicional 3 Tacos', category: 'Galletas', suggestedCost: 4900, suggestedPrice: 6200, emoji: '🍘', wholesalePrice: 5500, wholesaleMinQty: 6 },
  { barcode: '7702018004045', name: 'Galletas Oreo Original Tubo 118g', category: 'Galletas', suggestedCost: 2800, suggestedPrice: 3800, emoji: '🍪', wholesalePrice: 3300, wholesaleMinQty: 10 },
  { barcode: '7702030001013', name: 'Papas Margarita Pollo 105g', category: 'Snacks', suggestedCost: 3200, suggestedPrice: 4200, emoji: '🥔', wholesalePrice: 3700, wholesaleMinQty: 8 },
  { barcode: '7702030001020', name: 'Papas Margarita Limón 105g', category: 'Snacks', suggestedCost: 3200, suggestedPrice: 4200, emoji: '🥔', wholesalePrice: 3700, wholesaleMinQty: 8 },
  { barcode: '7702030001037', name: 'Papas Margarita Natural 105g', category: 'Snacks', suggestedCost: 3200, suggestedPrice: 4200, emoji: '🥔', wholesalePrice: 3700, wholesaleMinQty: 8 },
  { barcode: '7702030002020', name: 'De Todito Mixto 165g', category: 'Snacks', suggestedCost: 4800, suggestedPrice: 6000, emoji: '🥔', wholesalePrice: 5400, wholesaleMinQty: 6 },
  { barcode: '7702030003034', name: 'Doritos Mega Queso 160g', category: 'Snacks', suggestedCost: 4800, suggestedPrice: 6000, emoji: '🧀', wholesalePrice: 5400, wholesaleMinQty: 6 },
  { barcode: '7702030004041', name: 'Choclitos Limón 110g', category: 'Snacks', suggestedCost: 2600, suggestedPrice: 3500, emoji: '🌽', wholesalePrice: 3000, wholesaleMinQty: 10 },
  { barcode: '7702030005058', name: 'Maní La Especial con Sal 180g', category: 'Snacks', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🥜', wholesalePrice: 5100, wholesaleMinQty: 6 },
  { barcode: '7702030005065', name: 'Maní Moto La Especial 180g', category: 'Snacks', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🥜', wholesalePrice: 5100, wholesaleMinQty: 6 },

  // ── ASEO DEL HOGAR Y CUIDADO PERSONAL ──
  { barcode: '7702032001012', name: 'Jabón Rey 300g Barra', category: 'Aseo Hogar', suggestedCost: 2200, suggestedPrice: 2900, emoji: '🧼', wholesalePrice: 2500, wholesaleMinQty: 12 },
  { barcode: '7702032002029', name: 'Detergente Fab Multiactivo 1kg', category: 'Aseo Hogar', suggestedCost: 8200, suggestedPrice: 10500, emoji: '🧼', wholesalePrice: 9300, wholesaleMinQty: 4 },
  { barcode: '7702032002036', name: 'Detergente Ariel Doble Poder 1kg', category: 'Aseo Hogar', suggestedCost: 9500, suggestedPrice: 12200, emoji: '🧼', wholesalePrice: 10800, wholesaleMinQty: 4 },
  { barcode: '7702032003043', name: 'Blanqueador Clorox 1000ml', category: 'Aseo Hogar', suggestedCost: 3500, suggestedPrice: 4600, emoji: '🧴', wholesalePrice: 4000, wholesaleMinQty: 6 },
  { barcode: '7702032004050', name: 'Lavaplatos Axion Limón Pasta 450g', category: 'Aseo Hogar', suggestedCost: 3900, suggestedPrice: 5100, emoji: '🍋', wholesalePrice: 4500, wholesaleMinQty: 6 },
  { barcode: '7702032005067', name: 'Suavizante Suavitel Fresca Primavera 850ml', category: 'Aseo Hogar', suggestedCost: 6500, suggestedPrice: 8400, emoji: '🌸', wholesalePrice: 7400, wholesaleMinQty: 4 },
  { barcode: '7702032006074', name: 'Limpia Pisos Ajax Lavanda 1000ml', category: 'Aseo Hogar', suggestedCost: 4800, suggestedPrice: 6200, emoji: '🪣', wholesalePrice: 5500, wholesaleMinQty: 6 },
  { barcode: '7702035001011', name: 'Papel Higiénico Familia Acolchamax 4 Rollos', category: 'Cuidado Personal', suggestedCost: 5500, suggestedPrice: 7200, emoji: '🧻', wholesalePrice: 6300, wholesaleMinQty: 6 },
  { barcode: '7702035001028', name: 'Servilletas Familia Acolchadas x 100', category: 'Cuidado Personal', suggestedCost: 2800, suggestedPrice: 3800, emoji: '🧻', wholesalePrice: 3300, wholesaleMinQty: 10 },
  { barcode: '7702038001010', name: 'Crema Dental Colgate Triple Acción 75ml', category: 'Cuidado Personal', suggestedCost: 4500, suggestedPrice: 5800, emoji: '🪥', wholesalePrice: 5100, wholesaleMinQty: 6 },
  { barcode: '7702038001027', name: 'Crema Dental Colgate Total 12 75ml', category: 'Cuidado Personal', suggestedCost: 6200, suggestedPrice: 7900, emoji: '🪥', wholesalePrice: 7000, wholesaleMinQty: 6 },
  { barcode: '7702038002034', name: 'Jabón de Baño Protex Antibacterial 110g', category: 'Cuidado Personal', suggestedCost: 2800, suggestedPrice: 3700, emoji: '🧼', wholesalePrice: 3200, wholesaleMinQty: 12 },
  { barcode: '7702038002041', name: 'Jabón de Baño Palmolive Naturals 110g', category: 'Cuidado Personal', suggestedCost: 2600, suggestedPrice: 3500, emoji: '🧼', wholesalePrice: 3000, wholesaleMinQty: 12 },
  { barcode: '7702038003058', name: 'Shampoo Head & Shoulders Limpieza Renovadora 375ml', category: 'Cuidado Personal', suggestedCost: 14500, suggestedPrice: 18500, emoji: '🧴', wholesalePrice: 16500, wholesaleMinQty: 3 },
  { barcode: '7702038003065', name: 'Shampoo Savital Biotina 500ml', category: 'Cuidado Personal', suggestedCost: 9500, suggestedPrice: 12500, emoji: '🧴', wholesalePrice: 11000, wholesaleMinQty: 4 },
  { barcode: '7702038004072', name: 'Desodorante Rexona Clinical Hombre 50g', category: 'Cuidado Personal', suggestedCost: 16500, suggestedPrice: 21000, emoji: '✨', wholesalePrice: 18800, wholesaleMinQty: 3 },
  { barcode: '7702038004089', name: 'Desodorante Speed Stick 50g', category: 'Cuidado Personal', suggestedCost: 8500, suggestedPrice: 11000, emoji: '✨', wholesalePrice: 9700, wholesaleMinQty: 4 },
  { barcode: '7702038005096', name: 'Toallas Higiénicas Nosotras Buenas Noches x 8', category: 'Cuidado Personal', suggestedCost: 4800, suggestedPrice: 6400, emoji: '🌸', wholesalePrice: 5600, wholesaleMinQty: 6 },
  { barcode: '7702038006102', name: 'Máquina de Afeitar Gillette Prestobarba3 x 2', category: 'Cuidado Personal', suggestedCost: 7500, suggestedPrice: 9800, emoji: '🪒', wholesalePrice: 8600, wholesaleMinQty: 6 },

  // ── PANADERÍA, EMBUTIDOS Y CHARCUTERÍA ──
  { barcode: '7702025001015', name: 'Pan Bimbo Blanco Grande 500g', category: 'Panadería', suggestedCost: 6500, suggestedPrice: 8200, emoji: '🍞', wholesalePrice: 7300, wholesaleMinQty: 4 },
  { barcode: '7702025001022', name: 'Pan Bimbo Integral Grande 500g', category: 'Panadería', suggestedCost: 7200, suggestedPrice: 9200, emoji: '🍞', wholesalePrice: 8200, wholesaleMinQty: 4 },
  { barcode: '7702025002036', name: 'Tostadas Susanita Tradicionales 200g', category: 'Panadería', suggestedCost: 3800, suggestedPrice: 4900, emoji: '🥖', wholesalePrice: 4300, wholesaleMinQty: 6 },
  { barcode: '7702025003040', name: 'Arepas de Maíz Blanco Doña Aleja x 5', category: 'Panadería', suggestedCost: 2400, suggestedPrice: 3200, emoji: '🫓', wholesalePrice: 2800, wholesaleMinQty: 6 },
  { barcode: '7702040001019', name: 'Salchicha Zenú Manguera 500g', category: 'Charcutería', suggestedCost: 8500, suggestedPrice: 10900, emoji: '🌭', wholesalePrice: 9700, wholesaleMinQty: 4 },
  { barcode: '7702040001026', name: 'Salchichón Zenú Tradicional 500g', category: 'Charcutería', suggestedCost: 7800, suggestedPrice: 9900, emoji: '🥩', wholesalePrice: 8800, wholesaleMinQty: 4 },
  { barcode: '7702040001033', name: 'Jamón de Cerdo Pietrán Tajado 200g', category: 'Charcutería', suggestedCost: 6900, suggestedPrice: 8900, emoji: '🍖', wholesalePrice: 7900, wholesaleMinQty: 4 },
  { barcode: '7702040002047', name: 'Mortadela Rica Tajada 250g', category: 'Charcutería', suggestedCost: 4500, suggestedPrice: 5900, emoji: '🥓', wholesalePrice: 5200, wholesaleMinQty: 6 }
]

export function findMasterProduct(code: string): MasterProduct | undefined {
  if (!code) return undefined
  const cleanCode = code.trim()
  return COLOMBIA_MASTER_CATALOG.find(p => p.barcode === cleanCode)
}

export function searchMasterCatalog(query: string): MasterProduct[] {
  if (!query) return []
  const q = query.toLowerCase().trim()
  return COLOMBIA_MASTER_CATALOG.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.barcode.includes(q) ||
    p.category.toLowerCase().includes(q)
  )
}
