'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingBag,
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Plus
} from 'lucide-react'

interface FarmBundle {
  id: string
  name: string
  theme: string
  price: number
  items: Array<{ name: string; weight: string }>
}

const DEFAULT_BUNDLES: FarmBundle[] = [
  {
    id: '1',
    name: 'Canasta Familiar Semanal',
    theme: 'Mercado Completo para Hogar',
    price: 38000,
    items: [
      { name: 'Papa Pastusa', weight: '3.0 kg' },
      { name: 'Plátano Hartón', weight: '2.0 kg' },
      { name: 'Tomate Chonto', weight: '1.5 kg' },
      { name: 'Cebolla Cabezona', weight: '1.0 kg' },
      { name: 'Zanahoria', weight: '1.0 kg' },
      { name: 'Aguacate Hass', weight: '3 unidades' },
      { name: 'Limón Tahití', weight: '1.0 kg' },
      { name: 'Cilantro fresco', weight: '1 atado' }
    ]
  },
  {
    id: '2',
    name: 'Combo Detox & Jugos Verdes',
    theme: 'Fitness & Salud',
    price: 24000,
    items: [
      { name: 'Apio España', weight: '1 planta grande' },
      { name: 'Espinaca Bogotana', weight: '500 g' },
      { name: 'Pepino Cohombro', weight: '1.5 kg' },
      { name: 'Manzana Verde', weight: '1.0 kg' },
      { name: 'Jengibre Fresco', weight: '200 g' },
      { name: 'Limón Mandarina', weight: '1.0 kg' }
    ]
  },
  {
    id: '3',
    name: 'Canasta Sopera Criolla',
    theme: 'Sancochos & Sopas',
    price: 19500,
    items: [
      { name: 'Papa Criolla Amarilla', weight: '1.5 kg' },
      { name: 'Yuca Llanera Parafina', weight: '1.5 kg' },
      { name: 'Mazorca Tierna', weight: '3 unidades' },
      { name: 'Plátano Verde', weight: '1.0 kg' },
      { name: 'Cebolla Larga y Guasca', weight: '1 atado' }
    ]
  }
]

export default function GreengrocerBundlesPage() {
  const [bundles] = useState<FarmBundle[]>(DEFAULT_BUNDLES)
  const [notice, setNotice] = useState('')

  const handleSendToPOS = (b: FarmBundle) => {
    setNotice(`¡Canasta "${b.name}" (${formatCurrency(b.price)}) agregada a la orden de venta POS!`)
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
              Canastas de Mercado & Combos de Verdulería
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Paquetes prediseñados para venta rápida y descarga masiva de inventario a granel
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {bundles.map(b => (
          <div
            key={b.id}
            className="neu-card"
            style={{ padding: '20px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{b.name}</h3>
                <span style={{ fontSize: '0.72rem', color: '#00B19D', fontWeight: 700 }}>{b.theme}</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00B19D' }}>{formatCurrency(b.price)}</span>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {b.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569' }}>
                  <span>• {it.name}</span>
                  <strong style={{ color: '#0F172A' }}>{it.weight}</strong>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSendToPOS(b)}
              style={{
                marginTop: 'auto',
                padding: '10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #00B19D 0%, #008F7E 100%)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <ShoppingCart size={15} />
              <span>Vender Canasta en POS</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
