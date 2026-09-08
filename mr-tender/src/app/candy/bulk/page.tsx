'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Scale, ArrowLeft, ShoppingCart, CheckCircle2 } from 'lucide-react'

const BULK_CANDIES = [
  { id: '1', name: 'Gomitas Ácidas Gusanitos Neon (100g)', pricePer100g: 2200 },
  { id: '2', name: 'Ositos de Goma Frutales Surtidos (100g)', pricePer100g: 2000 },
  { id: '3', name: 'Almendras Cubiertas de Chocolate (100g)', pricePer100g: 4500 },
  { id: '4', name: 'Maní Confitado Acaramelado (100g)', pricePer100g: 1800 },
  { id: '5', name: 'Caramelos Duros de Menta & Café (100g)', pricePer100g: 1500 },
  { id: '6', name: 'Chocolates Rellenos de Licor / Arequipe (100g)', pricePer100g: 4200 }
]

export default function CandyBulkPage() {
  const [items] = useState(BULK_CANDIES)
  const [grams, setGrams] = useState('250')
  const [notice, setNotice] = useState('')

  const gramsNum = parseFloat(grams) || 100

  const handleWeighAndSend = (item: any) => {
    const total = Math.round((gramsNum / 100) * item.pricePer100g)
    setNotice(`¡Pesaje: ${gramsNum}g de "${item.name}" (${formatCurrency(total)}) enviado al POS!`)
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
              Candy Bar & Dulces Por Peso por Peso
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Pesaje directo por gramos de gomitas, chocolates y frutos secos confitados
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', padding: '4px 12px', borderRadius: 10 }}>
          <Scale size={18} style={{ color: '#00B19D' }} />
          <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 800 }}>Gramos en Balanza:</span>
          <input
            type="number"
            step="50"
            value={grams}
            onChange={e => setGrams(e.target.value)}
            style={{ width: 60, height: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', border: '1px solid #CBD5E1', borderRadius: 6, color: '#0F172A' }}
          />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00B19D' }}>g</span>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {items.map(item => {
          const total = Math.round((gramsNum / 100) * item.pricePer100g)
          return (
            <div
              key={item.id}
              onClick={() => handleWeighAndSend(item)}
              className="neu-card"
              style={{ padding: '16px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{item.name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #F1F5F9', paddingTop: 6, marginTop: 'auto' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>{formatCurrency(item.pricePer100g)} / 100g</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(total)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
