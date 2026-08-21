import { NextRequest, NextResponse } from 'next/server'

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
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  media: 0.5, medio: 0.5, cuarto: 0.25, kilo: 1, libra: 1, paquete: 1,
  caja: 1, tira: 1, blister: 1
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Fast string similarity helper (Dice's coefficient)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalize(str1)
  const s2 = normalize(str2)
  if (s1 === s2) return 1.0
  if (s1.includes(s2) || s2.includes(s1)) return 0.85

  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  const common = words1.filter(w => words2.includes(w) && w.length > 2)
  if (common.length > 0) {
    return (2 * common.length) / (words1.length + words2.length)
  }
  return 0
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, products, customers } = (await req.json()) as {
      transcript: string
      products: ProductItem[]
      customers: CustomerItem[]
    }

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Texto de voz requerido' }, { status: 400 })
    }

    const normText = normalize(transcript)
    const result: {
      action: 'add_items' | 'remove_item' | 'clear_cart' | 'select_customer' | 'set_payment' | 'set_discount' | 'mixed'
      itemsToAdd: Array<{ product: ProductItem; quantity: number }>
      itemsToRemove: string[]
      selectedCustomer: CustomerItem | null
      paymentMethod: string | null
      receivedAmount: number | null
      discountAmount: number | null
      feedbackMessage: string
    } = {
      action: 'mixed',
      itemsToAdd: [],
      itemsToRemove: [],
      selectedCustomer: null,
      paymentMethod: null,
      receivedAmount: null,
      discountAmount: null,
      feedbackMessage: ''
    }

    // 1. Check for Cart Clear Intent
    if (/(limpia|limpiar|borra|borrar|cancela|cancelar|vaciar)\s*(el\s*carrito|la\s*orden|todo)/i.test(normText)) {
      result.action = 'clear_cart'
      result.feedbackMessage = 'Carrito vaciado'
      return NextResponse.json(result)
    }

    // 2. Check for Customer / Fiao Intent
    if (customers && customers.length > 0) {
      for (const cust of customers) {
        const custNorm = normalize(cust.full_name)
        const firstName = custNorm.split(' ')[0]

        if (normText.includes(custNorm) || (firstName.length > 2 && normText.includes(firstName))) {
          result.selectedCustomer = cust
          if (/(fiale|fiar|anotale|a la cuenta|al fiao|en cuenta)/i.test(normText)) {
            result.paymentMethod = 'fiao'
          }
          break
        }
      }
    }

    // 3. Check for Payment Method & Cash Received
    if (/(efectivo|paga con|recibo|con billete de|pago de)\s*(\$?\s*[\d\.\,]+|\d+ mil)/i.test(normText)) {
      result.paymentMethod = 'cash'
      const match = normText.match(/(?:paga con|recibo|billete de|pago de)\s*(\d+(?:\.\d+)?|\d+ mil|\d+mil)/i)
      if (match) {
        const valStr = match[1].replace(/\./g, '').trim()
        if (valStr.includes('mil')) {
          const num = parseFloat(valStr.replace('mil', '').trim()) || 1
          result.receivedAmount = num * 1000
        } else {
          result.receivedAmount = parseFloat(valStr) || null
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

        const cleanSeg = seg
          .replace(/\b(agrega|agregar|anota|anotale|pon|ponme|dame|lleva|llevar|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+)\b/gi, '')
          .replace(/\b(kilo|kilos|libra|libras|paquete|paquetes|caja|cajas|de|la|el|los|las|por favor)\b/gi, '')
          .trim()

        if (cleanSeg.length < 2) continue

        let bestMatch: ProductItem | null = null
        let bestScore = 0

        for (const prod of products) {
          const score = stringSimilarity(cleanSeg, prod.name)
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
            result.itemsToAdd.push({ product: bestMatch, quantity: qty })
          }
        }
      }
    }

    const feedbackParts: string[] = []
    if (result.itemsToAdd.length > 0) {
      const itemsList = result.itemsToAdd.map(it => `${it.quantity}x ${it.product.name}`).join(', ')
      feedbackParts.push(`Agregado: ${itemsList}`)
    }
    if (result.selectedCustomer) {
      feedbackParts.push(`Cliente: ${result.selectedCustomer.full_name}`)
    }
    if (result.paymentMethod) {
      feedbackParts.push(`Método: ${result.paymentMethod === 'fiao' ? 'Fiao' : result.paymentMethod === 'cash' ? 'Efectivo' : result.paymentMethod}`)
    }
    if (result.receivedAmount) {
      feedbackParts.push(`Paga con: $${result.receivedAmount.toLocaleString('es-CO')}`)
    }

    result.feedbackMessage = feedbackParts.join(' • ') || 'Comando procesado'

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error in audio-pos API:', err)
    return NextResponse.json({ error: err.message || 'Error procesando comando de voz' }, { status: 500 })
  }
}
