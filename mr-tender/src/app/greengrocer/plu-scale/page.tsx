'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { STANDARD_PRODUCE_CATALOG, ProduceItem } from '@/lib/greengrocer/shrinkage-engine'
import { Scale, ArrowLeft, Search, ShoppingCart, CheckCircle2 } from 'lucide-react'

export default function GreengrocerPluScalePage() {
  const [items] = useState<ProduceItem[]>(STANDARD_PRODUCE_CATALOG)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWeightKg, setSelectedWeightKg] = useState('1.5')
  const [notice, setNotice] = useState('')

  const filtered = items.filter(it =>
    it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    it.pluCode.includes(searchTerm)
  )

  const handleWeighAndSend = (item: ProduceItem) => {
    const w = parseFloat(selectedWeightKg) || 1
    const total = Math.round(w * item.salePriceGrade1PerKg)
    setNotice(`¡Pesaje: ${w} kg de ${item.name} (${formatCurrency(total)}) enviado al POS!`)
    setTimeout(() => setNotice(''), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Balanza Rápida & Códigos PLU Visuales
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Teclas directas de pesaje para cajas de alta velocidad
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', padding: '4px 12px', borderRadius: 10 }}>
          <Scale size={18} style={{ color: '#00B19D' }} />
          <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 800 }}>Simular Peso Balanza:</span>
          <input
            type="number"
            step="0.1"
            value={selectedWeightKg}
            onChange={e => setSelectedWeightKg(e.target.value)}
            style={{ width: 60, height: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', border: '1px solid #CBD5E1', borderRadius: 6, color: '#0F172A' }}
          />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00B19D' }}>Kg</span>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* Search Filter */}
      <div style={{ maxWidth: 400 }}>
        <input
          type="text"
          placeholder="Buscar fruta o verdura por nombre o PLU (ej: 4011)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input-neu"
          style={{ width: '100%', height: 40, fontSize: '0.85rem' }}
        />
      </div>

      {/* Visual Produce Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {filtered.map(item => {
          const w = parseFloat(selectedWeightKg) || 1
          const itemTotal = Math.round(w * item.salePriceGrade1PerKg)
          return (
            <div
              key={item.id}
              onClick={() => handleWeighAndSend(item)}
              className="neu-card"
              style={{
                padding: '16px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#00B19D', background: '#E6F7F5', padding: '2px 6px', borderRadius: 4 }}>
                  PLU {item.pluCode}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  {item.category}
                </span>
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', minHeight: 38 }}>
                {item.name}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #F1F5F9', paddingTop: 6, marginTop: 'auto' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>{formatCurrency(item.salePriceGrade1PerKg)} / kg</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(itemTotal)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
