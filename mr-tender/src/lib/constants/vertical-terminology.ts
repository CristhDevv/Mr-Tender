import {
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingCart,
  Receipt,
  FileText,
  UtensilsCrossed,
  Pill,
  Dog,
  Shirt,
  Dumbbell,
  Car,
  Scissors,
  Wrench,
  Croissant,
  Wine,
  Glasses,
  Footprints,
  Calendar,
  Sparkles,
  Clock,
  Activity,
  Flame,
  Stethoscope,
  Syringe,
  Briefcase,
  LucideIcon
} from 'lucide-react'

export interface VerticalTermConfig {
  id: string
  name: string
  singleWordTitle: string
  accentColor: string
  terms: {
    products: string
    productsPlural: string
    customers: string
    customersPlural: string
    inventory: string
    suppliers: string
    suppliersPlural: string
    orders: string
    ordersPlural: string
    pos: string
    quoteOrPrescription?: string
  }
  sidebarOverrides?: Record<string, string> // e.g. { '/products': 'Medicamentos', '/customers': 'Pacientes' }
  icons?: Partial<Record<string, LucideIcon>>
}

export const GENERIC_TERMS = {
  products: 'Producto',
  productsPlural: 'Productos',
  customers: 'Cliente',
  customersPlural: 'Clientes',
  inventory: 'Kardex',
  suppliers: 'Proveedor',
  suppliersPlural: 'Proveedores',
  orders: 'Pedido',
  ordersPlural: 'Pedidos',
  pos: 'POS',
  quoteOrPrescription: 'Cotización'
}

