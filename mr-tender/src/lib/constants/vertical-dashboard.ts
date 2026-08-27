import {
  UtensilsCrossed,
  Flame,
  Pill,
  Clock,
  Dumbbell,
  Activity,
  Dog,
  Stethoscope,
  Shirt,
  Footprints,
  Car,
  Wrench,
  Scissors,
  Calendar,
  Croissant,
  FileText,
  Glasses,
  Wine,
  Boxes,
  LucideIcon
} from 'lucide-react'

export interface VerticalDashboardWidgetDef {
  id: string
  title: string
  subtitle: string
  icon: LucideIcon
  href: string
  actionLabel: string
  badgeText?: string
  color: string
}

export const VERTICAL_DASHBOARD_CONFIGS: Record<string, {
  sectionTitle: string
  sectionSubtitle: string
  widgets: VerticalDashboardWidgetDef[]
}> = {
  pharmacy: {
    sectionTitle: 'Panel Operativo de Farmacia',
    sectionSubtitle: 'Control FEFO, trazabilidad INVIMA y semáforo de caducidad',
    widgets: [
      {
        id: 'fefo_expiry',
        title: 'Medicamentos x Vencer',
        subtitle: 'Lotes con vencimiento en menos de 90 días (Semáforo FEFO)',
        icon: Clock,
        href: '/pharmacy/lots',
        actionLabel: 'Ver Lotes FEFO',
        badgeText: 'Alerta INVIMA',
        color: '#EF4444'
      },
      {
        id: 'temp_log',
        title: 'Termohigrometría',
        subtitle: 'Control diario de temperatura y humedad ambiental',
        icon: Pill,
        href: '/pharmacy/temperature',
        actionLabel: 'Registrar Hoy',
        badgeText: 'Sanitario',
        color: '#10B981'
      },
      {
        id: 'medicines_stock',
        title: 'Catálogo de Fármacos',
        subtitle: 'Búsqueda por principio activo, concentración y laboratorio',
        icon: Pill,
        href: '/pharmacy/medicines',
        actionLabel: 'Ver Catálogo',
        color: '#3B82F6'
      }
    ]
  },

  restaurant: {
    sectionTitle: 'Comandera & Operación Gastronómica',
    sectionSubtitle: 'Control en tiempo real de mesas, KDS de cocina y recetas',
    widgets: [
      {
        id: 'tables_live',
        title: 'Mapa de Mesas',
        subtitle: 'Estado de ocupación de salón, comensales y split bill',
        icon: UtensilsCrossed,
        href: '/restaurant/tables',
        actionLabel: 'Abrir Salón',
        badgeText: 'En Vivo',
        color: '#F59E0B'
      },
      {
        id: 'kitchen_kds',
        title: 'Cocina KDS',
        subtitle: 'Comandas digitales en preparación y tiempos de entrega',
        icon: Flame,
        href: '/restaurant/kds',
        actionLabel: 'Pantalla Cocina',
        badgeText: 'KDS',
        color: '#EF4444'
      },
      {
        id: 'recipes_cost',
        title: 'Escandallo & Recetas',
        subtitle: 'Fichas técnicas de platos y costo exacto por porción',
        icon: UtensilsCrossed,
        href: '/restaurant/recipes',
        actionLabel: 'Ver Recetas',
        color: '#10B981'
      }
    ]
  },

  gym: {
    sectionTitle: 'Control Fitness & Membresías',
    sectionSubtitle: 'Acceso QR, membresías activas y reservas de clases',
    widgets: [
      {
        id: 'members_expiring',
        title: 'Membresías por Vencer',
        subtitle: 'Socios con planes que caducan en los próximos 7 días',
        icon: Dumbbell,
        href: '/gym/members',
        actionLabel: 'Renovar Socios',
        badgeText: 'Cobranza',
        color: '#8B5CF6'
      },
      {
        id: 'qr_checkin',
        title: 'Terminal Check-in QR',
        subtitle: 'Torniquete digital y validación instantánea de acceso',
        icon: Activity,
        href: '/gym/checkin',
        actionLabel: 'Abrir Torniquete',
        badgeText: 'Acceso',
        color: '#10B981'
      },
      {
        id: 'classes_aforo',
        title: 'Clases & Aforo',
        subtitle: 'Programación de spinning, crossfit y cupos disponibles',
        icon: Calendar,
        href: '/gym/classes',
        actionLabel: 'Ver Clases',
        color: '#3B82F6'
      }
    ]
  },

  veterinary: {
    sectionTitle: 'Atención Médica & Servicios Pet',
    sectionSubtitle: 'Historias clínicas, carnet de vacunas y turnos de spa',
    widgets: [
      {
        id: 'vet_vaccines',
        title: 'Vacunas & Refuerzos',
        subtitle: 'Próximas aplicaciones y recordatorios WhatsApp para dueños',
        icon: Clock,
        href: '/veterinary/vaccines',
        actionLabel: 'Ver Carnets',
        badgeText: 'Recordatorios',
        color: '#06B6D4'
      },
      {
        id: 'vet_clinical',
        title: 'Historias Clínicas',
        subtitle: 'Evolución de consultas, diagnósticos y fórmulas médicas',
        icon: Stethoscope,
        href: '/veterinary/clinical',
        actionLabel: 'Nueva Consulta',
        badgeText: 'Clínica',
        color: '#3B82F6'
      },
      {
        id: 'vet_grooming',
        title: 'Peluquería & Spa',
        subtitle: 'Turnos de baño, corte y grooming en progreso',
        icon: Scissors,
        href: '/veterinary/grooming',
        actionLabel: 'Ver Turnos',
        color: '#F59E0B'
      }
    ]
  },

  apparel: {
    sectionTitle: 'Gestión de Boutique & Moda',
    sectionSubtitle: 'Matriz de talla/color, vestidores y outfits sugeridos',
    widgets: [
      {
        id: 'matrix_stock',
        title: 'Matriz Talla/Color',
        subtitle: 'Control visual de variantes agotadas por modelo y tono',
        icon: Shirt,
        href: '/apparel/matrix',
        actionLabel: 'Ver Matriz',
        badgeText: 'Inventario',
        color: '#EC4899'
      },
      {
        id: 'fitting_rooms',
        title: 'Probadores en Uso',
        subtitle: 'Control de prendas en cabina y prevención de pérdidas',
        icon: Footprints,
        href: '/apparel/fitting-rooms',
        actionLabel: 'Ver Probadores',
        badgeText: 'Salón',
        color: '#8B5CF6'
      },
      {
        id: 'lookbooks',
        title: 'Lookbooks & Outfits',
        subtitle: 'Combinaciones sugeridas para venta cruzada en caja',
        icon: Shirt,
        href: '/apparel/lookbooks',
        actionLabel: 'Ver Outfits',
        color: '#10B981'
      }
    ]
  },

  automotive: {
    sectionTitle: 'Taller Mecánico & Serviteca',
    sectionSubtitle: 'Recepción vehicular por placa, repuestos y autolavado',
    widgets: [
      {
        id: 'auto_orders',
        title: 'Órdenes de Trabajo',
        subtitle: 'Vehículos en diagnóstico, mantenimiento y listos para entrega',
        icon: Car,
        href: '/automotive/orders',
        actionLabel: 'Ver Órdenes',
        badgeText: 'En Taller',
        color: '#EF4444'
      },
      {
        id: 'auto_wash',
        title: 'Cola de Autolavado',
        subtitle: 'Bahías de lavado activo, aspirado y tiempos por vehículo',
        icon: Car,
        href: '/automotive/wash',
        actionLabel: 'Ver Lavadero',
        badgeText: 'Bahías',
        color: '#06B6D4'
      },
      {
        id: 'parts_quotes',
        title: 'Presupuestos & Repuestos',
        subtitle: 'Cotizaciones de mano de obra y repuestos automotrices',
        icon: Wrench,
        href: '/hardware/quotes',
        actionLabel: 'Cotizar Servicio',
        color: '#F59E0B'
      }
    ]
  },

  beauty_salon: {
    sectionTitle: 'Operación de Salón & Belleza',
    sectionSubtitle: 'Agenda de citas por profesional y liquidación de comisiones',
    widgets: [
      {
        id: 'salon_agenda',
        title: 'Agenda de Citas',
        subtitle: 'Turnos programados hoy para corte, tinte, manicure y spa',
        icon: Calendar,
        href: '/salon/agenda',
        actionLabel: 'Ver Agenda',
        badgeText: 'Hoy',
        color: '#D946EF'
      },
      {
        id: 'salon_commissions',
        title: 'Comisiones de Estilistas',
        subtitle: 'Cálculo automático de porcentaje por servicio realizado',
        icon: Scissors,
        href: '/salon/commissions',
        actionLabel: 'Liquidar Hoy',
        badgeText: 'Nómina',
        color: '#10B981'
      }
    ]
  },

  hardware: {
    sectionTitle: 'Ferretería & Mostrador de Materiales',
    sectionSubtitle: 'Presupuestos de obra, alquiler de herramientas y fraccionados',
    widgets: [
      {
        id: 'hw_quotes',
        title: 'Cotizaciones A4',
        subtitle: 'Presupuestos de construcción en PDF pendientes de cierre',
        icon: FileText,
        href: '/hardware/quotes',
        actionLabel: 'Ver Cotizaciones',
        badgeText: 'Proyectos',
        color: '#F97316'
      },
      {
        id: 'hw_rentals',
        title: 'Alquiler de Maquinaria',
        subtitle: 'Herramientas rentadas en obra con fecha de retorno',
        icon: Wrench,
        href: '/hardware/rentals',
        actionLabel: 'Ver Alquileres',
        badgeText: 'En Obra',
        color: '#3B82F6'
      }
    ]
  },

  bakery: {
    sectionTitle: 'Producción & Encargos de Panadería',
    sectionSubtitle: 'Horneadas del día, mermas de producción y tortas personalizadas',
    widgets: [
      {
        id: 'bakery_orders',
        title: 'Encargos de Tortas',
        subtitle: 'Pedidos personalizados de repostería con fecha de entrega',
        icon: Croissant,
        href: '/bakery/custom-orders',
        actionLabel: 'Ver Encargos',
        badgeText: 'Entregas',
        color: '#D97706'
      },
      {
        id: 'bakery_prod',
        title: 'Horneadas & Mermas',
        subtitle: 'Tandas de pan horneado hoy y registro de rendimiento',
        icon: Clock,
        href: '/bakery/production',
        actionLabel: 'Ver Producción',
        badgeText: 'Horno',
        color: '#EF4444'
      }
    ]
  },

  liquor_tobacco: {
    sectionTitle: 'Control de Barra & Estanco',
    sectionSubtitle: 'Copeo en barra, botellas abiertas y envases retornables',
    widgets: [
      {
        id: 'bar_open_bottles',
        title: 'Barra & Copeo',
        subtitle: 'Botellas abiertas para servicio de tragos y coctelería',
        icon: Wine,
        href: '/estanco/bar',
        actionLabel: 'Ver Barra',
        badgeText: 'Copeo',
        color: '#A855F7'
      },
      {
        id: 'bottle_returns',
        title: 'Envases Retornables',
        subtitle: 'Canastas de cerveza y cascos en préstamo a clientes',
        icon: Boxes,
        href: '/estanco/returns',
        actionLabel: 'Ver Retornables',
        badgeText: 'Depósitos',
        color: '#10B981'
      }
    ]
  },

  optometry: {
    sectionTitle: 'Laboratorio & Consultorio Visual',
    sectionSubtitle: 'Fórmulas oftálmicas y órdenes de biselado de lentes',
    widgets: [
      {
        id: 'opt_lab',
        title: 'Laboratorio de Biselado',
        subtitle: 'Montaje de lentes y tallado en proceso técnico',
        icon: Glasses,
        href: '/optometry/lab',
        actionLabel: 'Ver Laboratorio',
        badgeText: 'Taller',
        color: '#3B82F6'
      },
      {
        id: 'opt_patients',
        title: 'Fórmulas de Refracción',
        subtitle: 'Historias clínicas de optometría con valores OD/OI',
        icon: FileText,
        href: '/optometry/patients',
        actionLabel: 'Ver Fórmulas',
        badgeText: 'Clínica',
        color: '#10B981'
      }
    ]
  },

  laundry: {
    sectionTitle: 'Control de Tintorería & Planta',
    sectionSubtitle: 'Tickets por prenda/kilo y ubicación física en percheros',
    widgets: [
      {
        id: 'laundry_orders',
        title: 'Recepción de Ropa',
        subtitle: 'Tickets de lavado en seco, por kilo y prendas delicadas',
        icon: Footprints,
        href: '/laundry/orders',
        actionLabel: 'Ver Tickets',
        badgeText: 'Recepción',
        color: '#0EA5E9'
      },
      {
        id: 'laundry_rack',
        title: 'Percheros & Entregas',
        subtitle: 'Prendas planchadas listas para entrega al cliente',
        icon: Boxes,
        href: '/laundry/rack',
        actionLabel: 'Ver Percheros',
        badgeText: 'Listos',
        color: '#10B981'
      }
    ]
  }
}
