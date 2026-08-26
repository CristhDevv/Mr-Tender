import React from 'react'
import {
  ShoppingCart,
  Boxes,
  DollarSign,
  Users,
  Truck,
  ShoppingBag,
  Clock,
  BarChart3,
  BookOpen,
  Globe,
  Glasses,
  Footprints,
  Dumbbell,
  Shirt,
  Car,
  Dog,
  Scissors,
  UtensilsCrossed,
  Wine,
  Pill,
  Wrench,
  Croissant,
  Briefcase,
  Layers,
  LucideIcon
} from 'lucide-react'

export interface SystemModule {
  id: string
  name: string
  iconName: string
  group: 'base' | 'vertical'
  categoryName: string
  description: string
  defaultEnabled: boolean
}

export const MODULE_ICONS: Record<string, LucideIcon> = {
  pos: ShoppingCart,
  inventory: Boxes,
  cash: DollarSign,
  customers: Users,
  suppliers: Truck,
  purchases: ShoppingBag,
  employees: Clock,
  payroll: Briefcase,
  reports: BarChart3,
  accounting: BookOpen,
  ecommerce: Globe,
  optometry: Glasses,
  apparel: Shirt,
  gym: Dumbbell,
  laundry: Footprints,
  automotive: Car,
  veterinary: Dog,
  beauty_salon: Scissors,
  restaurant: UtensilsCrossed,
  liquor_tobacco: Wine,
  pharmacy: Pill,
  hardware: Wrench,
  bakery: Croissant,
}

export function getModuleIcon(id: string): LucideIcon {
  return MODULE_ICONS[id] || Layers
}

