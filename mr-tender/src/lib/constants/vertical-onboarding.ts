export interface OnboardingStep {
  id: string
  label: string
  description: string
  href: string
  buttonText: string
}

export interface VerticalOnboardingConfig {
  title: string
  subtitle: string
  badgeText: string
  checklist: OnboardingStep[]
}

export const VERTICAL_ONBOARDINGS: Record<string, VerticalOnboardingConfig> = {
  pharmacy: {
    title: 'Tu Droguería está lista para operar',
    subtitle: 'Habilitamos control de vencimientos por semáforo FEFO, catálogo INVIMA y termohigrometría.',
    badgeText: 'FARMACIA',
    checklist: [
      {
        id: 'pharmacy_catalog',
        label: 'Revisa tu Catálogo de Medicamentos',
        description: 'Verifica principios activos, concentraciones y precios por fracción.',
        href: '/pharmacy/medicines',
        buttonText: 'Ver Medicamentos'
      },
      {
        id: 'pharmacy_lots',
        label: 'Carga Lotes con Fecha de Vencimiento',
        description: 'Registra tus primeras existencias para activar las alertas preventivas FEFO.',
        href: '/pharmacy/lots',
        buttonText: 'Registrar Lotes'
      },
      {
        id: 'pharmacy_temp',
        label: 'Configura la Bitácora de Temperatura',
        description: 'Registra la primera medición diaria de temperatura y humedad para inspección sanitaria.',
        href: '/pharmacy/temperature',
        buttonText: 'Registrar Temperatura'
      },
      {
        id: 'pharmacy_pos',
        label: 'Realiza tu primera Dispensación en POS',
        description: 'Prueba la búsqueda rápida por síntoma o nombre comercial y emite el ticket.',
        href: '/pos',
        buttonText: 'Abrir POS'
      }
    ]
  },

  restaurant: {
    title: 'Tu Restaurante está listo para el servicio',
    subtitle: 'Configuramos POS rápido, mapa de mesas, comandas a cocina (KDS) y escandallo de recetas.',
    badgeText: 'GASTRONOMÍA',
    checklist: [
      {
        id: 'restaurant_menu',
        label: 'Crea tu Menú y Platos',
        description: 'Registra tus entradas, platos fuertes, bebidas y combos con sus precios.',
        href: '/products',
        buttonText: 'Crear Platos'
      },
      {
        id: 'restaurant_tables',
        label: 'Configura tus Mesas y Salón',
        description: 'Define la distribución de mesas de tu salón o terraza para atención de meseros.',
        href: '/restaurant/tables',
        buttonText: 'Ver Salón'
      },
      {
        id: 'restaurant_kds',
        label: 'Prueba la Comandera de Cocina (KDS)',
        description: 'Abre la pantalla de cocina para recibir pedidos en tiempo real con tiempos de preparación.',
        href: '/restaurant/kds',
        buttonText: 'Abrir Cocina KDS'
      },
      {
        id: 'restaurant_recipes',
        label: 'Estructura tus Recetas y Escandallo',
        description: 'Asocia insumos de inventario a cada plato para costeo automático por porción.',
        href: '/restaurant/recipes',
        buttonText: 'Ver Recetas'
      }
    ]
  },

  gym: {
    title: 'Tu Gimnasio está preparado para recibir socios',
    subtitle: 'Habilitamos control de membresías, terminal de check-in con código QR y aforo de clases.',
    badgeText: 'FITNESS',
    checklist: [
      {
        id: 'gym_plans',
        label: 'Define tus Planes y Membresías',
        description: 'Configura tarifas mensuales, trimestrales, pases libres y sesiones personales.',
        href: '/products',
        buttonText: 'Crear Membresías'
      },
      {
        id: 'gym_members',
        label: 'Registra a tus primeros Socios',
        description: 'Añade datos de contacto, fecha de inicio y número de WhatsApp para recordatorios.',
        href: '/gym/members',
        buttonText: 'Registrar Socios'
      },
      {
        id: 'gym_checkin',
        label: 'Prueba el Torniquete Check-in QR',
        description: 'Abre la pantalla de recepción para validar accesos por código QR o documento.',
        href: '/gym/checkin',
        buttonText: 'Abrir Check-in'
      },
      {
        id: 'gym_classes',
        label: 'Programa tus Clases Grupales',
        description: 'Configura horarios de spinning, funcional o yoga con control de aforo.',
        href: '/gym/classes',
        buttonText: 'Ver Clases'
      }
    ]
  },

  veterinary: {
    title: 'Tu Veterinaria está lista para consultas y spa',
    subtitle: 'Habilitamos historias clínicas digitales, carnet de vacunación y turnos de peluquería.',
    badgeText: 'VETERINARIA',
    checklist: [
      {
        id: 'vet_services',
        label: 'Configura Servicios y Alimento Pet',
        description: 'Registra consultas, vacunas, paquetes de spa y concentrado a granel.',
        href: '/products',
        buttonText: 'Crear Servicios'
      },
      {
        id: 'vet_pets',
        label: 'Registra a tus primeros Pacientes Mascotas',
        description: 'Crea fichas con especie, raza, peso, edad y datos del tutor o dueño.',
        href: '/veterinary/pets',
        buttonText: 'Registrar Mascota'
      },
      {
        id: 'vet_clinical',
        label: 'Abre una Historia Clínica de Prueba',
        description: 'Documenta anamnesis, constantes vitales y fórmula médica.',
        href: '/veterinary/clinical',
        buttonText: 'Nueva Consulta'
      },
      {
        id: 'vet_vaccines',
        label: 'Configura Carnet de Vacunas',
        description: 'Programa alertas y notificaciones automáticas por WhatsApp para refuerzos.',
        href: '/veterinary/vaccines',
        buttonText: 'Ver Vacunas'
      }
    ]
  },

  apparel: {
    title: 'Tu Boutique está lista para la temporada',
    subtitle: 'Habilitamos matriz de tallas y colores, control de vestidores y catálogo de lookbooks.',
    badgeText: 'BOUTIQUE',
    checklist: [
      {
        id: 'apparel_matrix',
        label: 'Crea Prendas con Matriz Talla/Color',
        description: 'Genera códigos de barra por variante (S, M, L, XL / Negro, Blanco, Azul).',
        href: '/apparel/matrix',
        buttonText: 'Crear Matriz'
      },
      {
        id: 'apparel_fitting',
        label: 'Activa el Control de Probadores',
        description: 'Gestiona prendas en cabina y agiliza la venta de ropa en mostrador.',
        href: '/apparel/fitting-rooms',
        buttonText: 'Ver Probadores'
      },
      {
        id: 'apparel_lookbooks',
        label: 'Diseña tu primer Lookbook',
        description: 'Arma combinaciones de outfits para sugerir en el punto de venta.',
        href: '/apparel/lookbooks',
        buttonText: 'Ver Lookbooks'
      }
    ]
  },

  automotive: {
    title: 'Tu Taller Mecánico está listo para recibir vehículos',
    subtitle: 'Habilitamos órdenes de servicio por placa, checklist de recepción y cola de autolavado.',
    badgeText: 'TALLER',
    checklist: [
      {
        id: 'auto_orders',
        label: 'Crea tu primera Orden de Trabajo',
        description: 'Ingresa placa, kilometraje, nivel de combustible y checklist del vehículo.',
        href: '/automotive/orders',
        buttonText: 'Nueva Orden'
      },
      {
        id: 'auto_parts',
        label: 'Carga tu Inventario de Repuestos',
        description: 'Registra aceites, filtros, pastillas y mano de obra con su costo y precio.',
        href: '/products',
        buttonText: 'Cargar Repuestos'
      },
      {
        id: 'auto_wash',
        label: 'Gestiona Bahías de Autolavado',
        description: 'Organiza la fila de vehículos en lavado sencillo, general o polichado.',
        href: '/automotive/wash',
        buttonText: 'Ver Lavadero'
      }
    ]
  },

  beauty_salon: {
    title: 'Tu Salón de Belleza está listo para agendar',
    subtitle: 'Habilitamos agenda de turnos por profesional, catálogo de servicios y liquidación de comisiones.',
    badgeText: 'ESTÉTICA',
    checklist: [
      {
        id: 'salon_services',
        label: 'Configura Servicios y Tratamientos',
        description: 'Registra corte, tintura, blower, spa de uñas y porcentaje de comisión.',
        href: '/products',
        buttonText: 'Crear Servicios'
      },
      {
        id: 'salon_agenda',
        label: 'Revisa la Agenda de Citas',
        description: 'Organiza turnos de clientes por estilista y horario disponible.',
        href: '/salon/agenda',
        buttonText: 'Ver Agenda'
      },
      {
        id: 'salon_commissions',
        label: 'Configura Comisiones de Personal',
        description: 'Establece porcentajes de ganancia para tus profesionales de estética.',
        href: '/salon/commissions',
        buttonText: 'Ver Comisiones'
      }
    ]
  },

  hardware: {
    title: 'Tu Ferretería está lista para cotizar y despachar',
    subtitle: 'Habilitamos cotizaciones formales A4, control de herramientas en alquiler y patio de bodega.',
    badgeText: 'FERRETERÍA',
    checklist: [
      {
        id: 'hw_products',
        label: 'Carga Materiales y Herramientas',
        description: 'Registra bultos de cemento, varillas, PVC, pinturas y herramientas.',
        href: '/products',
        buttonText: 'Cargar Materiales'
      },
      {
        id: 'hw_quotes',
        label: 'Genera tu primera Cotización A4',
        description: 'Emite presupuestos en PDF descargables para maestros de obra y constructoras.',
        href: '/hardware/quotes',
        buttonText: 'Crear Cotización'
      },
      {
        id: 'hw_rentals',
        label: 'Registra Maquinaria en Alquiler',
        description: 'Controla herramientas rentadas, depósitos en garantía y fechas de retorno.',
        href: '/hardware/rentals',
        buttonText: 'Ver Alquileres'
      }
    ]
  },

  bakery: {
    title: 'Tu Panadería está lista para hornear',
    subtitle: 'Habilitamos control de horneadas del día, registro de mermas y encargos de tortas.',
    badgeText: 'PANADERÍA',
    checklist: [
      {
        id: 'bakery_recipes',
        label: 'Estructura Fichas Técnicas de Pan',
        description: 'Define gramaje de harina, levadura, mantequilla y costo por unidad horneada.',
        href: '/bakery/recipes',
        buttonText: 'Ver Fichas'
      },
      {
        id: 'bakery_orders',
        label: 'Gestiona Encargos de Tortas',
        description: 'Agenda pedidos de repostería personalizados con fecha y hora de entrega.',
        href: '/bakery/custom-orders',
        buttonText: 'Ver Encargos'
      },
      {
        id: 'bakery_prod',
        label: 'Registra Horneadas del Turno',
        description: 'Controla cuántos panes salieron del horno y registra mermas de vitrina.',
        href: '/bakery/production',
        buttonText: 'Ver Producción'
      }
    ]
  },

  liquor_tobacco: {
    title: 'Tu Licorera y Estanco están listos para la noche',
    subtitle: 'Habilitamos control de botellas en barra para copeo, combos de fiesta y envases retornables.',
    badgeText: 'LICORERA',
    checklist: [
      {
        id: 'estanco_bar',
        label: 'Abre Botellas para Servicio en Barra',
        description: 'Controla el trago a trago de botellas abiertas en mostrador.',
        href: '/estanco/bar',
        buttonText: 'Ver Barra'
      },
      {
        id: 'estanco_combos',
        label: 'Crea Combos y Promociones',
        description: 'Configura paquetes de licor + pasabocas + hielo para eventos.',
        href: '/estanco/combos',
        buttonText: 'Crear Combos'
      },
      {
        id: 'estanco_returns',
        label: 'Controla Envases Retornables',
        description: 'Registra préstamos y devoluciones de canastas y cascos de cerveza.',
        href: '/estanco/returns',
        buttonText: 'Ver Retornables'
      }
    ]
  },

  optometry: {
    title: 'Tu Óptica está lista para consultas visuales',
    subtitle: 'Habilitamos historias clínicas de refracción OD/OI y trazabilidad en laboratorio de biselado.',
    badgeText: 'ÓPTICA',
    checklist: [
      {
        id: 'opt_frames',
        label: 'Carga Catálogo de Monturas',
        description: 'Registra monturas oftálmicas, gafas de sol y lentes de contacto.',
        href: '/products',
        buttonText: 'Cargar Monturas'
      },
      {
        id: 'opt_patients',
        label: 'Registra Exámenes Visuales',
        description: 'Ingresa fórmulas de refracción con esfera, cilindro, eje y adición.',
        href: '/optometry/patients',
        buttonText: 'Ver Fórmulas'
      },
      {
        id: 'opt_lab',
        label: 'Envía Órdenes a Taller de Biselado',
        description: 'Haz seguimiento al montaje y tallado de lentes graduados.',
        href: '/optometry/lab',
        buttonText: 'Ver Laboratorio'
      }
    ]
  },

  laundry: {
    title: 'Tu Lavandería está lista para recibir prendas',
    subtitle: 'Habilitamos tickets por prenda/kilo, control de lavado en seco y ubicación en percheros.',
    badgeText: 'LAVANDERÍA',
    checklist: [
      {
        id: 'laundry_orders',
        label: 'Emite tu primer Ticket de Recepción',
        description: 'Pesa la ropa o clasifica trajes y entrega comprobante al cliente.',
        href: '/laundry/orders',
        buttonText: 'Recepción Ropa'
      },
      {
        id: 'laundry_rack',
        label: 'Ubica Prendas en Percheros',
        description: 'Organiza pedidos listos por número de gancho para entrega ágil.',
        href: '/laundry/rack',
        buttonText: 'Ver Percheros'
      }
    ]
  },

  general: {
    title: 'Tu Comercio está listo para vender',
    subtitle: 'Configuramos inventario, compras, cuentas por cobrar y facturación rápida en caja.',
    badgeText: 'COMERCIO',
    checklist: [
      {
        id: 'general_products',
        label: 'Carga tus primeros Productos',
        description: 'Registra nombre, precio de venta, costo y stock disponible en bodega.',
        href: '/products',
        buttonText: 'Crear Productos'
      },
      {
        id: 'general_cash',
        label: 'Realiza la Apertura de Caja',
        description: 'Ingresa el saldo base de efectivo en caja para comenzar tu turno.',
        href: '/cash',
        buttonText: 'Abrir Caja'
      },
      {
        id: 'general_pos',
        label: 'Haz tu primera Venta de Prueba en el POS',
        description: 'Agrega artículos al carrito y prueba los diferentes medios de pago.',
        href: '/pos',
        buttonText: 'Ir al POS'
      },
      {
        id: 'general_customers',
        label: 'Registra a tus Clientes Frecuentes',
        description: 'Crea clientes con límite de crédito para fiar o acumular historial.',
        href: '/customers',
        buttonText: 'Ver Clientes'
      }
    ]
  }
}
