import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { validateTenantAccess, getSecureRole } from '@/lib/supabase/auth-helpers'
import { getVerticalCopilotDirectives } from '@/lib/constants/vertical-copilot'
import { resolveActiveVertical } from '@/lib/constants/vertical-terminology'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// Gemini Function Calling Tool Declarations
const COPILOT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_sales_overview',
        description: 'Consulta métricas y resumen de ventas del negocio para el día de hoy, esta semana o este mes con el desglose exacto por medios de pago (Efectivo, Nequi/Transferencia, Tarjeta, Fiao).',
        parameters: {
          type: 'OBJECT',
          properties: {
            period: {
              type: 'STRING',
              enum: ['today', 'week', 'month'],
              description: 'Periodo a consultar: today (hoy), week (últimos 7 días), month (este mes).'
            }
          },
          required: ['period']
        }
      },
      {
        name: 'query_inventory',
        description: 'Busca existencias de productos en bodega, alertas de bajo stock o medicamentos en droguería.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Nombre o código del producto a buscar (opcional).' },
            low_stock_only: { type: 'BOOLEAN', description: 'Si es true, lista solo productos con stock bajo o agotado.' },
            expiring_soon_only: { type: 'BOOLEAN', description: 'Si es true, busca medicamentos o lotes próximos a vencer.' }
          }
        }
      },
      {
        name: 'query_customers_debt',
        description: 'Consulta la cartera de clientes, cuentas por cobrar (fiaos), deudas pendientes y límites de crédito.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customer_name: { type: 'STRING', description: 'Nombre del cliente a consultar (opcional).' },
            only_debtors: { type: 'BOOLEAN', description: 'Si es true, lista solo clientes con saldo pendiente de pago.' }
          }
        }
      },
      {
        name: 'create_product',
        description: 'Crea un nuevo producto en el catálogo e inventario del negocio.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Nombre del producto.' },
            price: { type: 'NUMBER', description: 'Precio de venta al público en COP.' },
            cost: { type: 'NUMBER', description: 'Costo de compra del producto en COP.' },
            stock: { type: 'NUMBER', description: 'Cantidad inicial de unidades en inventario.' },
            sku: { type: 'STRING', description: 'Código de barras o SKU (opcional).' }
          },
          required: ['name', 'price']
        }
      },
      {
        name: 'generate_invoice_pdf',
        description: 'Obtiene los datos completos de una factura o ticket de venta para generar y descargar el PDF imprimible.',
        parameters: {
          type: 'OBJECT',
          properties: {
            sale_number: { type: 'STRING', description: 'Número o folio de la venta (ej: POS-001 o V-20260821-b02875).' }
          },
          required: ['sale_number']
        }
      },
      {
        name: 'generate_pnl_pdf',
        description: 'Calcula el Estado de Resultados Financiero (P&L: Ventas, Costos, Utilidad Bruta y Margen) para generar el PDF oficial.',
        parameters: {
          type: 'OBJECT',
          properties: {
            period: {
              type: 'STRING',
              enum: ['today', 'month'],
              description: 'Periodo del informe: today (hoy) o month (este mes).'
            }
          },
          required: ['period']
        }
      },
      {
        name: 'get_system_guide',
        description: 'Obtiene explicaciones paso a paso de cómo operar cualquier módulo de Mr. Tender (POS, Cierre de Caja, FEFO, Devoluciones, etc.).',
        parameters: {
          type: 'OBJECT',
          properties: {
            topic: {
              type: 'STRING',
              description: 'Tema o duda sobre el ERP (ej: pos_sale, cash_closing, refunds, pharmacy_fefo, customer_credit, tax_calculation).'
            }
          },
          required: ['topic']
        }
      },
      {
        name: 'recommend_medicine_by_symptoms',
        description: 'Asistente clínico-farmacéutico inteligente: Analiza los síntomas expresados por el cliente (ej: dolor de cabeza, fiebre, acidez, reflujo, tos seca/con flema, diarrea, congestión, cólicos, alergia) e investiga guías farmacológicas reales en internet para cruzar con el inventario disponible en la farmacia. Sugiere medicamentos en stock, posología orientativa, advertencias y el descargo legal obligatorio.',
        parameters: {
          type: 'OBJECT',
          properties: {
            symptoms: {
              type: 'STRING',
              description: 'Descripción de los síntomas o motivo de consulta del cliente (ej: ardor en el estómago y acidez, dolor de garganta y fiebre).'
            },
            patient_category: {
              type: 'STRING',
              enum: ['adulto', 'pediatrico', 'adulto_mayor', 'embarazo', 'general'],
              description: 'Grupo etario o condición especial del paciente si fue mencionado.'
            },
            suspected_active_ingredients: {
              type: 'STRING',
              description: 'Principios activos sugeridos a buscar en inventario (ej: acetaminofen, omeprazol, ibuprofeno, loratadina, hidroxido de aluminio).'
            }
          },
          required: ['symptoms']
        }
      }
    ]
  }
]