export const ALL_SYSTEM_MODULES: SystemModule[] = [
  // ── Módulos Base & Operativos ──
  {
    id: 'pos',
    name: 'Punto de Venta (POS)',
    iconName: 'ShoppingCart',
    group: 'base',
    categoryName: 'Operaciones Comerciales',
    description: 'Venta rápida, caja, tickets térmicos, lectura de código de barras y facturación',
    defaultEnabled: true
  },
  {
    id: 'inventory',
    name: 'Inventario, Bodegas & Kardex',
    iconName: 'Boxes',
    group: 'base',
    categoryName: 'Operaciones Comerciales',
    description: 'Control de existencias, Kardex, traslados entre bodegas y alertas de stock bajo',
    defaultEnabled: true
  },
  {
    id: 'cash',
    name: 'Caja, Turnos & Arqueos',
    iconName: 'DollarSign',
    group: 'base',
    categoryName: 'Operaciones Comerciales',
    description: 'Aperturas de caja, control de efectivo, arqueos y cierres de turno ciegos',
    defaultEnabled: true
  },
  {
    id: 'customers',
    name: 'Clientes & Cuentas x Cobrar',
    iconName: 'Users',
    group: 'base',
    categoryName: 'Operaciones Comerciales',
    description: 'Directorio de clientes, libreta de fiados con límite de crédito y recordatorios WhatsApp',
    defaultEnabled: true
  },
  {
    id: 'suppliers',
    name: 'Proveedores & Contactos',
    iconName: 'Truck',
    group: 'base',
    categoryName: 'Abastecimiento',
    description: 'Directorio de proveedores, cuentas por pagar y condiciones comerciales',
    defaultEnabled: true
  },
  {
    id: 'purchases',
    name: 'Compras & Abastecimiento',
    iconName: 'ShoppingBag',
    group: 'base',
    categoryName: 'Abastecimiento',
    description: 'Registro de facturas de compra, recepción de mercancía y actualización de costo',
    defaultEnabled: true
  },
  {
    id: 'employees',
    name: 'Personal, Turnos & Asistencia',
    iconName: 'Clock',
    group: 'base',
    categoryName: 'Administración',
    description: 'Gestión de colaboradores, permisos por rol y control de horario/fichajes',
    defaultEnabled: true
  },
  {
    id: 'payroll',
    name: 'Nómina Electrónica DIAN & RRHH',
    iconName: 'Briefcase',
    group: 'base',
    categoryName: 'Administración & Legal',
    description: 'Liquidación de salarios quincenal/mensual, deducciones de ley, emisión DIAN con CUNE y colillas por WhatsApp',
    defaultEnabled: true
  },
  {
    id: 'reports',
    name: 'Reportes & Analítica',
    iconName: 'BarChart3',
    group: 'base',
    categoryName: 'Finanzas & Analítica',
    description: 'Reportes de ventas, utilidades, productos más vendidos y exportación Excel/PDF',
    defaultEnabled: true
  },
  {
    id: 'accounting',
    name: 'Contabilidad Automatizada (PUC)',
    iconName: 'BookOpen',
    group: 'base',
    categoryName: 'Finanzas & Analítica',
    description: 'Plan único de cuentas contables, balance general y generación automática de asientos',
    defaultEnabled: true
  },
  {
    id: 'ecommerce',
    name: 'E-commerce & Tienda Web',
    iconName: 'Globe',
    group: 'base',
    categoryName: 'Ventas Digitales',
    description: 'Catálogo web público con subdominio propio y pedidos directos a WhatsApp',
    defaultEnabled: true
  },

  // ── Módulos Verticales Especializados ──
  {
    id: 'optometry',
    name: 'Óptica & Consultorio Visual',
    iconName: 'Glasses',
    group: 'vertical',
    categoryName: 'Salud & Bienestar',
    description: 'Fórmulas oftalmológicas OD/OI, órdenes de laboratorio de biselado, monturas y WhatsApp',
    defaultEnabled: false
  },
  {
    id: 'apparel',
    name: 'Boutique, Ropa & Calzado',
    iconName: 'Shirt',
    group: 'vertical',
    categoryName: 'Moda & Retail',
    description: 'Matriz de talla/color, códigos de barras por variante, control de probadores y lookbooks',
    defaultEnabled: false
  },
  {
    id: 'gym',
    name: 'Gimnasio, Fitness & Crossfit',
    iconName: 'Dumbbell',
    group: 'vertical',
    categoryName: 'Deportes & Bienestar',
    description: 'Torniquete y check-in QR, membresías con WhatsApp, aforo de clases y antropometría',
    defaultEnabled: false
  },
  {
    id: 'laundry',
    name: 'Lavandería & Tintorería',
    iconName: 'Footprints',
    group: 'vertical',
    categoryName: 'Servicios',
    description: 'Tickets por prenda/kilo, control visual de percheros, lavado en seco y domicilios',
    defaultEnabled: false
  },
  {
    id: 'automotive',
    name: 'Taller Mecánico & Autolavado',
    iconName: 'Car',
    group: 'vertical',
    categoryName: 'Automotriz',
    description: 'Órdenes de trabajo por placa, checklist de recepción, repuestos y cola de lavado',
    defaultEnabled: false
  },
  {
    id: 'veterinary',
    name: 'Veterinaria & Pet Shop',
    iconName: 'Dog',
    group: 'vertical',
    categoryName: 'Mascotas & Salud',
    description: 'Historias clínicas, carnet de vacunas con WhatsApp, peluquería canina y alimento a granel',
    defaultEnabled: false
  },
  {
    id: 'beauty_salon',
    name: 'Salón de Belleza, Barbería & Spa',
    iconName: 'Scissors',
    group: 'vertical',
    categoryName: 'Belleza & Cuidado',
    description: 'Agenda de citas con WhatsApp, liquidación de comisiones y fichas técnicas capilares',
    defaultEnabled: false
  },
  {
    id: 'restaurant',
    name: 'Restaurante, Café & Bar',
    iconName: 'UtensilsCrossed',
    group: 'vertical',
    categoryName: 'Gastronomía',
    description: 'Mapa de mesas, comandas digitales KDS a cocina/barra, split bill y recetas',
    defaultEnabled: false
  },
  {
    id: 'liquor_tobacco',
    name: 'Licorera, Estanco & Cigarrería',
    iconName: 'Wine',
    group: 'vertical',
    categoryName: 'Bebidas & Ocio',
    description: 'Control de botellas y copeo en barra, envases retornables, combos y tabaco (+18)',
    defaultEnabled: false
  },
  {
    id: 'pharmacy',
    name: 'Droguería & Farmacia',
    iconName: 'Pill',
    group: 'vertical',
    categoryName: 'Salud & Farma',
    description: 'Catálogo INVIMA, genéricos, semáforo de lotes FEFO, termohigrometría y controlados',
    defaultEnabled: false
  },
  {
    id: 'hardware',
    name: 'Ferretería & Construcción',
    iconName: 'Wrench',
    group: 'vertical',
    categoryName: 'Construcción & Ferretería',
    description: 'Cotizaciones en PDF A4, venta fraccionada (metros/kilos) y alquiler de herramientas',
    defaultEnabled: false
  },
  {
    id: 'bakery',
    name: 'Panadería, Pastelería & Repostería',
    iconName: 'Croissant',
    group: 'vertical',
    categoryName: 'Gastronomía & Panadería',
    description: 'Recetas por gramaje/harina, horneadas del día, mermas, tortas personalizadas y encargos',
    defaultEnabled: false
  }
]

export function getDefaultModulesForBusinessType(businessType: string): Record<string, boolean> {
  const mods: Record<string, boolean> = {}
  ALL_SYSTEM_MODULES.forEach(m => {
    if (m.group === 'base') {
      mods[m.id] = true
    } else {
      mods[m.id] = false
    }
  })

  if (businessType === 'hardware') mods.hardware = true
  if (businessType === 'pharmacy') mods.pharmacy = true
  if (businessType === 'liquor_tobacco') mods.liquor_tobacco = true
  if (businessType === 'restaurant') mods.restaurant = true
  if (businessType === 'beauty_salon') mods.beauty_salon = true
  if (businessType === 'veterinary') mods.veterinary = true
  if (businessType === 'automotive') mods.automotive = true
  if (businessType === 'laundry') mods.laundry = true
  if (businessType === 'gym') mods.gym = true
  if (businessType === 'clothing' || businessType === 'apparel') mods.apparel = true
  if (businessType === 'optometry') mods.optometry = true
  if (businessType === 'bakery') mods.bakery = true

  return mods
}