export const VERTICAL_TERMINOLOGY: Record<string, VerticalTermConfig> = {
  pharmacy: {
    id: 'pharmacy',
    name: 'Droguería & Farmacia',
    singleWordTitle: 'Farmacia',
    accentColor: '#10B981', // Emerald
    terms: {
      products: 'Medicamento',
      productsPlural: 'Medicamentos',
      customers: 'Paciente',
      customersPlural: 'Pacientes',
      inventory: 'Stock INVIMA',
      suppliers: 'Droguería',
      suppliersPlural: 'Droguerías',
      orders: 'Dispensación',
      ordersPlural: 'Dispensaciones',
      pos: 'Despacho',
      quoteOrPrescription: 'Fórmula'
    },
    sidebarOverrides: {
      '/products': 'Medicamentos',
      '/customers': 'Pacientes',
      '/suppliers': 'Droguerías',
      '/inventory': 'Stock'
    },
    icons: {
      products: Pill,
      customers: Users,
      orders: FileText
    }
  },

  restaurant: {
    id: 'restaurant',
    name: 'Restaurante, Café & Bar',
    singleWordTitle: 'Restaurante',
    accentColor: '#F59E0B', // Amber
    terms: {
      products: 'Plato',
      productsPlural: 'Platos',
      customers: 'Comensal',
      customersPlural: 'Comensales',
      inventory: 'Insumos',
      suppliers: 'Distribuidor',
      suppliersPlural: 'Distribuidores',
      orders: 'Comanda',
      ordersPlural: 'Comandas',
      pos: 'Comandero',
      quoteOrPrescription: 'Presupuesto'
    },
    sidebarOverrides: {
      '/products': 'Platos',
      '/customers': 'Comensales',
      '/inventory': 'Insumos',
      '/pos': 'Comandero'
    },
    icons: {
      products: UtensilsCrossed,
      orders: Flame
    }
  },

  veterinary: {
    id: 'veterinary',
    name: 'Veterinaria & Pet Shop',
    singleWordTitle: 'Veterinaria',
    accentColor: '#06B6D4', // Cyan
    terms: {
      products: 'Insumo Pet',
      productsPlural: 'Insumos',
      customers: 'Tutor / Dueño',
      customersPlural: 'Dueños',
      inventory: 'Almacén Pet',
      suppliers: 'Laboratorio',
      suppliersPlural: 'Laboratorios',
      orders: 'Consulta',
      ordersPlural: 'Consultas',
      pos: 'POS Pet',
      quoteOrPrescription: 'Fórmula Vet'
    },
    sidebarOverrides: {
      '/products': 'Insumos',
      '/customers': 'Dueños',
      '/inventory': 'Almacén'
    },
    icons: {
      products: Dog,
      customers: Users,
      orders: Stethoscope
    }
  },

  apparel: {
    id: 'apparel',
    name: 'Boutique, Ropa & Calzado',
    singleWordTitle: 'Boutique',
    accentColor: '#EC4899', // Pink
    terms: {
      products: 'Prenda',
      productsPlural: 'Prendas',
      customers: 'Clienta',
      customersPlural: 'Clientas',
      inventory: 'Matriz Talla',
      suppliers: 'Confeccionista',
      suppliersPlural: 'Confeccionistas',
      orders: 'Venta',
      ordersPlural: 'Ventas',
      pos: 'Caja Boutique',
      quoteOrPrescription: 'Lookbook'
    },
    sidebarOverrides: {
      '/products': 'Prendas',
      '/customers': 'Clientas',
      '/inventory': 'Matriz'
    },
    icons: {
      products: Shirt,
      customers: Users
    }
  },

  gym: {
    id: 'gym',
    name: 'Gimnasio & Centro Fitness',
    singleWordTitle: 'Gimnasio',
    accentColor: '#8B5CF6', // Purple
    terms: {
      products: 'Membresía / Suplemento',
      productsPlural: 'Membresías',
      customers: 'Miembro / Socio',
      customersPlural: 'Socios',
      inventory: 'Suplementos',
      suppliers: 'Distribuidor',
      suppliersPlural: 'Distribuidores',
      orders: 'Inscripción',
      ordersPlural: 'Inscripciones',
      pos: 'Recepción',
      quoteOrPrescription: 'Plan Fitness'
    },
    sidebarOverrides: {
      '/products': 'Membresías',
      '/customers': 'Socios',
      '/pos': 'Recepción'
    },
    icons: {
      products: Dumbbell,
      customers: Users,
      orders: Activity
    }
  },

  automotive: {
    id: 'automotive',
    name: 'Taller Mecánico & Autolavado',
    singleWordTitle: 'Taller',
    accentColor: '#EF4444', // Red
    terms: {
      products: 'Repuesto / Servicio',
      productsPlural: 'Repuestos',
      customers: 'Propietario',
      customersPlural: 'Propietarios',
      inventory: 'Bodega Repuestos',
      suppliers: 'Mayorista Autopartes',
      suppliersPlural: 'Mayoristas',
      orders: 'Orden de Servicio',
      ordersPlural: 'Órdenes',
      pos: 'Caja Taller',
      quoteOrPrescription: 'Presupuesto Taller'
    },
    sidebarOverrides: {
      '/products': 'Repuestos',
      '/customers': 'Propietarios',
      '/pos': 'Caja Taller'
    },
    icons: {
      products: Wrench,
      orders: Car
    }
  },

  beauty_salon: {
    id: 'beauty_salon',
    name: 'Salón de Belleza & Barbería',
    singleWordTitle: 'Salón',
    accentColor: '#D946EF', // Fuchsia
    terms: {
      products: 'Servicio / Cosmético',
      productsPlural: 'Servicios',
      customers: 'Cliente',
      customersPlural: 'Clientes',
      inventory: 'Insumos Capilares',
      suppliers: 'Distribuidor Cosmético',
      suppliersPlural: 'Distribuidores',
      orders: 'Cita / Servicio',
      ordersPlural: 'Citas',
      pos: 'Caja Salón',
      quoteOrPrescription: 'Ficha Técnica'
    },
    sidebarOverrides: {
      '/products': 'Servicios',
      '/customers': 'Clientes',
      '/inventory': 'Insumos'
    },
    icons: {
      products: Scissors,
      orders: Calendar
    }
  },

  hardware: {
    id: 'hardware',
    name: 'Ferretería & Construcción',
    singleWordTitle: 'Ferretería',
    accentColor: '#F97316', // Orange
    terms: {
      products: 'Material / Herramienta',
      productsPlural: 'Materiales',
      customers: 'Contratista / Maestro',
      customersPlural: 'Contratistas',
      inventory: 'Patio & Bodega',
      suppliers: 'Fabricante',
      suppliersPlural: 'Fabricantes',
      orders: 'Despacho Obra',
      ordersPlural: 'Despachos',
      pos: 'Mostrador',
      quoteOrPrescription: 'Cotización A4'
    },
    sidebarOverrides: {
      '/products': 'Materiales',
      '/customers': 'Contratistas',
      '/inventory': 'Bodega'
    },
    icons: {
      products: Wrench,
      orders: FileText
    }
  },

  bakery: {
    id: 'bakery',
    name: 'Panadería & Repostería',
    singleWordTitle: 'Panadería',
    accentColor: '#D97706', // Amber dark
    terms: {
      products: 'Pan / Torta',
      productsPlural: 'Panes',
      customers: 'Cliente',
      customersPlural: 'Clientes',
      inventory: 'Materia Prima',
      suppliers: 'Molino / Distribuidor',
      suppliersPlural: 'Distribuidores',
      orders: 'Encargo',
      ordersPlural: 'Encargos',
      pos: 'Caja Panadería',
      quoteOrPrescription: 'Presupuesto Torta'
    },
    sidebarOverrides: {
      '/products': 'Panes',
      '/customers': 'Clientes',
      '/inventory': 'Harinas'
    },
    icons: {
      products: Croissant,
      orders: Clock
    }
  },

  liquor_tobacco: {
    id: 'liquor_tobacco',
    name: 'Licorera, Estanco & Cigarrería',
    singleWordTitle: 'Licorera',
    accentColor: '#A855F7', // Purple/Wine
    terms: {
      products: 'Licor / Cigarrillos',
      productsPlural: 'Licores',
      customers: 'Cliente',
      customersPlural: 'Clientes',
      inventory: 'Bodega Licores',
      suppliers: 'Distribuidora Licores',
      suppliersPlural: 'Distribuidoras',
      orders: 'Venta Mostrador',
      ordersPlural: 'Ventas',
      pos: 'Barra POS',
      quoteOrPrescription: 'Cotización Evento'
    },
    sidebarOverrides: {
      '/products': 'Licores',
      '/customers': 'Clientes',
      '/inventory': 'Bodega'
    },
    icons: {
      products: Wine,
      orders: ShoppingCart
    }
  },

  optometry: {
    id: 'optometry',
    name: 'Óptica & Consultorio Visual',
    singleWordTitle: 'Óptica',
    accentColor: '#3B82F6', // Blue
    terms: {
      products: 'Montura / Lente',
      productsPlural: 'Monturas',
      customers: 'Paciente',
      customersPlural: 'Pacientes',
      inventory: 'Laboratorio Lentes',
      suppliers: 'Laboratorio Óptico',
      suppliersPlural: 'Laboratorios',
      orders: 'Trabajo Biselado',
      ordersPlural: 'Trabajos',
      pos: 'Caja Óptica',
      quoteOrPrescription: 'Fórmula OD/OI'
    },
    sidebarOverrides: {
      '/products': 'Monturas',
      '/customers': 'Pacientes',
      '/inventory': 'Lentes'
    },
    icons: {
      products: Glasses,
      customers: Users,
      orders: FileText
    }
  },

  laundry: {
    id: 'laundry',
    name: 'Lavandería & Tintorería',
    singleWordTitle: 'Lavandería',
    accentColor: '#0EA5E9', // Sky blue
    terms: {
      products: 'Servicio Lavado / Kilo',
      productsPlural: 'Servicios',
      customers: 'Cliente',
      customersPlural: 'Clientes',
      inventory: 'Insumos Químicos',
      suppliers: 'Distribuidor Químico',
      suppliersPlural: 'Distribuidores',
      orders: 'Ticket Prenda',
      ordersPlural: 'Tickets',
      pos: 'Recepción Ropa',
      quoteOrPrescription: 'Cotización Kilos'
    },
    sidebarOverrides: {
      '/products': 'Servicios',
      '/customers': 'Clientes',
      '/inventory': 'Insumos'
    },
    icons: {
      products: Footprints,
      orders: Shirt
    }
  }
}

