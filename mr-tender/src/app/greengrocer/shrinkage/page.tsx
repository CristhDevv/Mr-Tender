'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  STANDARD_PRODUCE_CATALOG,
  ProduceItem,
  calculateDailyProduceShrinkage
} from '@/lib/greengrocer/shrinkage-engine'
import {
  Scale,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Plus,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Layers,
  ShoppingBag
} from 'lucide-react'

export default function GreengrocerShrinkagePage() {
  const [catalog] = useState<ProduceItem[]>(STANDARD_PRODUCE_CATALOG)
  const [selectedProduce, setSelectedProduce] = useState<ProduceItem>(STANDARD_PRODUCE_CATALOG[1]) // Tomate
  const [initialStock, setInitialStock] = useState('80')
  const [soldQty, setSoldQty] = useState('68')
  const [wasteQty, setWasteQty] = useState('4') // Desperdicio
  const [grade2Qty, setGrade2Qty] = useState('8') // Reclasificado
  const [notice, setNotice] = useState('')

  const initialNum = parseFloat(initialStock) || 0
  const soldNum = parseFloat(soldQty) || 0
  const wasteNum = parseFloat(wasteQty) || 0
  const grade2Num = parseFloat(grade2Qty) || 0

  const log = calculateDailyProduceShrinkage(
    selectedProduce,
    initialNum,
    soldNum,
    wasteNum,
    grade2Num
  )

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault()
    setNotice(`¡Control de merma para "${selectedProduce.name}" registrado! Se salvaron ${formatCurrency(log.salvagedRevenue)} en producto de 2da/pulpas.`)
    setTimeout(() => setNotice(''), 5000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Banner */}
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
          <span style={{ fontSize: '1.8rem' }}>🥦</span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Control de Merma & Clasificación de Perecederos
            </h1>
            <p style={{ margin: '3px 0 0', opacity: 0.9, fontSize: '0.84rem' }}>
              Registro diario de deshidratación, maduración y reetiquetado a 2da calidad / pulpas
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: 16 }}>
        {/* Left: Produce List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
            Perecederos a Monitorear ({catalog.length})
          </span>
          {catalog.map(prod => {
            const isSel = selectedProduce.id === prod.id
            return (
              <div
                key={prod.id}
                onClick={() => setSelectedProduce(prod)}
                className="neu-card"
                style={{
                  padding: '12px 16px',
                  background: isSel ? '#E6F7F5' : '#FFFFFF',
                  border: isSel ? '1.5px solid #00B19D' : '1px solid #E2E8F0',
                  borderRadius: 12,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{prod.name}</h4>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#008F7E', background: '#FFFFFF', padding: '2px 6px', borderRadius: 6, border: '1px solid #99F6E4' }}>
                    PLU: {prod.pluCode}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 6, marginTop: 6, fontSize: '0.74rem' }}>
                  <span style={{ color: '#64748B' }}>1ra: <strong>{formatCurrency(prod.salePriceGrade1PerKg)}/kg</strong></span>
                  <span style={{ color: '#714AD9', fontWeight: 700 }}>2da: {formatCurrency(prod.salePriceGrade2PerKg)}/kg</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Daily Shrinkage Logging & Impact Analyzer */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {selectedProduce.name}
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Costo de compra en Corabastos/Mayorista: <strong>{formatCurrency(selectedProduce.purchaseCostPerKg)} / kg</strong>
              </span>
            </div>

            <div style={{ background: '#F8FAFC', padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', textAlign: 'right' }}>
              <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 800 }}>Tolerancia Biológica</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00B19D' }}>~{selectedProduce.expectedDailyShrinkPercent}% diario</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveLog} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Stock Inicial (Kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={initialStock}
                  onChange={e => setInitialStock(e.target.value)}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.95rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Venta 1ra Calidad (Kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={soldQty}
                  onChange={e => setSoldQty(e.target.value)}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.95rem', fontWeight: 800, color: '#008F7E' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Desperdicio / Podrido (Kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={wasteQty}
                  onChange={e => setWasteQty(e.target.value)}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.95rem', fontWeight: 800, color: '#DC2626' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#714AD9', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Reclasificado 2da (Kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={grade2Qty}
                  onChange={e => setGrade2Qty(e.target.value)}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.95rem', fontWeight: 800, color: '#714AD9' }}
                  required
                />
              </div>
            </div>

            {/* Financial Impact Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '12px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>
                  Pérdida por Desperdicio
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#DC2626', marginTop: 2 }}>
                  -{formatCurrency(log.wasteCostLoss)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#B91C1C', marginTop: 2 }}>
                  {wasteNum} kg arrojados
                </div>
              </div>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                  Valor Rescatado (2da Calidad)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#714AD9', marginTop: 2 }}>
                  +{formatCurrency(log.salvagedRevenue)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 2 }}>
                  {grade2Num} kg para guiso/pulpa
                </div>
              </div>

              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
                  Margen Bruto Efectivo
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10B981', marginTop: 2 }}>
                  {log.effectiveMarginPercent}%
                </div>
                <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: 2 }}>
                  Merma neta: {log.recordedShrinkPercent}%
                </div>
              </div>
            </div>

            <button
              type="submit"
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
                marginTop: 6
              }}
            >
              <RefreshCw size={16} />
              <span>Registrar Cierre de Perecedero & Actualizar Stock</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
