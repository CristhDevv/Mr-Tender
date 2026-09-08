'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  STANDARD_CANDY_CATALOG,
  CandyItem,
  calculatePartySurpriseKit
} from '@/lib/candy/candy-engine'
import {
  Sparkles,
  Gift,
  ShoppingCart,
  Users,
  CheckCircle2,
  Package,
  Layers,
  Percent
} from 'lucide-react'

export default function CandyPartyKitsPage() {
  const [kidsCount, setKidsCount] = useState<number>(20)
  const [includePinata, setIncludePinata] = useState<boolean>(true)
  const [pinataPrice, setPinataPrice] = useState<number>(35000)
  const [itemsPerKid, setItemsPerKid] = useState<Record<string, number>>({
    bon_bon_bum: 1,
    frunas_surtidas: 2,
    chocolatina_jet: 1,
    gomitas_grissly: 1,
    galleta_mini_oreo: 1
  })
  const [notice, setNotice] = useState('')

  const handleQtyChange = (candyId: string, delta: number) => {
    setItemsPerKid(prev => {
      const cur = prev[candyId] || 0
      const next = Math.max(0, cur + delta)
      return { ...prev, [candyId]: next }
    })
  }

  const selectedItems = Object.entries(itemsPerKid)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({
      candy: STANDARD_CANDY_CATALOG.find(c => c.id === id)!,
      quantityPerKid: qty
    }))

  const kitResult = calculatePartySurpriseKit(
    kidsCount,
    selectedItems,
    includePinata,
    pinataPrice
  )

  const handleSendToPOS = () => {
    setNotice(`¡Combo de Fiesta (${kidsCount} niños + ${kitResult.totalItemsCount} dulces) cargado al POS por ${formatCurrency(kitResult.totalKitPrice)}!`)
    setTimeout(() => setNotice(''), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 26px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 10px 25px -5px rgba(0, 177, 157, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🍬</span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Armador de Combos de Fiesta & Piñatería
            </h1>
            <p style={{ margin: '3px 0 0', opacity: 0.9, fontSize: '0.84rem' }}>
              Calculador automático de bolsas de sorpresa por niño y requerimientos de paquetes mayoristas
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          
          
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 0.8fr)', gap: 16 }}>
        {/* Left: Configuration Form */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Cantidad de Niños / Invitados
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[10, 15, 20, 25, 30, 50].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setKidsCount(n)}
                    className="btn-neu"
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.78rem',
                      fontWeight: kidsCount === n ? 800 : 600,
                      background: kidsCount === n ? '#00B19D' : '#F8FAFC',
                      color: kidsCount === n ? '#fff' : '#64748B',
                      border: 'none',
                      borderRadius: 8
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Incluir Piñata Temática
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  checked={includePinata}
                  onChange={e => setIncludePinata(e.target.checked)}
                />
                <span>Piñata Grande ({formatCurrency(pinataPrice)})</span>
              </label>
            </div>
          </div>

          {/* Candy Assortment Per Surprise Bag */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Surtido de Dulces por Bolsa de Sorpresa
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STANDARD_CANDY_CATALOG.map(candy => {
                const qty = itemsPerKid[candy.id] || 0
                return (
                  <div
                    key={candy.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: qty > 0 ? '1px solid #99F6E4' : '1px solid #F1F5F9',
                      background: qty > 0 ? '#F0FDFA' : '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{candy.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        {formatCurrency(candy.unitPrice)} c/u • Paquete x {candy.piecesPerPackage} ({formatCurrency(candy.packagePrice)})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(candy.id, -1)}
                        disabled={qty === 0}
                        className="btn-neu"
                        style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                      >
                        -
                      </button>
                      <span style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.88rem', color: '#0F172A' }}>{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(candy.id, 1)}
                        className="btn-neu"
                        style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, background: '#E6F7F5', color: '#00B19D' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Party Package Ticket & Wholesale Shopping List */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderBottom: '1px dashed #CBD5E1', paddingBottom: 12 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#00B19D', textTransform: 'uppercase' }}>
              Cotización Paquete de Fiesta
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0' }}>
              Combo para {kidsCount} Niños
            </h3>
          </div>

          {/* Wholesale Package List */}
          <div>
            <h4 style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
              Insumos & Paquetes a Despachar
            </h4>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#64748B' }}>Producto</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px', color: '#64748B' }}>Total Unid.</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', color: '#64748B' }}>Paquetes</th>
                  </tr>
                </thead>
                <tbody>
                  {kitResult.shoppingList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0F172A' }}>{item.candyName.split(' ')[0]} {item.candyName.split(' ')[1]}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: '#00B19D' }}>{item.totalPiecesNeeded}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>{item.packagesNeeded} paq.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Dulces surtidos ({kitResult.totalItemsCount} unidades):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(kitResult.individualItemsSubtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Bolsas de sorpresa & cintas ({kidsCount} bolsas):</span>
              <span style={{ fontFamily: 'monospace' }}>+{formatCurrency(kitResult.bagsAndRibbonsPrice)}</span>
            </div>

            {includePinata && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Piñata Temática Grande:</span>
                <span style={{ fontFamily: 'monospace' }}>+{formatCurrency(pinataPrice)}</span>
              </div>
            )}

            {kitResult.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
                <span>Descuento Combo ({kitResult.bundleDiscountPercent}%):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>-{formatCurrency(kitResult.discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Grand Total Box */}
          <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', textAlign: 'center', marginTop: 'auto' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Total Combo de Fiesta
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00B19D', marginTop: 2 }}>
              {formatCurrency(kitResult.totalKitPrice)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 800, marginTop: 2 }}>
              Rentabilidad: ~{kitResult.suggestedMarginPercent}%
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendToPOS}
            style={{
              padding: '12px',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(0, 177, 157, 0.3)'
            }}
          >
            <ShoppingCart size={16} />
            <span>Cobrar Combo en POS ({formatCurrency(kitResult.totalKitPrice)})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
