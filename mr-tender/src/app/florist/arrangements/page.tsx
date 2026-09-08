'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  STANDARD_STEMS,
  STANDARD_BASES,
  FlowerStem,
  FloralBase,
  calculateArrangementPricing
} from '@/lib/florist/floral-engine'
import {
  Sparkles,
  Heart,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  ShoppingCart,
  Layers,
  ArrowRight
} from 'lucide-react'

export default function FloristArrangementsPage() {
  const [selectedBase, setSelectedBase] = useState<FloralBase>(STANDARD_BASES[0])
  const [stemCounts, setStemCounts] = useState<Record<string, number>>({
    rosa_exportacion: 12,
    gypsophila_lluvia: 3,
    eucalipto_cinerea: 3
  })
  const [arrangementName, setArrangementName] = useState('Ramo Imperial 12 Rosas & Eucalipto')
  const [notice, setNotice] = useState('')

  const handleQtyChange = (stemId: string, delta: number) => {
    setStemCounts(prev => {
      const cur = prev[stemId] || 0
      const next = Math.max(0, cur + delta)
      return { ...prev, [stemId]: next }
    })
  }

  const stemList = Object.entries(stemCounts)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({
      stem: STANDARD_STEMS.find(s => s.id === id)!,
      quantity: qty
    }))

  const calculation = calculateArrangementPricing(selectedBase, stemList)

  const handleSendToPOS = () => {
    setNotice(`¡Arreglo "${arrangementName}" (${formatCurrency(calculation.totalSalePrice)}) cargado al POS con éxito!`)
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
          <span style={{ fontSize: '1.8rem' }}>🌸</span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Taller de Diseño & Costeo de Arreglos Florales
            </h1>
            <p style={{ margin: '3px 0 0', opacity: 0.9, fontSize: '0.84rem' }}>
              Constructor de ramos tallo por tallo con costeo de bases de lujo, follajes y mano de obra floral
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.3fr) minmax(300px, 0.7fr)', gap: 16 }}>
        {/* Left: Floral Studio Elements Selector */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Nombre del Arreglo / Diseño
            </label>
            <input
              type="text"
              value={arrangementName}
              onChange={e => setArrangementName(e.target.value)}
              className="input-neu"
              style={{ width: '100%', height: 40, fontSize: '0.95rem', fontWeight: 800 }}
            />
          </div>

          {/* Base / Jarrón Selector */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Base, Caja de Lujo o Florero
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {STANDARD_BASES.map(b => {
                const isSel = selectedBase.id === b.id
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBase(b)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: isSel ? '1.5px solid #00B19D' : '1px solid #E2E8F0',
                      background: isSel ? '#E6F7F5' : '#F8FAFC',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: isSel ? '#008F7E' : '#0F172A' }}>{b.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{formatCurrency(b.salePrice)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stems & Foliage Selector */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Selección de Flores & Follajes (Tallo por Tallo)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STANDARD_STEMS.map(stem => {
                const qty = stemCounts[stem.id] || 0
                return (
                  <div
                    key={stem.id}
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
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{stem.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        {formatCurrency(stem.salePricePerStem)} / tallo • Vida: ~{stem.vaseLifeDays} días
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(stem.id, -1)}
                        disabled={qty === 0}
                        className="btn-neu"
                        style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                      >
                        -
                      </button>
                      <span style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.88rem', color: '#0F172A' }}>{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(stem.id, 1)}
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

        {/* Right: Recipe Costing & Quotation Ticket */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderBottom: '1px dashed #CBD5E1', paddingBottom: 12 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#00B19D', textTransform: 'uppercase' }}>
              Costeo Floral en Vivo
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0' }}>
              Desglose de Materiales
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Tallos seleccionados:</span>
              <strong style={{ color: '#0F172A' }}>{calculation.totalStemsCount} flores/follajes</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Valor flores:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(calculation.stemsTotalRevenue)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Base ({selectedBase.name.split(' ')[0]}):</span>
              <span style={{ fontFamily: 'monospace' }}>+{formatCurrency(selectedBase.salePrice)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Mano de obra floral + Envolturas:</span>
              <span style={{ fontFamily: 'monospace' }}>+{formatCurrency(calculation.packagingAndLabor)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 6, color: '#64748B' }}>
              <span>Costo directo insumos:</span>
              <span style={{ fontFamily: 'monospace' }}>{formatCurrency(calculation.totalCost)}</span>
            </div>
          </div>

          {/* Total Price Card */}
          <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', textAlign: 'center', marginTop: 'auto' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Precio de Venta Sugerido
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00B19D', marginTop: 2 }}>
              {formatCurrency(calculation.totalSalePrice)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 800, marginTop: 2 }}>
              Utilidad Bruta: +{formatCurrency(calculation.grossProfit)} ({calculation.profitMarginPercent}%)
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
            <span>Facturar Arreglo en POS ({formatCurrency(calculation.totalSalePrice)})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
