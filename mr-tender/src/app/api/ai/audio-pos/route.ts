import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { resolveActiveVertical, VERTICAL_TERMINOLOGY } from '@/lib/constants/vertical-terminology'

interface ProductItem {
  id: string
  name: string
  sku?: string
  price: number
  stock: number
  unit_type?: string
}

interface CustomerItem {
  id: string
  full_name: string
  phone?: string | null
}

const SPANISH_NUMBERS: Record<string, number> = {
  un: 1, uno: 1, una: 1, unos: 1, unas: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  media: 0.5, medio: 0.5, cuarto: 0.25, kilo: 1, libra: 1, paquete: 1,
  caja: 1, tira: 1, blister: 1, frasco: 1, ampolla: 1,
  plato: 1, porcion: 1, combo: 1, vaso: 1, copa: 1,
  prenda: 1, par: 1, pase: 1, mes: 1,
  bulto: 1, metro: 1, botella: 1, trago: 1, sixpack: 6
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Smart similarity score between spoken segment and product name
function computeMatchScore(spoken: string, productName: string): number {
  const s = normalize(spoken)
  const p = normalize(productName)
  if (s === p) return 1.0
  if (p.includes(s) || s.includes(p)) return 0.90

  const spokenWords = s.split(/\s+/).filter(w => w.length > 2)
  const productWords = p.split(/\s+/).filter(w => w.length > 2)

  if (spokenWords.length === 0 || productWords.length === 0) return 0

  let matches = 0
  for (const sw of spokenWords) {
    if (productWords.some(pw => pw.includes(sw) || sw.includes(pw))) {
      matches++
    }
  }

  // Weight by fraction of spoken query matched
  const coverage = matches / spokenWords.length
  return coverage
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    let tenant_id = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
    if (!tenant_id) {
      const { data: ptData } = await supabase
        .from('platform_tenants')
        .select('id')
        .eq('owner_email', user.email)
        .limit(1)

      if (ptData?.[0]?.id) {
        tenant_id = ptData[0].id
      }
    }

    // Resolve tenant's active vertical for contextual terminology
    let activeVertical: string | null = null
    if (tenant_id) {
      const [settingsRes, ptRes] = await Promise.all([
        supabase.from('tenant_settings').select('enabled_modules').eq('tenant_id', tenant_id).limit(1),
        supabase.from('platform_tenants').select('business_type').eq('id', tenant_id).limit(1)
      ])
      activeVertical = resolveActiveVertical(settingsRes.data?.[0]?.enabled_modules, ptRes.data?.[0]?.business_type)
    }

    const verticalConfig = activeVertical ? VERTICAL_TERMINOLOGY[activeVertical] : null
    const customerTerm = verticalConfig?.terms.customers || 'Cliente'
    const productTerm = verticalConfig?.terms.products || 'Producto'

    const { transcript, products, customers } = (await req.json()) as {
      transcript: string
      products: ProductItem[]
      customers: CustomerItem[]
      vertical?: string
    }

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Texto de voz requerido' }, { status: 400 })
    }

    const normText = normalize(transcript)
    const result: {
      action: 'add_items' | 'remove_item' | 'clear_cart' | 'select_customer' | 'set_payment' | 'set_discount' | 'mixed'
      transcript: string
      itemsToAdd: Array<{ product: ProductItem; quantity: number; matchConfidence: number }>
      itemsToRemove: string[]
      selectedCustomer: CustomerItem | null
      paymentMethod: string | null
      receivedAmount: number | null
      discountAmount: number | null
      requiresConfirmation: boolean
      confidence: number
      feedbackMessage: string
      vertical: string | null
    } = {
      action: 'mixed',
      transcript,
      itemsToAdd: [],
      itemsToRemove: [],
      selectedCustomer: null,
      paymentMethod: null,
      receivedAmount: null,
      discountAmount: null,
      requiresConfirmation: false,
      confidence: 1.0,
      feedbackMessage: '',
      vertical: activeVertical
    }

    // 1. Check for Cart Clear Intent
    if (/(limpia|limpiar|borra|borrar|cancela|cancelar|vaciar)\s*(el\s*carrito|la\s*orden|la\s*comanda|todo)?/i.test(normText)) {
      result.action = 'clear_cart'
      result.feedbackMessage = 'Vaciar el carrito actual'
      return NextResponse.json(result)
    }

    // 2. Check for Customer / Fiao / Patient Intent
    if (customers && customers.length > 0) {
      for (const cust of customers) {
        const custNorm = normalize(cust.full_name)
        const firstName = custNorm.split(' ')[0]

        if (normText.includes(custNorm) || (firstName.length > 2 && normText.includes(firstName))) {
          result.selectedCustomer = cust
          if (/(fiale|fiar|fiao|anotale|a la cuenta|al fiao|en cuenta|credito)/i.test(normText)) {
            result.paymentMethod = 'fiao'
          }
          break
        }
      }
    }

    // 3. Check for Payment Method & Cash Received
    if (/(efectivo|paga con|recibo|con billete de|pago de)\s*(\$?\s*[\d\.\,]+|\d+ mil)/i.test(normText)) {
      result.paymentMethod = 'cash'
      const match = normText.match(/(?:paga con|recibo|billete de|pago de|efectivo)\s*(\d+(?:\.\d+)?|\d+ mil|\d+mil)/i)
      if (match) {
        const valStr = match[1].replace(/\./g, '').trim()
        if (valStr.includes('mil')) {
          const num = parseFloat(valStr.replace('mil', '').trim()) || 1
          result.receivedAmount = num * 1000
        } else {
          const valNum = parseFloat(valStr) || 0
          result.receivedAmount = valNum < 100 ? valNum * 1000 : valNum
        }
      }
    } else if (/(tarjeta|datafono|datáfono|debito|credito)/i.test(normText)) {
      result.paymentMethod = 'card'
    } else if (/(transferencia|nequi|daviplata|bancolombia|transfiya)/i.test(normText)) {
      result.paymentMethod = 'transfer'
    }

    // 4. Extract Products and Quantities
    const segments = normText.split(/,|\by\b|\bcon\b|\bmas\b|\bademas\b|\btambien\b/)

    if (products && products.length > 0) {
      for (const segment of segments) {
        const seg = segment.trim()
        if (!seg) continue

        let qty = 1
        const numMatch = seg.match(/\b(\d+(?:\.\d+)?)\b/)
        if (numMatch) {
          qty = parseFloat(numMatch[1]) || 1
        } else {
          for (const [word, val] of Object.entries(SPANISH_NUMBERS)) {
            const wordRegex = new RegExp(`\\b${word}\\b`, 'i')
            if (wordRegex.test(seg)) {
              qty = val
              break
            }
          }
        }

        // Clean action words, numbers, and filler prepositions
        const cleanSeg = seg
          .replace(/\b(vende|vender|venta|cobra|cobrar|factura|facturar|agrega|agregar|anota|anotale|pon|ponme|dame|lleva|llevar|pasame|sirveme|despacha|despachame|dispensar|marchar|quiero|necesito|pedir)\b/gi, '')
          .replace(/\b(un|uno|una|unos|unas|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+)\b/gi, '')
          .replace(/\b(kilo|kilos|libra|libras|paquete|paquetes|caja|cajas|blister|tira|frasco|porcion|combo|prenda|botella|trago|de|la|el|los|las|por favor|fiale|a|al|favor)\b/gi, '')
          .trim()

        if (cleanSeg.length < 2) continue

        let bestMatch: ProductItem | null = null
        let bestScore = 0

        for (const prod of products) {
          const score = computeMatchScore(cleanSeg, prod.name)
          if (score > bestScore && score >= 0.35) {
            bestScore = score
            bestMatch = prod
          }
        }

        if (bestMatch && bestScore >= 0.35) {
          const existing = result.itemsToAdd.find(it => it.product.id === bestMatch!.id)
          if (existing) {
            existing.quantity += qty
          } else {
            result.itemsToAdd.push({
              product: bestMatch,
              quantity: qty,
              matchConfidence: Math.round(bestScore * 100) / 100
            })
          }

          if (bestScore < 0.70) {
            result.requiresConfirmation = true
          }
        }
      }
    }

    if (result.itemsToAdd.length > 0) {
      const avgConfidence = result.itemsToAdd.reduce((sum, it) => sum + it.matchConfidence, 0) / result.itemsToAdd.length
      result.confidence = Math.round(avgConfidence * 100) / 100
    }

    const feedbackParts: string[] = []
    if (result.itemsToAdd.length > 0) {
      const itemsList = result.itemsToAdd.map(it => `${it.quantity}x ${it.product.name}${it.matchConfidence < 0.70 ? ' (¿Confirmar?)' : ''}`).join(', ')
      feedbackParts.push(`${itemsList}`)
    }
    if (result.selectedCustomer) {
      feedbackParts.push(`${customerTerm}: ${result.selectedCustomer.full_name}`)
    }
    if (result.paymentMethod) {
      feedbackParts.push(`Método: ${result.paymentMethod === 'fiao' ? 'Fiao (Crédito)' : result.paymentMethod === 'cash' ? 'Efectivo' : result.paymentMethod}`)
    }
    if (result.receivedAmount) {
      feedbackParts.push(`Paga con: $${result.receivedAmount.toLocaleString('es-CO')}`)
    }

    result.feedbackMessage = feedbackParts.join(' • ') || `No se detectaron ${productTerm.toLowerCase()}s específicos`

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Audio-POS route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
