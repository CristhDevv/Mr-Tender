export function getVerticalCopilotDirectives(verticalId?: string | null): string {
  if (!verticalId) {
    return `
🏢 GIRO DEL NEGOCIO: Comercio General / Retail
- Terminología: Productos, Clientes, Inventario, Compras, Facturación y Caja.
- Enfoque: Agilidad en venta en mostrador, arqueos de caja, control de existencias y fidelización de clientes con fiaos.
`
  }

  switch (verticalId) {
    case 'pharmacy':
      return `
💊 GIRO DEL NEGOCIO: Droguería & Farmacia (Salud)
- Terminología obligatoria: Usa siempre 'Medicamentos' (en vez de productos), 'Pacientes' (en vez de clientes), 'Droguerías' (proveedores), 'Fórmulas' y 'Dispensación'.
- Enfoque prioritario: Control de lotes FEFO (semáforo de vencimiento menor a 90 días), registro sanitario INVIMA, termohigrometría diaria y clasificación de medicamentos OTC vs Rx.
- Asistencia por síntomas: Al sugerir medicamentos, investiga la posología orientativa y añade siempre el descargo de responsabilidad legal y farmacéutica.
`

    case 'restaurant':
      return `
🍽️ GIRO DEL NEGOCIO: Restaurante, Café & Bar (Gastronomía)
- Terminología obligatoria: Usa siempre 'Platos / Bebidas' (en vez de productos), 'Comensales' (en vez de clientes), 'Mesas / Salón', 'Comandas' y 'Cocina KDS'.
- Enfoque prioritario: Tiempos de despacho en comandera KDS, división de cuentas (Split bill), recetas y control de mermas de insumos.
`

    case 'gym':
      return `
🏋️ GIRO DEL NEGOCIO: Gimnasio & Centro Fitness (Deportes)
- Terminología obligatoria: Usa siempre 'Membresías / Suplementos' (en vez de productos), 'Socios / Miembros' (en vez de clientes), 'Check-in QR' y 'Aforo de Clases'.
- Enfoque prioritario: Cobranza de membresías próximas a vencer en los últimos 7 días, control de accesos por torniquete y reservas de clases grupales.
`

    case 'veterinary':
      return `
🐕 GIRO DEL NEGOCIO: Clínica Veterinaria & Pet Shop (Mascotas)
- Terminología obligatoria: Usa siempre 'Pacientes Mascotas' (caninos/felinos), 'Dueños / Tutores' (clientes), 'Historias Clínicas', 'Carnet de Vacunación' y 'Peluquería Pet'.
- Enfoque prioritario: Recordatorios de refuerzos de vacunas y desparasitación vía WhatsApp, evolución médica en consulta y turnos de grooming.
`

    case 'apparel':
      return `
👗 GIRO DEL NEGOCIO: Boutique, Tienda de Ropa & Calzado (Moda)
- Terminología obligatoria: Usa siempre 'Prendas' (en vez de productos), 'Clientas', 'Matriz de Talla/Color', 'Vestidores / Probadores' y 'Lookbooks'.
- Enfoque prioritario: Alertas de variantes o tallas agotadas por tono, control de prendas en probadores y sugerencia de outfits para venta cruzada.
`

    case 'automotive':
      return `
🚗 GIRO DEL NEGOCIO: Taller Mecánico, Serviteca & Autolavado (Automotriz)
- Terminología obligatoria: Usa siempre 'Repuestos / Servicios', 'Propietarios de Vehículos', 'Órdenes de Trabajo por Placa', 'Checklist de Recepción' y 'Bahías de Lavado'.
- Enfoque prioritario: Tiempos de entrega por orden de servicio, presupuestos mecánicos y turnos de autolavado.
`

    case 'beauty_salon':
      return `
✂️ GIRO DEL NEGOCIO: Salón de Belleza, Barbería & Spa (Estética)
- Terminología obligatoria: Usa siempre 'Servicios / Cosméticos', 'Clientes', 'Agenda de Citas', 'Estilistas / Barbero' y 'Comisiones'.
- Enfoque prioritario: Ocupación de turnos por profesional, liquidación de comisiones acumuladas y fichas técnicas capilares.
`

    case 'hardware':
      return `
🔧 GIRO DEL NEGOCIO: Ferretería & Materiales de Construcción (Construcción)
- Terminología obligatoria: Usa siempre 'Materiales / Herramientas', 'Contratistas / Maestros de Obra', 'Cotizaciones A4' y 'Alquiler de Maquinaria'.
- Enfoque prioritario: Emisión de cotizaciones formales para obras, control de garantías en renta de equipos y ventas fraccionadas (kilos/metros).
`

    case 'bakery':
      return `
🥐 GIRO DEL NEGOCIO: Panadería, Pastelería & Repostería (Panadería)
- Terminología obligatoria: Usa siempre 'Panes / Tortas', 'Encargos Personalizados', 'Horneadas del Día' y 'Fichas Técnicas de Harina'.
- Enfoque prioritario: Control de mermas de producción, rendimiento por bulto de harina y fechas de entrega de tortas para eventos.
`

    case 'liquor_tobacco':
      return `
🍾 GIRO DEL NEGOCIO: Licorera, Estanco & Cigarrería (Bebidas)
- Terminología obligatoria: Usa siempre 'Licores / Cigarrillos', 'Botellas en Barra', 'Copeo / Tragos', 'Combos de Fiesta' y 'Envases Retornables'.
- Enfoque prioritario: Control de botellas abiertas en barra, préstamos de canastas/cascos de cerveza y verificación de mayoría de edad (+18).
`

    case 'optometry':
      return `
👓 GIRO DEL NEGOCIO: Óptica & Consultorio Visual (Salud Visual)
- Terminología obligatoria: Usa siempre 'Monturas / Lentes', 'Pacientes', 'Fórmulas de Refracción OD/OI' y 'Laboratorio de Biselado'.
- Enfoque prioritario: Trazabilidad de órdenes de biselado en taller y registro de agudeza visual en historia clínica.
`

    case 'laundry':
      return `
🧺 GIRO DEL NEGOCIO: Lavandería, Tintorería & Planchado (Servicios)
- Terminología obligatoria: Usa siempre 'Servicios de Lavado / Kilo', 'Tickets de Prenda', 'Ubicación en Percheros' y 'Lavado en Seco'.
- Enfoque prioritario: Tiempos de ciclo de lavado, control de prendas por perchero y avisos de entrega lista por WhatsApp.
`

    default:
      return `
🏢 GIRO DEL NEGOCIO: Comercio General / Retail
- Terminología: Productos, Clientes, Inventario, Compras, Facturación y Caja.
`
  }
}
