export interface SeedProduct {
  name: string
  sku?: string
  barcode?: string
  price: number
  cost_price: number
  min_stock: number
  initial_stock: number
  category: string
  unit_type?: string
  description?: string
}

export const SEEDS_BY_VERTICAL: Record<string, SeedProduct[]> = {
  pharmacy: [
    {
      name: 'Acetaminofén 500mg x 100 Tabletas (MK)',
      sku: 'MED-ACT-500',
      barcode: '7702057001011',
      price: 8500,
      cost_price: 4200,
      min_stock: 10,
      initial_stock: 45,
      category: 'Analgésicos & Antipiréticos',
      unit_type: 'Caja',
      description: 'Registro Sanitario INVIMA 2018M-0001234. Venta Libre.'
    },
    {
      name: 'Ibuprofeno 400mg x 50 Cápsulas Blandas (Genfar)',
      sku: 'MED-IBU-400',
      barcode: '7702057001028',
      price: 12000,
      cost_price: 6800,
      min_stock: 8,
      initial_stock: 30,
      category: 'Antiinflamatorios',
      unit_type: 'Caja',
      description: 'Registro Sanitario INVIMA 2019M-0005678. Venta Libre.'
    },
    {
      name: 'Amoxicilina 500mg x 30 Cápsulas (Lafrancol)',
      sku: 'MED-AMX-500',
      barcode: '7702057001035',
      price: 18500,
      cost_price: 10500,
      min_stock: 5,
      initial_stock: 20,
      category: 'Antibióticos',
      unit_type: 'Caja',
      description: 'Registro Sanitario INVIMA 2017M-0009876. Venta con Fórmula Médica.'
    },
    {
      name: 'Loratadina 10mg x 20 Tabletas (MK)',
      sku: 'MED-LOR-010',
      barcode: '7702057001042',
      price: 6500,
      cost_price: 3200,
      min_stock: 10,
      initial_stock: 50,
      category: 'Antihistamínicos',
      unit_type: 'Caja',
      description: 'Registro Sanitario INVIMA 2020M-0004321. Venta Libre.'
    },
    {
      name: 'Omeprazol 20mg x 30 Cápsulas (Genfar)',
      sku: 'MED-OMP-020',
      barcode: '7702057001059',
      price: 9800,
      cost_price: 4900,
      min_stock: 8,
      initial_stock: 35,
      category: 'Gastroenterología',
      unit_type: 'Caja',
      description: 'Registro Sanitario INVIMA 2019M-0007890. Venta Libre.'
    },
    {
      name: 'Suero Oral Electrolitos Manzana 500ml (Pedialyte)',
      sku: 'MED-SUE-500',
      barcode: '7702057001066',
      price: 9500,
      cost_price: 5400,
      min_stock: 12,
      initial_stock: 40,
      category: 'Hidratación & Cuidado',
      unit_type: 'Frasco',
      description: 'Registro Sanitario INVIMA 2021M-0011223. Bebida hidratante oral.'
    },
    {
      name: 'Alcohol Antiséptico 70% x 500ml',
      sku: 'MED-ALC-500',
      barcode: '7702057001073',
      price: 5500,
      cost_price: 2800,
      min_stock: 15,
      initial_stock: 60,
      category: 'Primeros Auxilios',
      unit_type: 'Frasco',
      description: 'Uso tópico antiséptico para desinfección.'
    }
  ],

  restaurant: [
    {
      name: 'Bandeja Paisa Tradicional',
      sku: 'RES-BAN-001',
      price: 32000,
      cost_price: 14500,
      min_stock: 5,
      initial_stock: 25,
      category: 'Platos Fuertes',
      description: 'Carne molida, chicharrón crocante, huevo, frijolada, arroz, tajada y aguacate.'
    },
    {
      name: 'Lomo al Trapo con Papas Rústicas',
      sku: 'RES-LOM-002',
      price: 38000,
      cost_price: 17000,
      min_stock: 4,
      initial_stock: 20,
      category: 'Platos Fuertes',
      description: 'Corte fino de res 300g envuelto en costra de sal y vino, con papas rústicas.'
    },
    {
      name: 'Ajiaco Santafereño con Pollo Desmechado',
      sku: 'RES-AJI-003',
      price: 28000,
      cost_price: 11000,
      min_stock: 5,
      initial_stock: 30,
      category: 'Sopas & Típicos',
      description: 'Con tres tipos de papa, guascas, mazorca, arroz, alcaparras y crema de leche.'
    },
    {
      name: 'Hamburguesa Artesanal Angus Doble Queso',
      sku: 'RES-HAM-004',
      price: 26000,
      cost_price: 10500,
      min_stock: 10,
      initial_stock: 40,
      category: 'Comidas Rápidas',
      description: '180g carne Angus, queso cheddar fundido, tocineta ahumada y papas a la francesa.'
    },
    {
      name: 'Porción de Patacones con Hogao Casero',
      sku: 'RES-PAT-005',
      price: 12000,
      cost_price: 3800,
      min_stock: 8,
      initial_stock: 35,
      category: 'Entradas',
      description: '4 patacones crocantes de plátano verde con hogao criollo.'
    },
    {
      name: 'Limonada de Coco Natural 450ml',
      sku: 'RES-LIM-006',
      price: 9000,
      cost_price: 2800,
      min_stock: 15,
      initial_stock: 50,
      category: 'Bebidas & Jugos',
      description: 'Leche de coco cremosa con zumo de limón fresco y hielo frappé.'
    },
    {
      name: 'Cerveza Club Colombia Dorada 330ml',
      sku: 'RES-CER-007',
      price: 6500,
      cost_price: 3100,
      min_stock: 24,
      initial_stock: 72,
      category: 'Cervezas & Licores',
      description: 'Cerveza tipo Lager prémium 4.7% Alc.'
    }
  ],

  gym: [
    {
      name: 'Membresía Mensual VIP Libre Acceso',
      sku: 'GYM-MEM-001',
      price: 120000,
      cost_price: 25000,
      min_stock: 0,
      initial_stock: 100,
      category: 'Membresías',
      description: 'Acceso ilimitado a zona de pesas, cardio, clases grupales y sauna por 30 días.'
    },
    {
      name: 'Pase Diario Fitness & Crossfit',
      sku: 'GYM-DIA-002',
      price: 15000,
      cost_price: 2000,
      min_stock: 0,
      initial_stock: 200,
      category: 'Pases Diarios',
      description: 'Pase libre para un día de entrenamiento en cualquier sede.'
    },
    {
      name: 'Proteína Whey Isolate 2lb (Vainilla)',
      sku: 'GYM-PRO-003',
      price: 165000,
      cost_price: 110000,
      min_stock: 4,
      initial_stock: 15,
      category: 'Suplementos',
      description: '25g de proteína por porción, cero azúcar y baja en carbohidratos.'
    },
    {
      name: 'Bebida Hidratante Gatorade 500ml',
      sku: 'GYM-BEB-004',
      price: 4500,
      cost_price: 2300,
      min_stock: 12,
      initial_stock: 48,
      category: 'Bebidas & Snacks',
      description: 'Reposición de electrolitos sabores Blue Cherry / Mandarina.'
    },
    {
      name: 'Cuerda de Salto de Alta Velocidad (Crossfit)',
      sku: 'GYM-ACC-005',
      price: 35000,
      cost_price: 16000,
      min_stock: 3,
      initial_stock: 10,
      category: 'Accesorios',
      description: 'Cable de acero con rodamientos 360° para saltos dobles.'
    }
  ],

  veterinary: [
    {
      name: 'Consulta Médica Veterinaria General',
      sku: 'VET-CON-001',
      price: 45000,
      cost_price: 10000,
      min_stock: 0,
      initial_stock: 100,
      category: 'Servicios Médicos',
      description: 'Examen clínico general, constantes vitales y diagnóstico médico pet.'
    },
    {
      name: 'Vacunación Quíntuple Canina (Refuerzo Anual)',
      sku: 'VET-VAC-002',
      price: 65000,
      cost_price: 28000,
      min_stock: 6,
      initial_stock: 20,
      category: 'Vacunación',
      description: 'Protección contra Parvovirus, Moquillo, Hepatitis, Parainfluenza y Leptospira.'
    },
    {
      name: 'Baño, Corte de Uñas y Limpieza de Oídos (Raza Pequeña)',
      sku: 'VET-SPA-003',
      price: 38000,
      cost_price: 9000,
      min_stock: 0,
      initial_stock: 50,
      category: 'Grooming & Spa',
      description: 'Champú medicado o antipulgas, cepillado y perfume pet.'
    },
    {
      name: 'Alimento Concentrado Dog Chow Adulto 2kg',
      sku: 'VET-ALI-004',
      price: 28500,
      cost_price: 19000,
      min_stock: 5,
      initial_stock: 18,
      category: 'Nutrición Pet',
      description: 'Nutrición completa con prebióticos y proteínas seleccionadas.'
    },
    {
      name: 'Pipeta Antipulgas y Garrapatas NexGard 10-25kg',
      sku: 'VET-PIP-005',
      price: 48000,
      cost_price: 32000,
      min_stock: 4,
      initial_stock: 15,
      category: 'Farmacia Pet',
      description: 'Tableta masticable sabor carne, protección efectiva durante 30 días.'
    }
  ],

  apparel: [
    {
      name: 'Camisa Lino Slim Fit Manga Larga (Blanco / Talla M)',
      sku: 'APP-CAM-001',
      price: 110000,
      cost_price: 48000,
      min_stock: 3,
      initial_stock: 12,
      category: 'Camisas & Blusas',
      description: '100% lino prémium con botones nacarados.'
    },
    {
      name: 'Jean Denim Mom Fit Tiro Alto (Azul Medio / Talla 8)',
      sku: 'APP-JEA-002',
      price: 135000,
      cost_price: 58000,
      min_stock: 4,
      initial_stock: 15,
      category: 'Pantalones & Jeans',
      description: 'Denim rígido 100% algodón con silueta vintage.'
    },
    {
      name: 'Vestido Casual Midi Estampado Floral',
      sku: 'APP-VES-003',
      price: 145000,
      cost_price: 62000,
      min_stock: 2,
      initial_stock: 8,
      category: 'Vestidos',
      description: 'Tela viscosa fresca con ajuste a la cintura.'
    },
    {
      name: 'Blazer Sastrado Estructurado Negro',
      sku: 'APP-BLA-004',
      price: 180000,
      cost_price: 82000,
      min_stock: 2,
      initial_stock: 6,
      category: 'Chaquetas & Abrigos',
      description: 'Forro interno suave y solapas clásicas.'
    }
  ],

  automotive: [
    {
      name: 'Cambio de Aceite Sintético 10W-40 + Filtro de Aceite',
      sku: 'AUT-ACE-001',
      price: 145000,
      cost_price: 85000,
      min_stock: 6,
      initial_stock: 20,
      category: 'Mantenimiento Motor',
      description: 'Incluye 1 galón de aceite de alta gama y mano de obra de reemplazo.'
    },
    {
      name: 'Pastillas de Freno Delanteras (Cerámica)',
      sku: 'AUT-FRE-002',
      price: 120000,
      cost_price: 65000,
      min_stock: 3,
      initial_stock: 10,
      category: 'Frenos & Suspensión',
      description: 'Juego de 4 pastillas cerámicas de bajo polvo y alta frenada.'
    },
    {
      name: 'Alineación Láser + Balanceo 4 Ruedas',
      sku: 'AUT-ALI-003',
      price: 60000,
      cost_price: 12000,
      min_stock: 0,
      initial_stock: 50,
      category: 'Serviteca',
      description: 'Ajuste de convergencia y plomos de balanceo computarizados.'
    },
    {
      name: 'Lavado General de Carrocería, Motor y Chasis',
      sku: 'AUT-LAV-004',
      price: 35000,
      cost_price: 8000,
      min_stock: 0,
      initial_stock: 100,
      category: 'Autolavado',
      description: 'Champú con cera, desengrase de motor y silicona en llantas.'
    }
  ],

  beauty_salon: [
    {
      name: 'Corte de Cabello Estilo & Cepillado Dama',
      sku: 'SAL-COR-001',
      price: 45000,
      cost_price: 8000,
      min_stock: 0,
      initial_stock: 100,
      category: 'Peluquería Dama',
      description: 'Lavado con champú sin sal, corte de diseño, blower y sellado térmico.'
    },
    {
      name: 'Corte Clásico Barba & Toalla Caliente Caballero',
      sku: 'SAL-BAR-002',
      price: 35000,
      cost_price: 5000,
      min_stock: 0,
      initial_stock: 100,
      category: 'Barbería Caballero',
      description: 'Perfilado de barba con navaja desechable, aceites esenciales y toalla tibia.'
    },
    {
      name: 'Manicure & Pedicure Spa Tradicional',
      sku: 'SAL-SPA-003',
      price: 40000,
      cost_price: 7000,
      min_stock: 0,
      initial_stock: 100,
      category: 'Uñas & Manos',
      description: 'Exfoliación con sales marinas, hidratación profunda y esmaltado Masglo.'
    },
    {
      name: 'Tratamiento Botox Capilar Reestructurante 500ml',
      sku: 'SAL-BOT-004',
      price: 120000,
      cost_price: 45000,
      min_stock: 3,
      initial_stock: 10,
      category: 'Tratamientos Capilares',
      description: 'Relleno de hebra capilar con ácido hialurónico y colágeno.'
    }
  ],

  hardware: [
    {
      name: 'Cemento Gris Portland Tipo 1 x 50kg (Argos)',
      sku: 'FER-CEM-001',
      barcode: '7701234005011',
      price: 34500,
      cost_price: 28000,
      min_stock: 20,
      initial_stock: 80,
      category: 'Materiales Pesados',
      unit_type: 'Bulto',
      description: 'Cemento estructural para fundición de placas, columnas y mampostería.'
    },
    {
      name: 'Varilla Corrugada 1/2 Pulgada x 6 Metros (Diaco)',
      sku: 'FER-VAR-002',
      price: 28000,
      cost_price: 22500,
      min_stock: 30,
      initial_stock: 120,
      category: 'Hierros & Acero',
      unit_type: 'Unidad',
      description: 'Acero de refuerzo sismorresistente Grado 60.'
    },
    {
      name: 'Taladro Percutor 1/2 Pulgada 650W (DeWalt)',
      sku: 'FER-TAL-003',
      barcode: '7701234005035',
      price: 245000,
      cost_price: 175000,
      min_stock: 2,
      initial_stock: 6,
      category: 'Herramientas Eléctricas',
      unit_type: 'Caja',
      description: 'Mandril de 13mm, velocidad variable reversible y selector de percusión.'
    },
    {
      name: 'Pintura Vinilo Tipo 1 Blanco Galón (Pintuco)',
      sku: 'FER-PIN-004',
      barcode: '7701234005042',
      price: 68000,
      cost_price: 49000,
      min_stock: 6,
      initial_stock: 24,
      category: 'Pinturas & Acabados',
      unit_type: 'Galón',
      description: 'Pintura plástica base agua superlavable de alto cubrimiento.'
    }
  ],

  bakery: [
    {
      name: 'Pan Francés Tradicional (Bolsa x 5 Unidades)',
      sku: 'PAN-FRA-001',
      price: 4000,
      cost_price: 1800,
      min_stock: 15,
      initial_stock: 50,
      category: 'Panes Tradicionales',
      unit_type: 'Paquete',
      description: 'Corteza dorada y crocante con miga suave horneado diario.'
    },
    {
      name: 'Pandebono Valluno Horneado Caliente',
      sku: 'PAN-BON-002',
      price: 2200,
      cost_price: 900,
      min_stock: 20,
      initial_stock: 60,
      category: 'Amasijos Típicos',
      unit_type: 'Unidad',
      description: 'Elaborado con queso costeño fresco, almidón de yuca y harina de maíz.'
    },
    {
      name: 'Torta de Chocolate y Arequipe Artesanal (1 Libra)',
      sku: 'PAN-TOR-003',
      price: 48000,
      cost_price: 21000,
      min_stock: 2,
      initial_stock: 6,
      category: 'Repostería & Tortas',
      unit_type: 'Unidad',
      description: 'Bizcocho húmedo de cacao al 70% relleno con arequipe de leche de campo.'
    },
    {
      name: 'Croissant Hojaldrado Mantequilla',
      sku: 'PAN-CRO-004',
      price: 3500,
      cost_price: 1400,
      min_stock: 12,
      initial_stock: 36,
      category: 'Hojaldres',
      unit_type: 'Unidad',
      description: '100% mantequilla pura con capas doradas crujientes.'
    }
  ],

  liquor_tobacco: [
    {
      name: 'Aguardiente Antioqueño Tapa Azul 750ml (Sin Azúcar)',
      sku: 'LIC-AGU-001',
      barcode: '7702041001011',
      price: 45000,
      cost_price: 34000,
      min_stock: 12,
      initial_stock: 48,
      category: 'Aguardientes & Anisados',
      unit_type: 'Botella',
      description: 'Licor tradicional anisado sin azúcar 29% Alc.'
    },
    {
      name: 'Whisky Old Parr 12 Años 750ml',
      sku: 'LIC-WHI-002',
      barcode: '5000281014111',
      price: 135000,
      cost_price: 98000,
      min_stock: 4,
      initial_stock: 16,
      category: 'Whiskies Importados',
      unit_type: 'Botella',
      description: 'Mezcla escocesa de maltas maduradas en barricas de roble.'
    },
    {
      name: 'Ron Viejo de Caldas Juan de la Cruz 5 Años 750ml',
      sku: 'LIC-RON-003',
      barcode: '7702123001035',
      price: 52000,
      cost_price: 39000,
      min_stock: 8,
      initial_stock: 30,
      category: 'Rones',
      unit_type: 'Botella',
      description: 'Añejado en barriles de roble blanco colombiano.'
    },
    {
      name: 'Pack Cerveza Corona Extra 355ml x 6 Unidades',
      sku: 'LIC-CER-004',
      barcode: '7501064191312',
      price: 28000,
      cost_price: 19500,
      min_stock: 10,
      initial_stock: 36,
      category: 'Cervezas & Sixpacks',
      unit_type: 'Sixpack',
      description: 'Cerveza tipo Pilsner clara mexicana 4.5% Alc.'
    }
  ],

  optometry: [
    {
      name: 'Montura Oftálmica Acetato Ultraliviana (Ray-Ban)',
      sku: 'OPT-MON-001',
      price: 290000,
      cost_price: 140000,
      min_stock: 2,
      initial_stock: 8,
      category: 'Monturas Oftálmicas',
      description: 'Diseño clásico rectangular con bisagras flexibles de resorte.'
    },
    {
      name: 'Par de Lentes Antirreflejo Blue Protect (Filtro Azul)',
      sku: 'OPT-LEN-002',
      price: 160000,
      cost_price: 65000,
      min_stock: 0,
      initial_stock: 50,
      category: 'Lentes Oftálmicos',
      description: 'Protección para pantallas digitales con capa hidrofóbica y antirrayas.'
    },
    {
      name: 'Solución Multipropósito Limpieza Lentes de Contacto 360ml (Renu)',
      sku: 'OPT-SOL-003',
      barcode: '7703058001011',
      price: 38000,
      cost_price: 24000,
      min_stock: 6,
      initial_stock: 20,
      category: 'Cuidado Visual & Soluciones',
      unit_type: 'Frasco',
      description: 'Desinfecta, limpia y humecta lentes de contacto blandos.'
    },
    {
      name: 'Gafas de Sol Polarizadas UV400 Deportivas',
      sku: 'OPT-SOL-004',
      price: 180000,
      cost_price: 85000,
      min_stock: 3,
      initial_stock: 12,
      category: 'Gafas de Sol',
      description: 'Lentes polarizados de alto contraste con protección 100% UVA/UVB.'
    }
  ],

  laundry: [
    {
      name: 'Lavado y Secado de Ropa por Kilo (Carga Completa)',
      sku: 'LAV-KIL-001',
      price: 9000,
      cost_price: 2200,
      min_stock: 0,
      initial_stock: 200,
      category: 'Lavado por Kilo',
      unit_type: 'Kilo',
      description: 'Lavado con detergente biodegradable, suavizante y secado a temperatura controlada.'
    },
    {
      name: 'Lavado en Seco & Planchado Traje Completo (2 Piezas)',
      sku: 'LAV-SEC-002',
      price: 32000,
      cost_price: 6500,
      min_stock: 0,
      initial_stock: 100,
      category: 'Tintorería & Seco',
      unit_type: 'Servicio',
      description: 'Tratamiento especial de desmanchado, lavado en seco y planchado al vapor.'
    },
    {
      name: 'Lavado & Desinfección Edredón Térmico / Plumón King Size',
      sku: 'LAV-EDR-003',
      price: 28000,
      cost_price: 5500,
      min_stock: 0,
      initial_stock: 50,
      category: 'Hogar & Lencería',
      unit_type: 'Servicio',
      description: 'Ciclo profundo antiácaros con desinfección y secado esponjado.'
    },
    {
      name: 'Planchado al Vapor por Prenda Individual',
      sku: 'LAV-PLA-004',
      price: 4500,
      cost_price: 800,
      min_stock: 0,
      initial_stock: 150,
      category: 'Planchado',
      unit_type: 'Prenda',
      description: 'Planchado profesional vertical para camisas, pantalones o vestidos.'
    }
  ],

  general: [
    {
      name: 'Arroz Blanco Prémium 1000g (Diana)',
      sku: 'GEN-ARR-001',
      barcode: '7701234567890',
      price: 4200,
      cost_price: 3100,
      min_stock: 20,
      initial_stock: 100,
      category: 'Abarrotes & Granos',
      unit_type: 'Bolsa'
    },
    {
      name: 'Aceite Vegetal de Girasol 900ml (Premier)',
      sku: 'GEN-ACE-002',
      barcode: '7705556667770',
      price: 11500,
      cost_price: 8800,
      min_stock: 12,
      initial_stock: 48,
      category: 'Abarrotes',
      unit_type: 'Botella'
    },
    {
      name: 'Leche Entera Larga Vida 1000ml (Alquería)',
      sku: 'GEN-LEC-003',
      barcode: '7709876543210',
      price: 4600,
      cost_price: 3500,
      min_stock: 18,
      initial_stock: 72,
      category: 'Lácteos & Huevos',
      unit_type: 'Bolsa'
    },
    {
      name: 'Café Molido Tostado Colombiano 500g (Sello Rojo)',
      sku: 'GEN-CAF-004',
      barcode: '7701020304050',
      price: 16800,
      cost_price: 12400,
      min_stock: 10,
      initial_stock: 30,
      category: 'Café & Despensa',
      unit_type: 'Paquete'
    },
    {
      name: 'Detergente en Polvo Multiusos 1000g (Ariel)',
      sku: 'GEN-DET-005',
      barcode: '7707080901020',
      price: 13500,
      cost_price: 9800,
      min_stock: 8,
      initial_stock: 36,
      category: 'Aseo & Limpieza',
      unit_type: 'Bolsa'
    }
  ]
}

export function getVerticalSeedData(verticalId: string): SeedProduct[] {
  if (SEEDS_BY_VERTICAL[verticalId]) {
    return SEEDS_BY_VERTICAL[verticalId]
  }
  return SEEDS_BY_VERTICAL.general
}
