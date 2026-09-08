'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Thermometer, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react'

const CANDY_LOTS = [
  { id: '1', name: 'Chocolatinas Jet & Coberturas', category: 'Chocolate', tempLimit: '22°C', currentTemp: '20.5°C', expirationDate: '2026-12-15', status: 'optimal' },
  { id: '2', name: 'Gomitas Grissly Ositos Gelatina', category: 'Gomita', tempLimit: '24°C', currentTemp: '21.0°C', expirationDate: '2026-10-30', status: 'optimal' },
  { id: '3', name: 'Masmelos Millows & Nubes', category: 'Masmelo', tempLimit: '23°C', currentTemp: '25.2°C', expirationDate: '2026-09-28', status: 'warning' }
]

export default function CandyExpirationPage() {
  const [lots] = useState(CANDY_LOTS)

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
              Semáforo de Vencimientos & Control Térmico
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Alertas de derretimiento para chocolates y rotación FEFO de confites
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lots.map(l => {
          const isWarning = l.status === 'warning'
          return (
            <div
              key={l.id}
              className="neu-card"
              style={{
                padding: '16px 20px',
                background: '#FFFFFF',
                border: isWarning ? '1.5px solid #714AD9' : '1px solid #E2E8F0',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{l.name}</h3>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: isWarning ? '#F0EDFC' : '#DCFCE7', color: isWarning ? '#5534B8' : '#15803D' }}>
                    {isWarning ? 'ALERTA CALOR' : 'ÓPTIMO'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
                  Categoría: {l.category} • Vencimiento: <strong>{l.expirationDate}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Temp. Actual</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: isWarning ? '#714AD9' : '#00B19D' }}>{l.currentTemp}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