/**
 * Resolves the primary active vertical identifier for a tenant given its enabled modules map or businessType.
 */
export function resolveActiveVertical(
  enabledModules?: Record<string, boolean> | null,
  businessType?: string | null,
  primaryVertical?: string | null
): string | null {
  const VERTICAL_KEYS = [
    'pharmacy',
    'restaurant',
    'veterinary',
    'apparel',
    'gym',
    'automotive',
    'beauty_salon',
    'hardware',
    'bakery',
    'liquor_tobacco',
    'optometry',
    'laundry'
  ]

  // 1. Explicit primary_vertical takes highest precedence if active
  if (primaryVertical) {
    const normPrimary = primaryVertical.toLowerCase().trim()
    if (VERTICAL_KEYS.includes(normPrimary)) {
      if (!enabledModules || enabledModules[normPrimary]) {
        return normPrimary
      }
    }
  }

  // 2. Business type from tenant registration takes second precedence if active
  if (businessType) {
    const normalized = businessType.toLowerCase().trim()
    const mapped =
      normalized === 'clothing' ? 'apparel' :
      normalized === 'workshop' ? 'automotive' :
      normalized === 'salon' ? 'beauty_salon' :
      normalized === 'estanco' ? 'liquor_tobacco' :
      normalized

    if (VERTICAL_KEYS.includes(mapped)) {
      if (!enabledModules || enabledModules[mapped]) {
        return mapped
      }
    }
  }

  // 3. Fallback when businessType does not match any active vertical:
  if (enabledModules) {
    const activeVerticals = VERTICAL_KEYS.filter(key => Boolean(enabledModules[key]))
    
    // If exactly 1 vertical is enabled, use it naturally
    if (activeVerticals.length === 1) {
      return activeVerticals[0]
    }

    // If multiple verticals are active and no primary is specified, degrade root terms to clean neutral base (null)
    // to avoid collision or arbitrary favoritism on shared views
    if (activeVerticals.length > 1) {
      return null
    }
  }

  return null
}

/**
 * Gets the vertical term or fallback to generic
 */
export function getVerticalTerm(
  termKey: keyof typeof GENERIC_TERMS,
  activeVerticalId?: string | null
): string {
  if (activeVerticalId && VERTICAL_TERMINOLOGY[activeVerticalId]) {
    const custom = VERTICAL_TERMINOLOGY[activeVerticalId].terms[termKey]
    if (custom) return custom
  }
  return GENERIC_TERMS[termKey] || termKey
}
