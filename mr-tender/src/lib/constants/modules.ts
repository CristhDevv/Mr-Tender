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
  TrendingUp,
  Landmark,
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
  requires?: string[]
  suggests?: string[]
}

export const MODULE_ICONS: Record<string, LucideIcon> = {
  pos: ShoppingCart,
  inventory: Boxes,
  cash: DollarSign,
  customers: Users,
  crm: TrendingUp,
  suppliers: Truck,
  purchases: ShoppingBag,
  employees: Clock,
  payroll: Briefcase,
  treasury: Landmark,
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
    id: 'inventory',
    name: 'Inventario, Bodegas & Kardex',
    iconName: 'Boxes',
    group: 'base',
    categoryName: 'Operaciones Comerciales',
    description: 'Control de existencias, Kardex, traslados entre bodegas y alertas de stock bajo',
    defaultEnabled: true
  },
  {
    id: 'pos',
    name: 'Punto de Venta (POS)',
    iconName: 'ShoppingCart',
    group: 'base',
    categoryName: 'Operaciones Comerciales',
    description: 'Venta rápida, caja, tickets térmicos, lectura de código de barras y facturación',
    defaultEnabled: true,
    requires: ['inventory']
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
    id: 'crm',
    name: 'CRM & Embudo Kanban de Ventas',
    iconName: 'TrendingUp',
    group: 'base',
    categoryName: 'Ventas & Clientes',
    description: 'Tablero Kanban de prospectos, etapas comerciales, links de pago Wompi/PSE y conversión a factura DIAN en 1 clic',
    defaultEnabled: true,
    requires: ['customers', 'pos']
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
    defaultEnabled: true,
    requires: ['suppliers', 'inventory']
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
    defaultEnabled: true,
    requires: ['employees']
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
    id: 'treasury',
    name: 'Tesorería, Bancos & Flujo de Caja',
    iconName: 'Landmark',
    group: 'base',
    categoryName: 'Finanzas & Tesorería',
    description: 'Cuentas bancarias en tiempo real, conciliación de extractos y calendario de cobros (CxC) y pagos (CxP)',
    defaultEnabled: true,
    requires: ['cash']
  },
  {
    id: 'accounting',
    name: 'Contabilidad Automatizada (PUC)',
    iconName: 'BookOpen',
    group: 'base',
    categoryName: 'Finanzas & Analítica',
    description: 'Plan único de cuentas contables, balance general y generación automática de asientos',
    defaultEnabled: true,
    requires: ['purchases', 'pos']
  },
  {
    id: 'ecommerce',
    name: 'E-commerce & Tienda Web',
    iconName: 'Globe',
    group: 'base',
    categoryName: 'Ventas Digitales',
    description: 'Catálogo web público con subdominio propio y pedidos directos a WhatsApp',
    defaultEnabled: true,
    requires: ['inventory']
  },

  // ── Módulos Verticales Especializados ──
  {
    id: 'optometry',
    name: 'Óptica & Consultorio Visual',
    iconName: 'Glasses',
    group: 'vertical',
    categoryName: 'Salud & Bienestar',
    description: 'Fórmulas oftalmológicas OD/OI, órdenes de laboratorio de biselado, monturas y WhatsApp',
    defaultEnabled: false,
    requires: ['customers', 'pos']
  },
  {
    id: 'apparel',
    name: 'Boutique, Ropa & Calzado',
    iconName: 'Shirt',
    group: 'vertical',
    categoryName: 'Moda & Retail',
    description: 'Matriz de talla/color, códigos de barras por variante, control de probadores y lookbooks',
    defaultEnabled: false,
    requires: ['inventory', 'pos']
  },
  {
    id: 'gym',
    name: 'Gimnasio, Fitness & Crossfit',
    iconName: 'Dumbbell',
    group: 'vertical',
    categoryName: 'Deportes & Bienestar',
    description: 'Torniquete y check-in QR, membresías con WhatsApp, aforo de clases y antropometría',
    defaultEnabled: false,
    requires: ['customers', 'pos']
  },
  {
    id: 'laundry',
    name: 'Lavandería & Tintorería',
    iconName: 'Footprints',
    group: 'vertical',
    categoryName: 'Servicios',
    description: 'Tickets por prenda/kilo, control visual de percheros, lavado en seco y domicilios',
    defaultEnabled: false,
    requires: ['customers', 'pos']
  },
  {
    id: 'automotive',
    name: 'Taller Mecánico & Autolavado',
    iconName: 'Car',
    group: 'vertical',
    categoryName: 'Automotriz',
    description: 'Órdenes de trabajo por placa, checklist de recepción, repuestos y cola de lavado',
    defaultEnabled: false,
    requires: ['customers', 'inventory', 'pos']
  },
  {
    id: 'veterinary',
    name: 'Veterinaria & Pet Shop',
    iconName: 'Dog',
    group: 'vertical',
    categoryName: 'Mascotas & Salud',
    description: 'Historias clínicas, carnet de vacunas con WhatsApp, peluquería canina y alimento a granel',
    defaultEnabled: false,
    requires: ['customers', 'pos']
  },
  {
    id: 'beauty_salon',
    name: 'Salón de Belleza, Barbería & Spa',
    iconName: 'Scissors',
    group: 'vertical',
    categoryName: 'Belleza & Cuidado',
    description: 'Agenda de citas con WhatsApp, liquidación de comisiones y fichas técnicas capilares',
    defaultEnabled: false,
    requires: ['employees', 'pos']
  },
  {
    id: 'restaurant',
    name: 'Restaurante, Café & Bar',
    iconName: 'UtensilsCrossed',
    group: 'vertical',
    categoryName: 'Gastronomía',
    description: 'Mapa de mesas, comandas digitales KDS a cocina/barra, split bill y recetas',
    defaultEnabled: false,
    requires: ['inventory', 'pos']
  },
  {
    id: 'liquor_tobacco',
    name: 'Licorera, Estanco & Cigarrería',
    iconName: 'Wine',
    group: 'vertical',
    categoryName: 'Bebidas & Ocio',
    description: 'Control de botellas y copeo en barra, envases retornables, combos y tabaco (+18)',
    defaultEnabled: false,
    requires: ['inventory', 'pos']
  },
  {
    id: 'pharmacy',
    name: 'Droguería & Farmacia',
    iconName: 'Pill',
    group: 'vertical',
    categoryName: 'Salud & Farma',
    description: 'Catálogo INVIMA, genéricos, semáforo de lotes FEFO, termohigrometría y controlados',
    defaultEnabled: false,
    requires: ['inventory', 'purchases']
  },
  {
    id: 'hardware',
    name: 'Ferretería & Construcción',
    iconName: 'Wrench',
    group: 'vertical',
    categoryName: 'Construcción & Ferretería',
    description: 'Cotizaciones en PDF A4, venta fraccionada (metros/kilos) y alquiler de herramientas',
    defaultEnabled: false,
    requires: ['inventory', 'pos']
  },
  {
    id: 'bakery',
    name: 'Panadería, Pastelería & Repostería',
    iconName: 'Croissant',
    group: 'vertical',
    categoryName: 'Gastronomía & Panadería',
    description: 'Recetas por gramaje/harina, horneadas del día, mermas, tortas personalizadas y encargos',
    defaultEnabled: false,
    requires: ['inventory', 'purchases']
  }
]

