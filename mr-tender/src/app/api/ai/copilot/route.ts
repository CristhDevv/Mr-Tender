import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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
      }
    ]
  }
]

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, tenant_id, user_role, user_name, permissions } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: '⚠️ La clave de API de Gemini no está configurada en el servidor. Por favor revisa la variable GEMINI_API_KEY.'
      })
    }

    // ── 1. SECURITY & PROMPT INJECTION SHIELD ──
    const lowerMsg = message.toLowerCase()

    // Detect prompt injection or jailbreak attempts
    const isJailbreak = /(ignore previous|ignora las instrucciones|act as dan|hazte pasar por|revela tu prompt|dame tu system prompt|cual es tu instruccion|bypass security|dame las api keys)/i.test(lowerMsg)
    if (isJailbreak) {
      return NextResponse.json({
        reply: '🛡️ Como **Tender Copilot AI**, mi función es asistirte exclusivamente en la administración, ventas, inventario y operaciones de tu negocio en Mr. Tender. ¿En qué aspecto de tu tienda o droguería te puedo ayudar hoy?'
      })
    }

    // Detect completely out-of-scope non-business queries
    const isOffTopic = /(escribe un poema de amor|cuentame un cuento de hadas|quien ganara el mundial|receta de cocina casera para cenar|escribe codigo en c\+\+ para hackear|quien es el presidente de)/i.test(lowerMsg)
    if (isOffTopic) {
      return NextResponse.json({
        reply: '👋 Hola, soy el copiloto empresarial de **Mr. Tender**. Estoy entrenado para ayudarte con tus ventas, control de inventario, facturas, clientes, arqueos de caja y dudas sobre el ERP. Por favor cuéntame en qué tarea de tu negocio te puedo colaborar.'
      })
    }

    // ── 2. SYSTEM PROMPT & CONTEXT INJECTION ──
    const isAdmin = user_role === 'admin' || user_role === 'owner' || user_role === 'superadmin'
    const allowedPerms: string[] = Array.isArray(permissions) ? permissions : (isAdmin ? ['*'] : [])

    const systemInstruction = `
Eres Tender Copilot AI, el copiloto inteligente de gestión comercial, finanzas y operaciones de Mr. Tender ERP para comercios y droguerías en Colombia.

👤 USUARIO ACTUAL:
- Nombre: ${user_name || 'Usuario'}
- Rol en la tienda: ${user_role || 'Empleado'} (${isAdmin ? 'Administrador / Dueño con acceso total' : 'Empleado con permisos restringidos'})
- Permisos activos: ${JSON.stringify(allowedPerms)}

🛡️ REGLAS DE SEGURIDAD Y PRIVACIDAD:
1. Si el usuario es 'Cajero' o 'Empleado' y solicita información confidencial de utilidades globales, márgenes financieros o costos de compra sin tener el permiso ('reports.financial' o 'products.view_costs'), DEBES DENEGAR CORTÉSMENTE la respuesta indicando que su rol no tiene los permisos requeridos.
2. Si el usuario es Administrador y pide información de ventas, inventario o reportes, dale la respuesta de forma clara, directa, desglosada y profesional en Pesos Colombianos (COP $).
3. Utiliza formato Markdown elegante (viñetas cortas, cifras en negrita con formato de moneda $).
4. Cuando consultes 'get_sales_overview', muestra siempre el Total Vendido, el número de pedidos y el desglose de cada medio de pago (Efectivo, Nequi / Transferencia, Tarjetas, Fiao).
`

    // Build chat contents for Gemini API
    const contents: any[] = []

    // Previous turns if provided
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach((h: any) => {
        if (h.role && h.content) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          })
        }
      })
    }

    // Current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

    // Check if model called a function
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
        // Calculate start date in Colombian local timezone (UTC-5)
        const now = new Date()
        const bogotaDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now) // 'YYYY-MM-DD'
        let startDate = `${bogotaDateStr}T00:00:00-05:00`
        
        if (funcArgs.period === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          startDate = weekAgo.toISOString()
        } else if (funcArgs.period === 'month') {
          startDate = `${bogotaDateStr.substring(0, 7)}-01T00:00:00-05:00`
        }

        // Fetch sales
        const { data: sales, error: salesErr } = await supabase
          .from('sales')
          .select('id, number, total, subtotal, tax_amount, created_at')
          .eq('tenant_id', tenant_id)
          .gte('created_at', startDate)

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
              // If no explicit sale_payments recorded, default gross to cash
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
        .limit(20)

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

        // Also check pharmacy medicines if searched
        let pharmMeds: any[] = []
        if (funcArgs.query) {
          const { data: pMeds } = await supabase
            .from('pharmacy_medicines')
            .select('trade_name, generic_name, concentration, unit_price, cost_price')
            .eq('tenant_id', tenant_id)
            .ilike('trade_name', `%${funcArgs.query}%`)
            .limit(5)

          pharmMeds = pMeds || []
        }

        toolResult = {
          products: filtered.slice(0, 10),
          pharmacyMedicines: pharmMeds,
          totalFound: filtered.length + pharmMeds.length
        }
      }
    } else if (funcName === 'query_customers_debt') {
      let queryBuilder = supabase
        .from('customers')
        .select('id, full_name, phone, credit_limit, credit_used')
        .eq('tenant_id', tenant_id)
        .order('credit_used', { ascending: false })
        .limit(15)

      if (funcArgs.customer_name) {
        queryBuilder = queryBuilder.ilike('full_name', `%${funcArgs.customer_name}%`)
      }

      const { data: custs, error } = await queryBuilder

      if (error) {
        toolResult = { error: error.message }
      } else {
        let list = custs || []
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
          s.customer_id ? supabase.from('customers').select('full_name, phone').eq('id', s.customer_id).limit(1) : Promise.resolve({ data: null }),
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
        const now = new Date()
        const bogotaDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now)
        const startDate = funcArgs.period === 'today'
          ? `${bogotaDateStr}T00:00:00-05:00`
          : `${bogotaDateStr.substring(0, 7)}-01T00:00:00-05:00`

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
        pos_sale: 'Para vender en el POS: 1) Busca productos por nombre, código o usa el micrófono "Voz AI". 2) Ajusta cantidades. 3) Clic en Cobrar. 4) Selecciona Efectivo, Nequi o Fiao y finaliza.',
        cash_closing: 'Para cerrar caja: 1) Ve al menú Caja. 2) Clic en "Cerrar Turno". 3) Cuenta el dinero físico del cajón y escribe el monto. El sistema calculará automáticamente si hay sobrante o faltante.',
        refunds: 'Para procesar una devolución: 1) En el POS o Caja, abre el menú Devoluciones. 2) Ingresa el número de folio de la venta. 3) Selecciona los ítems a reintegrar y confirma.',
        pharmacy_fefo: 'El sistema de droguería utiliza el método FEFO (First Expired, First Out), asignando automáticamente en cada venta el lote con la fecha de vencimiento más próxima para evitar pérdidas.'
      }

      toolResult = { guide: GUIDES[funcArgs.topic] || 'Consulta la guía general del ERP o navega por los menús del panel.' }
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