// Rate limiting map: tenantId -> { count: number, resetTime: number }
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_MINUTE = 40
const tenantRateLimits = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const record = tenantRateLimits.get(tenantId)

  if (!record || now > record.resetTime) {
    tenantRateLimits.set(tenantId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false
  }

  record.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión para usar el copiloto.' }, { status: 401 })
    }

    const authCheck = validateTenantAccess(user)
    if (!authCheck.ok) {
      return authCheck.response
    }

    const { tenantId: tenant_id, role: user_role, fullName: user_name } = authCheck.context

    // Rate limiting
    if (!checkRateLimit(tenant_id)) {
      return NextResponse.json({
        reply: '⏳ Has alcanzado el límite de consultas por minuto para tu negocio. Por favor espera unos segundos antes de consultar nuevamente.'
      }, { status: 429 })
    }

    const { message, conversationHistory } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: '⚠️ La clave de API de Gemini no está configurada en el servidor. Por favor revisa la variable GEMINI_API_KEY.'
      })
    }

    // Server-verified user identity & permissions
    const isAdmin = user_role === 'admin' || user_role === 'owner' || user_role === 'superadmin'

    let allowedPerms: string[] = isAdmin ? ['*'] : []
    if (!isAdmin) {
      const { data: empData } = await supabase
        .from('employees')
        .select('permissions')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .maybeSingle()
      allowedPerms = empData?.permissions || ['pos.view', 'pos.create_sale']
    }

    // Query tenant settings & business_type for vertical context
    const [settingsRes, ptRes] = await Promise.all([
      supabase.from('tenant_settings').select('enabled_modules').eq('tenant_id', tenant_id).limit(1),
      supabase.from('platform_tenants').select('business_type').eq('id', tenant_id).limit(1)
    ])

    const activeVertical = resolveActiveVertical(settingsRes.data?.[0]?.enabled_modules, ptRes.data?.[0]?.business_type)
    const verticalDirectives = getVerticalCopilotDirectives(activeVertical)

    const systemInstruction = `
Eres Tender Copilot AI, el copiloto inteligente y asistente operacional de Mr. Tender ERP para empresas y comercios en Colombia y Latinoamérica.

${verticalDirectives}

👤 USUARIO ACTUAL:
- Nombre: ${user_name || 'Usuario'}
- Rol en la tienda: ${user_role || 'Empleado'} (${isAdmin ? 'Administrador / Dueño con acceso total' : 'Empleado con permisos restringidos'})
- Permisos activos: ${JSON.stringify(allowedPerms)}

🛡️ REGLAS GENERALES:
1. Si el usuario es 'Cajero' o 'Empleado' y solicita información confidencial de utilidades financieras globales sin tener permiso ('reports.financial'), deniégalo cortésmente.
2. Si el usuario pregunta por ventas, entrega siempre un desglose limpio y claro en Pesos Colombianos con el símbolo $ (ejemplo: $ 2.800).
3. Muestra el número total de pedidos y el valor cobrado por cada método de pago (Efectivo, Nequi / Transferencia, Tarjetas, Fiao).

💊 ASISTENCIA FARMACÉUTICA POR SÍNTOMAS (ORIENTACIÓN CLÍNICA Y POSOLOGÍA):
Cuando el usuario mencione síntomas de un cliente (ej: ardor en el estómago, dolor de cabeza, fiebre, tos, diarrea, dolor muscular, alergia) o pida recomendación de medicamentos:
1. **Invoca siempre** la función \`recommend_medicine_by_symptoms\` para consultar el catálogo de medicamentos y stock en tiempo real de la farmacia.
2. **Cruce con Inventario Real**:
   - Revisa los medicamentos disponibles en stock en la farmacia devueltos por la herramienta.
   - Da **prioridad explícita** a los productos que actualmente TIENEN STOCK en la droguería (menciona nombre comercial, principio activo genérico, concentración, forma farmacéutica, unidades en stock y precio en COP).
   - Si no hay stock del principio activo exacto, infórmalo con claridad y ofrece opciones terapéuticas alternativas disponibles en el inventario.
3. **Investigación Farmacológica & Posología Estándar Orientativa**:
   - Explica brevemente el mecanismo o razón por la cual el principio activo ayuda con el síntoma (basado en literatura médica y vademécums reales de internet).
   - Proporciona la **posología estándar orientativa** (dosis sugerida para adultos o rango general, frecuencia en horas ej: cada 8 horas, vía de administración, si se toma con comidas o agua, y duración máxima recomendada del tratamiento).
   - Clasifica claramente si el medicamento es de Venta Libre (**OTC**) o requiere Fórmula Médica (**Rx / Controlado**).
4. **Fundamento en Datos Reales de Internet**:
   - Señala con transparencia: *"Esta sugerencia está formulada a partir de información farmacológica real de vademécums médicos en internet y cruzada con el inventario físico disponible en tu droguería."*
5. **DESCARGO DE RESPONSABILIDAD OBLIGATORIO**:
   En toda respuesta que involucre sugerencia de medicamentos, síntomas o posología, incluye **OBLIGATORIAMENTE Y AL FINAL** el siguiente bloque exacto:
   > ⚠️ **Aviso de Responsabilidad Legal y Farmacéutica:**
   > Esta información es una sugerencia orientativa de apoyo basada en datos reales de internet e inventario actual. **La responsabilidad de sugerir, prescribir o suministrar un medicamento es única y exclusiva del vendedor / regente de farmacia.** No reemplaza la consulta o prescripción de un médico profesional. Si los síntomas persisten, son graves, o se trata de mujeres embarazadas o niños pequeños, se debe remitir inmediatamente a consulta médica.

🧭 MAPA DE NAVEGACIÓN OFICIAL DE MR. TENDER (OBLIGATORIO PARA GUIAR AL USUARIO):
El menú lateral (Sidebar) de Mr. Tender está organizado en menús y submenús desplegables. NUNCA des nombres inventados. Indica SIEMPRE la ruta exacta paso a paso con el menú principal y submenú:

2. 🛒 **Ventas** (Menú lateral):
   - **Punto de Venta** ➔ Pantalla para cobrar y registrar pedidos en mostrador: \`[Abrir Punto de Venta ➔](/pos)\`
   - **Caja & Turnos** ➔ Apertura de turno, arqueo físico y cierres de caja: \`[Ir a Caja & Turnos ➔](/cash)\`
   - **Cotizaciones** ➔ Cotizaciones para construcción y presupuestos: \`[Ver Cotizaciones ➔](/hardware/quotes)\`
   - **CRM & Fidelización** ➔ Puntos de clientes, clubes de fidelidad y promociones: \`[Ir a CRM & Puntos ➔](/crm)\`
   - **Tienda Online** ➔ Catálogo digital e-commerce y pedidos web: \`[Ver Tienda Online ➔](/ecommerce)\`
   - **Mesas & Salón** ➔ Mapa de mesas, comandas y salón (Restaurante): \`[Ver Mesas & Salón ➔](/restaurant/tables)\`
   - **Agenda de Citas** ➔ Citas de estética, barbería y peluquería: \`[Ver Agenda de Citas ➔](/salon/agenda)\`
   - **Recepción Lavandería** ➔ Tickets y recepción de prendas por kilo: \`[Ver Tickets Lavandería ➔](/laundry/orders)\`
   - **Órdenes de Taller** ➔ Recepción vehicular y órdenes por placa: \`[Ver Órdenes Taller ➔](/automotive/orders)\`
   - **Encargos & Tortas** ➔ Pedidos de pastelería y tortas personalizadas: \`[Ver Encargos ➔](/bakery/custom-orders)\`
   - **Clases & Aforo** ➔ Programación de clases grupales y aforo (Gimnasio): \`[Ver Clases Gimnasio ➔](/gym/classes)\`
   - **Combos & Happy Hour** ➔ Promociones y paquetes de fiesta (Licorera): \`[Ver Combos ➔](/estanco/combos)\`
   - **Outfits & Lookbooks** ➔ Lookbooks y venta sugerida de outfits (Moda): \`[Ver Outfits ➔](/apparel/lookbooks)\`
3. 🧾 **Facturación** (Menú lateral - Cumplimiento Fiscal DIAN):
   - **Facturación DIAN** ➔ Facturas electrónicas de venta, notas crédito, CUFE y XML: \`[Ver Facturación DIAN ➔](/invoices)\`
   - **Documento Soporte DIAN** ➔ Documento soporte electrónico para compras a no obligados a facturar: \`[Ver Doc Soporte ➔](/purchases/support-doc)\`
4. 📦 **Inventario** (Menú lateral):
   - **Productos Generales** ➔ Catálogo general, códigos de barras SKU y precios: \`[Gestionar Productos ➔](/products)\`
   - **Inventario & Kardex** ➔ Kardex, conteos físicos y transferencias de bodega: \`[Ver Inventario ➔](/inventory)\`
   - **Bodegas & Almacenes** ➔ Gestión de múltiples sucursales y depósitos: \`[Ver Bodegas ➔](/warehouses)\`
   - **Medicamentos & INVIMA** ➔ Fármacos, principios activos y precios por fracción: \`[Ver Medicamentos ➔](/pharmacy/medicines)\`
   - **Control de Lotes & FEFO** ➔ Semáforo de caducidad y lotes farmacéuticos: \`[Ver Lotes FEFO ➔](/pharmacy/lots)\`
   - **Recetas & Escandallo** ➔ Fichas técnicas, costo por porción y recetas gastronómicas: \`[Ver Recetas ➔](/restaurant/recipes)\`
   - **Fichas Panadería** ➔ Gramajes, costos de horneada y recetas de pan: \`[Ver Fichas Panadería ➔](/bakery/recipes)\`
   - **Matriz Talla/Color** ➔ Matriz de tallas, colores y colecciones de ropa: \`[Ver Matriz Moda ➔](/apparel/matrix)\`
   - **Envases Retornables** ➔ Control de cascos, canastas y depósitos (Licorera): \`[Ver Envases Retornables ➔](/estanco/returns)\`
5. 🚚 **Compras** (Menú lateral):
   - **Compras & Recepción** ➔ Registro de compras, facturas de proveedores e insumos: \`[Ir a Compras ➔](/purchases)\`
   - **Proveedores & Contactos** ➔ Directorio de fabricantes, distribuidores y contactos comerciales: \`[Ver Proveedores ➔](/suppliers)\`
6. 👥 **Clientes** (Menú lateral):
   - **Directorio & Fiaos** ➔ Clientes generales, cuentas por cobrar y fiaos: \`[Ver Clientes ➔](/customers)\`
   - **Socios Gimnasio** ➔ Membresías activas, vencimientos y antropometría: \`[Ver Socios Gimnasio ➔](/gym/members)\`
   - **Pacientes Mascotas** ➔ Fichas de mascotas, tutores y razas (Veterinaria): \`[Ver Mascotas ➔](/veterinary/pets)\`
   - **Consultas Médicas Vet** ➔ Historias clínicas y evolución de pacientes pet: \`[Ver Consultas Vet ➔](/veterinary/clinical)\`
   - **Historias Clínicas Óptica** ➔ Exámenes visuales y fórmulas de refracción OD/OI: \`[Ver Historias Óptica ➔](/optometry/patients)\`
7. 👨‍🍳 **Operaciones** (Menú lateral):
   - **Cocina KDS** ➔ Comandera en tiempo real para cocineros y baristas: \`[Ver Pantalla KDS ➔](/restaurant/kds)\`
   - **Horneadas & Mermas** ➔ Registro de tandas de horneado y control de mermas: \`[Ver Horneadas ➔](/bakery/production)\`
   - **Terminal Check-in QR** ➔ Control de acceso y torniquetes para socios: \`[Abrir Terminal Check-in ➔](/gym/checkin)\`
   - **Cola de Autolavado** ➔ Turnos de bahías de lavado y secado: \`[Ver Autolavado ➔](/automotive/wash)\`
   - **Planta & Percheros** ➔ Ubicación física de prendas y estado de lavado: \`[Ver Percheros ➔](/laundry/rack)\`
   - **Laboratorio Oftálmico** ➔ Órdenes de biselado, tallado y montaje de lentes: \`[Ver Laboratorio ➔](/optometry/lab)\`
   - **Alquiler Herramientas** ➔ Control de maquinaria en renta y garantías: \`[Ver Alquileres ➔](/hardware/rentals)\`
   - **Barra & Copeo** ➔ Botellas abiertas en barra y venta por trago (Licorera): \`[Ver Barra & Copeo ➔](/estanco/bar)\`
   - **Probadores & Cabinas** ➔ Control de vestidores y prendas en cabina (Moda): \`[Ver Probadores ➔](/apparel/fitting-rooms)\`
   - **Peluquería & Spa Pet** ➔ Turnos de baño, spa y guardería canina (Veterinaria): \`[Ver Peluquería Pet ➔](/veterinary/grooming)\`
8. 👔 **Personal** (Menú lateral):
   - **Personal & Asistencia** ➔ Gestión de empleados, cajeros, permisos y accesos: \`[Gestionar Personal ➔](/employees)\`
   - **Nómina Electrónica** ➔ Salarios, devengados, deducciones y emisión DIAN: \`[Ver Nómina ➔](/payroll)\`
   - **Liquidación Comisiones** ➔ Cálculo de comisiones por ventas/servicios: \`[Ver Comisiones ➔](/salon/commissions)\`
9. 📊 **Finanzas** (Menú lateral):
   - **Reportes & P&L** ➔ Ventas, márgenes, rentabilidad por producto y gráficos: \`[Ver Reportes ➔](/reports)\`
   - **Tesorería & Bancos** ➔ Flujo de caja, conciliación bancaria y bancos: \`[Ver Tesorería ➔](/treasury)\`
   - **Contabilidad PUC** ➔ Libro diario, plan contable y balances oficiales: \`[Ir a Contabilidad ➔](/accounting)\`
10. 🩺 **Calidad** (Menú lateral):
   - **Termohigrometría & Salud** ➔ Registro diario de temperatura y humedad para inspección sanitaria: \`[Ver Termohigrometría ➔](/pharmacy/temperature)\`
   - **Carnet Vacunación Pet** ➔ Vacunas, desparasitación y refuerzos de mascotas: \`[Ver Vacunación Pet ➔](/veterinary/vaccines)\`
11. ⚙️ **Administración** (Menú lateral):
   - **Configuración de Negocio** ➔ Módulos activos, datos fiscales, tickets y personalización: \`[Ir a Configuración ➔](/settings)\`

🎯 REGLA DE ORO PARA TUTORIALES Y GUÍAS DINÁMICAS:
Cuando el usuario pregunte cómo hacer algo en el sistema (ej: cerrar caja, registrar una venta, ajustar inventario, cobrar fiao, ver reportes, etc.):
1. **Ruta guiada exacta**: Indica la ubicación exacta: *"En el menú lateral izquierdo, haz clic en **[Menú Principal]** ➡️ **[Submenú]**"*.
2. **Botón interactivo**: Incluye de inmediato el botón de acción Markdown: ej: \`[Ir a Caja & Turnos ➔](/cash)\` o \`[Abrir Punto de Venta ➔](/pos)\`.
3. **Pasos claros dentro de la pantalla**: Explica de manera concisa y numerada los botones exactos que debe oprimir dentro de esa vista.
`

    // Build chat contents for Gemini API
    const contents: any[] = []

    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach((h: any) => {
        if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          })
        }
      })
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    // Call Gemini API (First Turn)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const firstResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: COPILOT_TOOLS
      })
    })

    if (!firstResponse.ok) {
      const errText = await firstResponse.text()
      console.error('Gemini API Error:', errText)
      return NextResponse.json({
        reply: 'Hubo un error al procesar tu solicitud con el modelo de IA. Intenta de nuevo en unos momentos.'
      })
    }

    const firstData = await firstResponse.json()
    const candidate = firstData.candidates?.[0]
    const modelParts = candidate?.content?.parts || []

    const functionCallPart = modelParts.find((p: any) => p.functionCall)

    if (!functionCallPart) {
      const text = modelParts.map((p: any) => p.text || '').join('\n')
      return NextResponse.json({ reply: text })
    }

    // ── 3. EXECUTE FUNCTION CALLS SECURELY ──
    const funcName = functionCallPart.functionCall.name
    const funcArgs = functionCallPart.functionCall.args || {}

    let toolResult: any = null
    let generatedPdfData: any = null

    if (funcName === 'get_sales_overview') {
      if (!isAdmin && !allowedPerms.includes('reports.sales') && !allowedPerms.includes('*')) {
        toolResult = { error: 'Acceso denegado. No tienes permisos para ver reportes de ventas.' }
      } else {
        const colDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
        let startDate = `${colDateStr}T00:00:00-05:00`
        let endDate = `${colDateStr}T23:59:59-05:00`

        if (funcArgs.period === 'week') {
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          endDate = new Date().toISOString()
        } else if (funcArgs.period === 'month') {
          startDate = `${colDateStr.substring(0, 7)}-01T00:00:00-05:00`
          endDate = `${colDateStr}T23:59:59-05:00`
        }

        let query = supabase
          .from('sales')
          .select('id, number, total, subtotal, tax_amount, created_at')
          .eq('tenant_id', tenant_id)
          .gte('created_at', startDate)

        if (funcArgs.period === 'today') {
          query = query.lte('created_at', endDate)
        }

        const { data: sales, error: salesErr } = await query

        if (salesErr) {
          toolResult = { error: salesErr.message }
        } else {
          const totalSales = sales?.reduce((sum, s) => sum + Number(s.total || 0), 0) || 0
          const saleIds = sales?.map(s => s.id) || []

          let cashTotal = 0
          let transferTotal = 0
          let cardTotal = 0
          let fiaoTotal = 0

          if (saleIds.length > 0) {
            const { data: payments } = await supabase
              .from('sale_payments')
              .select('sale_id, payment_method, amount')
              .in('sale_id', saleIds)

            if (payments && payments.length > 0) {
              payments.forEach(p => {
                const amt = Number(p.amount || 0)
                const method = (p.payment_method || '').toLowerCase()

                if (method === 'cash' || method.includes('efectivo')) {
                  cashTotal += amt
                } else if (method === 'transfer' || method.includes('nequi') || method.includes('daviplata') || method.includes('bancolombia')) {
                  transferTotal += amt
                } else if (method === 'card' || method.includes('tarjeta') || method.includes('debito') || method.includes('credito')) {
                  cardTotal += amt
                } else if (method === 'fiao' || method.includes('credit')) {
                  fiaoTotal += amt
                } else {
                  cashTotal += amt
                }
              })
            } else {
              cashTotal = totalSales
            }
          }

          toolResult = {
            period: funcArgs.period,
            sales_count: sales?.length || 0,
            total_sales_cop: totalSales,
            payment_methods_breakdown: {
              efectivo_cash: cashTotal,
              nequi_transferencia: transferTotal,
              tarjetas_card: cardTotal,
              fiao_credito: fiaoTotal
            }
          }
        }
      }
    } else if (funcName === 'query_inventory') {
      let queryBuilder = supabase
        .from('products')
        .select('id, name, sku, sale_price, cost_price, inventory(quantity, warehouse_id)')
        .eq('tenant_id', tenant_id)
        .limit(30)

      if (funcArgs.query) {
        queryBuilder = queryBuilder.ilike('name', `%${funcArgs.query}%`)
      }

      const { data: prods, error } = await queryBuilder

      if (error) {
        toolResult = { error: error.message }
      } else {
        const mapped = prods?.map(p => {
          const stock = p.inventory?.reduce((sum: number, curr: any) => sum + Number(curr.quantity || 0), 0) || 0
          return {
            name: p.name,
            sku: p.sku || 'N/A',
            price: p.sale_price,
            cost: isAdmin ? p.cost_price : undefined,
            stock
          }
        })

        let filtered = mapped || []
        if (funcArgs.low_stock_only) {
          filtered = filtered.filter(p => p.stock <= 5)
        }

        // Also search pharmacy medicines
        let pharmMeds: any[] = []
        if (funcArgs.query) {
          const { data: pMeds } = await supabase
            .from('pharmacy_medicines')
            .select('trade_name, generic_name, concentration, unit_price, cost_price')
            .eq('tenant_id', tenant_id)
            .ilike('trade_name', `%${funcArgs.query}%`)
            .limit(10)
          pharmMeds = pMeds || []
        }

        toolResult = {
          products: filtered.slice(0, 20),
          pharmacyMedicines: pharmMeds,
          totalFound: filtered.length + pharmMeds.length
        }
      }
    } else if (funcName === 'query_customers_debt') {
      const { data: custs, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, credit_limit, credit_used')
        .eq('tenant_id', tenant_id)
        .order('credit_used', { ascending: false })
        .limit(20)

      if (error) {
        toolResult = { error: error.message }
      } else {
        let list = custs || []
        if (funcArgs.customer_name) {
          const qName = funcArgs.customer_name.toLowerCase()
          list = list.filter(c => c.full_name?.toLowerCase().includes(qName))
        }
        if (funcArgs.only_debtors) {
          list = list.filter(c => Number(c.credit_used || 0) > 0)
        }
        toolResult = {
          customers: list.map(c => ({
            name: c.full_name,
            phone: c.phone || 'N/A',
            creditLimit: c.credit_limit,
            amountOwed: c.credit_used,
            availableCredit: Math.max(0, Number(c.credit_limit || 0) - Number(c.credit_used || 0))
          }))
        }
      }
    } else if (funcName === 'create_product') {
      if (!isAdmin && !allowedPerms.includes('products.create') && !allowedPerms.includes('*')) {
        toolResult = { error: 'Acceso denegado. No tienes permisos para crear productos.' }
      } else {
        const sku = funcArgs.sku || ('SKU-' + Math.floor(1000 + Math.random() * 9000))
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert([{
            tenant_id,
            name: funcArgs.name,
            sale_price: funcArgs.price,
            cost_price: funcArgs.cost || (funcArgs.price * 0.7),
            sku,
            product_type: 'single',
            is_active: true
          }])
          .select()

        if (prodErr) {
          toolResult = { error: prodErr.message }
        } else {
          const prodId = newProd[0].id
          const { data: wh } = await supabase.from('warehouses').select('id').eq('tenant_id', tenant_id).limit(1)
          if (wh?.[0]?.id) {
            await supabase.from('inventory').insert([{
              tenant_id,
              product_id: prodId,
              warehouse_id: wh[0].id,
              quantity: funcArgs.stock || 10
            }])
          }

          toolResult = {
            success: true,
            product: {
              id: prodId,
              name: funcArgs.name,
              price: funcArgs.price,
              sku,
              stock: funcArgs.stock || 10
            }
          }
        }
      }
    } else if (funcName === 'generate_invoice_pdf') {
      const { data: saleData } = await supabase
        .from('sales')
        .select('id, number, total, subtotal, tax_amount, customer_id, created_at')
        .eq('tenant_id', tenant_id)
        .or(`number.eq.${funcArgs.sale_number},id.eq.${funcArgs.sale_number}`)
        .limit(1)

      if (!saleData || saleData.length === 0) {
        toolResult = { error: `No se encontró ninguna factura con folio ${funcArgs.sale_number}` }
      } else {
        const s = saleData[0]
        const [custRes, itemsRes, payRes, setRes] = await Promise.all([
          s.customer_id ? supabase.from('customers').select('full_name, phone').eq('id', s.customer_id).eq('tenant_id', tenant_id).limit(1) : Promise.resolve({ data: null }),
          supabase.from('sale_items').select('product_name, quantity, unit_price, total').eq('sale_id', s.id),
          supabase.from('sale_payments').select('payment_method, amount').eq('sale_id', s.id),
          supabase.from('tenant_settings').select('business_name, phone').eq('tenant_id', tenant_id).limit(1)
        ])

        const customer = custRes.data?.[0]
        const tenantSetting = setRes.data?.[0]
        const payment = payRes.data?.[0]

        generatedPdfData = {
          type: 'invoice',
          data: {
            businessName: tenantSetting?.business_name || 'MI TIENDA',
            merchantPhone: tenantSetting?.phone || '',
            saleNumber: s.number,
            date: new Date(s.created_at).toLocaleString('es-CO'),
            customerName: customer?.full_name || 'Público General',
            items: itemsRes.data?.map((it: any) => ({
              name: it.product_name,
              quantity: it.quantity,
              unitPrice: it.unit_price,
              total: it.total
            })) || [],
            subtotal: s.subtotal || s.total,
            taxAmount: s.tax_amount || 0,
            total: s.total,
            paymentMethod: payment?.payment_method === 'fiao' ? 'Fiao (Crédito)' : payment?.payment_method === 'transfer' ? 'Nequi / Transferencia' : 'Efectivo'
          }
        }

        toolResult = {
          success: true,
          saleNumber: s.number,
          total: s.total,
          itemCount: itemsRes.data?.length || 0,
          customer: customer?.full_name || 'Público General'
        }
      }
    } else if (funcName === 'generate_pnl_pdf') {
      if (!isAdmin && !allowedPerms.includes('reports.financial') && !allowedPerms.includes('*')) {
        toolResult = { error: 'Acceso denegado. No tienes permisos para exportar el Estado de Resultados.' }
      } else {
        const todayStr = new Date().toISOString().split('T')[0]
        const startDate = funcArgs.period === 'today'
          ? todayStr + 'T00:00:00'
          : todayStr.substring(0, 7) + '-01T00:00:00'

        const { data: sales } = await supabase
          .from('sales')
          .select('id, total, discount_amount')
          .eq('tenant_id', tenant_id)
          .gte('created_at', startDate)

        const saleIds = sales?.map(s => s.id) || []
        let saleItems: any[] = []
        if (saleIds.length > 0) {
          const { data: items } = await supabase
            .from('sale_items')
            .select('cost_price, quantity, total')
            .in('sale_id', saleIds)
          saleItems = items || []
        }

        const { data: tSettings } = await supabase.from('tenant_settings').select('business_name').eq('tenant_id', tenant_id).limit(1)

        let grossSales = 0
        let discounts = 0
        let costOfGoods = 0

        sales?.forEach(s => {
          grossSales += Number(s.total || 0)
          discounts += Number(s.discount_amount || 0)
        })

        saleItems.forEach(it => {
          costOfGoods += (Number(it.cost_price || 0) * Number(it.quantity || 1))
        })

        const netSales = grossSales - discounts
        const grossProfit = netSales - costOfGoods
        const marginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0
        const salesCount = sales?.length || 0

        generatedPdfData = {
          type: 'pnl',
          data: {
            businessName: tSettings?.[0]?.business_name || 'MR TENDER',
            periodName: funcArgs.period === 'today' ? 'Hoy' : 'Este Mes',
            date: new Date().toLocaleDateString('es-CO'),
            grossSales,
            discounts,
            netSales,
            costOfGoods,
            grossProfit,
            marginPercent,
            salesCount,
            avgTicket: salesCount > 0 ? netSales / salesCount : 0
          }
        }

        toolResult = {
          success: true,
          netSales,
          grossProfit,
          marginPercent: marginPercent.toFixed(1) + '%'
        }
      }
    } else if (funcName === 'get_system_guide') {
      const GUIDES: Record<string, string> = {
        cash_closing: `📍 **Ruta en el menú lateral:** **Ventas** ➡️ **Caja & Turnos**

[Ir a Caja & Turnos ➔](/cash)

**Paso a paso para arqueo y cierre de caja:**
1. Haz clic en el botón interactivo superior para ir a **Caja & Turnos** (o búscalo en el menú lateral izquierdo en **Ventas**).
2. En la parte superior derecha de la pantalla, haz clic en el botón **"Cerrar Turno"** o **"Arqueo de Caja"**.
3. **Conteo Físico**: Cuenta el dinero físico que tienes en la gaveta o cajón (billetes y monedas).
4. **Ingresar el Monto**: Escribe el total de dinero físico en el campo *"Efectivo en caja"*.
5. El sistema comparará automáticamente el monto contra las ventas registradas y te indicará si la caja está cuadrada o si existe sobrante o faltante.
6. Haz clic en **"Confirmar Cierre"** para finalizar el turno.`,

        pos_sale: `📍 **Ruta en el menú lateral:** **Ventas** ➡️ **Punto de Venta** (o el botón superior **+ Nueva venta**)

[Abrir Punto de Venta ➔](/pos)

**Paso a paso para registrar una venta en el POS:**
1. Abre el **Punto de Venta** con el botón superior o el botón **+ Nueva venta** en la barra superior.
2. Busca los productos por nombre o código de barras, o pulsa el micrófono **"Voz AI"** para dictar los artículos.
3. Ajusta las cantidades deseadas en el panel del carrito.
4. Haz clic en el botón principal **"Cobrar"**.
5. Selecciona el medio de pago (**Efectivo**, **Nequi / Transferencia**, **Tarjeta** o **Fiao**) y finaliza la venta.`,

        refunds: `📍 **Ruta en el menú lateral:** **Ventas** ➡️ **Punto de Venta**

[Abrir Punto de Venta ➔](/pos)

**Paso a paso para procesar devoluciones:**
1. En el **Punto de Venta**, pulsa el botón **"Devoluciones"**.
2. Escribe el número de ticket o folio de la venta a devolver.
3. Marca los productos a reintegrar y el motivo de la devolución.
4. Confirma para reingresar el stock al inventario y ajustar el arqueo de caja.`,

        pharmacy_fefo: `📍 **Ruta en el menú lateral:** **Inventario** ➡️ **Control Lotes & FEFO**

[Ver Control de Lotes & FEFO ➔](/pharmacy/lots)

**Gestión de Medicamentos y Lotes FEFO (First Expired, First Out):**
1. En **Inventario**, ingresa a **Control Lotes & FEFO** para ver los medicamentos ordenados por fecha de vencimiento más próxima y semáforo preventivo.
2. El sistema aplica el método FEFO de forma automática: al facturar en el POS, descuenta primero el lote con vencimiento más cercano.
3. Puedes registrar nuevos lotes con su fecha de vencimiento, registro INVIMA y cantidades iniciales.`,

        inventory_stock: `📍 **Ruta en el menú lateral:** **Inventario** ➡️ **Inventario & Kardex**

[Ver Inventario ➔](/inventory)

**Gestión de Inventario y Kardex:**
1. En **Inventario** ➡️ **Inventario & Kardex** puedes monitorear el stock general, consultar el Kardex de movimientos y realizar ajustes por merma.`,

        warehouses: `📍 **Ruta en el menú lateral:** **Inventario** ➡️ **Bodegas & Almacenes**

[Ir a Bodegas & Almacenes ➔](/warehouses)

**Control Multi-Bodega y Exportaciones:**
1. Ingresa a **Bodegas & Almacenes** en el menú lateral para gestionar múltiples almacenes, sucursales y puntos de despacho.
2. Puedes crear nuevas bodegas con el botón **"+ Nueva Bodega"**.
3. Haz clic en **"Exportar Consolidado"** para descargar la matriz de stock en Excel/CSV de todas las bodegas.
4. Para cada bodega específica, puedes exportar su inventario individual, generar la **Hoja de Conteo Físico / Auditoría** y hacer transferencias directas.`,

        customer_credit: `📍 **Ruta en el menú lateral:** **Clientes** ➡️ **Directorio & Fiaos**

[Ver Clientes y Fiaos ➔](/customers)

**Gestión de Fiaos y Cuentas por Cobrar:**
1. En **Clientes**, consulta la lista de deudores, montos pendientes y cupos de crédito asignados.
2. Para registrar un pago o abono a la cuenta de un cliente, haz clic sobre el cliente y pulsa **"Registrar Abono"**.`
      }

      toolResult = { guide: GUIDES[funcArgs.topic] || 'Consulta el menú lateral para acceder a los módulos de Mr. Tender.' }
    } else if (funcName === 'recommend_medicine_by_symptoms') {
      try {
        // 1. Fetch pharmacy medicines with their lots and stock
        let pharmQuery = supabase
          .from('pharmacy_medicines')
          .select(`
            id,
            trade_name,
            generic_name,
            concentration,
            pharmaceutical_form,
            laboratory,
            prescription_type,
            unit_price,
            blister_price,
            box_price,
            pharmacy_lots (
              lot_number,
              expiration_date,
              current_quantity,
              status
            )
          `)
          .eq('tenant_id', tenant_id)

        const { data: pharmData, error: pharmErr } = await pharmQuery

        // 2. Fetch general store products that could be OTC/wellness/first-aid
        const { data: prodData } = await supabase
          .from('products')
          .select(`
            id,
            name,
            sku,
            sale_price,
            inventory (
              quantity
            )
          `)
          .eq('tenant_id', tenant_id)
          .limit(40)

        // Process and structure pharmacy items with current physical stock
        const processedMedicines = (pharmData || []).map((m: any) => {
          const validLots = (m.pharmacy_lots || []).filter((l: any) =>
            Number(l.current_quantity || 0) > 0 && l.status !== 'expired'
          )
          const totalStock = validLots.reduce((sum: number, l: any) => sum + Number(l.current_quantity || 0), 0)
          const lotDates = validLots.map((l: any) => l.expiration_date).filter(Boolean).sort()

          return {
            id: m.id,
            trade_name: m.trade_name,
            generic_name: m.generic_name,
            concentration: m.concentration,
            pharmaceutical_form: m.pharmaceutical_form,
            laboratory: m.laboratory,
            prescription_type: m.prescription_type || 'otc',
            unit_price_cop: m.unit_price,
            blister_price_cop: m.blister_price,
            box_price_cop: m.box_price,
            in_stock: totalStock > 0,
            available_units_stock: totalStock,
            nearest_expiration_date: lotDates[0] || 'N/A'
          }
        })

        // Process general store products with active stock
        const processedGeneralProducts = (prodData || [])
          .map((p: any) => {
            const stockQty = p.inventory?.reduce((sum: number, curr: any) => sum + Number(curr.quantity || 0), 0) || 0
            return {
              name: p.name,
              price_cop: p.sale_price,
              stock: stockQty
            }
          })
          .filter((p: any) => p.stock > 0)

        toolResult = {
          symptoms_inquired: funcArgs.symptoms,
          patient_category: funcArgs.patient_category || 'general',
          pharmacy_catalog_with_stock: processedMedicines,
          general_store_available_items: processedGeneralProducts.slice(0, 15),
          total_medicines_in_db: processedMedicines.length,
          instructions_for_ai: 'Cruza los síntomas con la literatura farmacológica real. Recomienda medicamentos en stock de la lista con su posología orientativa (dosis, frecuencia, duración). Clasifica si es OTC o Rx. Concluye OBLIGATORIAMENTE con el aviso de responsabilidad médica/legal exclusivo del vendedor.'
        }
      } catch (err: any) {
        toolResult = {
          error: 'Error al consultar inventario de medicamentos: ' + err.message,
          symptoms_inquired: funcArgs.symptoms
        }
      }
    }

    // ── 4. SECOND TURN: SEND TOOL RESULT BACK TO GEMINI ──
    const secondContents = [
      ...contents,
      {
        role: 'model',
        parts: [{ functionCall: functionCallPart.functionCall }]
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: funcName,
              response: { content: toolResult }
            }
          }
        ]
      }
    ]

    const secondResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: secondContents,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      })
    })

    if (!secondResponse.ok) {
      return NextResponse.json({
        reply: 'Procesé tu consulta, pero hubo un detalle al formatear la respuesta final.',
        generatedPdf: generatedPdfData
      })
    }

    const secondData = await secondResponse.json()
    const finalReply = secondData.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('\n') || 'Listo.'

    return NextResponse.json({
      reply: finalReply,
      generatedPdf: generatedPdfData
    })
  } catch (err: any) {
    console.error('Copilot API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