export function getModuleById(id: string): SystemModule | undefined {
  return ALL_SYSTEM_MODULES.find(m => m.id === id)
}

export function getMissingDependencies(moduleId: string, enabledModules: Record<string, boolean>): string[] {
  const mod = getModuleById(moduleId)
  if (!mod || !mod.requires) return []
  return mod.requires.filter(reqId => !enabledModules[reqId])
}

export function getDependents(moduleId: string, enabledModules: Record<string, boolean>): string[] {
  return ALL_SYSTEM_MODULES
    .filter(m => enabledModules[m.id] && m.requires?.includes(moduleId))
    .map(m => m.id)
}

export function resolveModuleToggle(
  moduleId: string,
  targetState: boolean,
  currentModules: Record<string, boolean>
): {
  updatedModules: Record<string, boolean>
  autoEnabled: string[]
  blockedBy: string[]
} {
  const updated = { ...currentModules }
  const autoEnabled: string[] = []

  if (targetState) {
    // Turning ON: recursively enable required dependencies
    const queue = [moduleId]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      updated[currentId] = true
      if (currentId !== moduleId && !currentModules[currentId]) {
        autoEnabled.push(currentId)
      }

      const mod = getModuleById(currentId)
      if (mod?.requires) {
        for (const reqId of mod.requires) {
          if (!updated[reqId]) {
            queue.push(reqId)
          }
        }
      }
    }

    return {
      updatedModules: updated,
      autoEnabled,
      blockedBy: []
    }
  } else {
    // Turning OFF: check if other active modules require this one
    const dependents = getDependents(moduleId, currentModules)
    if (dependents.length > 0) {
      return {
        updatedModules: currentModules,
        autoEnabled: [],
        blockedBy: dependents
      }
    }
    updated[moduleId] = false
    return {
      updatedModules: updated,
      autoEnabled: [],
      blockedBy: []
    }
  }
}

export function getDefaultModulesForBusinessType(businessType: string): Record<string, boolean> {
  const mods: Record<string, boolean> = {}
  ALL_SYSTEM_MODULES.forEach(m => {
    if (m.group === 'base') {
      mods[m.id] = true
    } else {
      mods[m.id] = false
    }
  })

  let targetVertical: string | null = null
  if (businessType === 'hardware') targetVertical = 'hardware'
  if (businessType === 'pharmacy') targetVertical = 'pharmacy'
  if (businessType === 'liquor_tobacco') targetVertical = 'liquor_tobacco'
  if (businessType === 'restaurant') targetVertical = 'restaurant'
  if (businessType === 'beauty_salon') targetVertical = 'beauty_salon'
  if (businessType === 'veterinary') targetVertical = 'veterinary'
  if (businessType === 'automotive') targetVertical = 'automotive'
  if (businessType === 'laundry') targetVertical = 'laundry'
  if (businessType === 'gym') targetVertical = 'gym'
  if (businessType === 'clothing' || businessType === 'apparel') targetVertical = 'apparel'
  if (businessType === 'optometry') targetVertical = 'optometry'
  if (businessType === 'bakery') targetVertical = 'bakery'

  if (targetVertical) {
    const { updatedModules } = resolveModuleToggle(targetVertical, true, mods)
    return updatedModules
  }

  return mods
}
