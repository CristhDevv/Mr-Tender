'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Heart,
  Share2,
  Printer,
  ArrowLeft,
  Sparkles,
  CheckCircle2
} from 'lucide-react'

const TEMPLATES: Record<string, string[]> = {
  amor: [
    'Cada flor de este ramo representa una razón por la que te elijo cada día. Feliz aniversario, mi amor.',
    'No hay flores en el mundo suficientes para expresar lo mucho que te amo. Eres mi felicidad.',
    'Gracias por llenar mi vida de luz, alegría y color. Te amo infinitamente.'
  ],
  cumpleanos: [
    '¡Feliz cumpleaños! Que este nuevo año de vida esté lleno de flores, sonrisas y grandes bendiciones.',
    'Deseándote el día más especial y un año maravilloso repleto de salud y alegría. ¡Feliz día!',
    'Celebro tu vida y agradezco tenerte a mi lado. ¡Que disfrutes mucho este día tan especial!'
  ],
  condolencias: [
    'Nuestras más sentidas condolencias en este momento de profundo dolor. Los acompañamos de corazón.',
    'Que el amor y los hermosos recuerdos compartidos les brinden paz y consuelo en estos momentos.',
    'Con todo nuestro cariño y solidaridad para ti y tu familia. Que descanse en paz.'
  ]
}

export default function FloristCardsPage() {
  const [recipient, setRecipient] = useState('Valentina Restrepo')
  const [sender, setSender] = useState('Camilo Velasco')
  const [message, setMessage] = useState(TEMPLATES.amor[0])
  const [notice, setNotice] = useState('')

  const handlePrint = () => {
    window.print()
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
              Generador de Tarjetas & Dedicatorias
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Plantillas emotivas con impresión en tarjeta de regalo o envío digital
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
        {/* Editor */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Redactor de Tarjeta</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Para (Destinatario)</label>
              <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} className="input-neu" style={{ width: '100%', height: 38, fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>De (Remitente)</label>
              <input type="text" value={sender} onChange={e => setSender(e.target.value)} className="input-neu" style={{ width: '100%', height: 38, fontSize: '0.85rem' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Mensaje Personalizado</label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="input-neu"
              style={{ width: '100%', padding: '10px', fontSize: '0.82rem', resize: 'vertical' }}
            />
          </div>

          {/* Template buttons */}
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Plantillas Rápidas:</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <button onClick={() => setMessage(TEMPLATES.amor[0])} className="btn-neu" style={{ padding: '4px 8px', fontSize: '0.72rem' }}> Amor</button>
              <button onClick={() => setMessage(TEMPLATES.cumpleanos[0])} className="btn-neu" style={{ padding: '4px 8px', fontSize: '0.72rem' }}> Cumpleaños</button>
              <button onClick={() => setMessage(TEMPLATES.condolencias[0])} className="btn-neu" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>️ Condolencias</button>
            </div>
          </div>
        </div>

        {/* Card Preview */}
        <div style={{ background: '#FFFDF9', border: '2px dashed #E2E8F0', borderRadius: 14, padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 240, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Para: {recipient}
            </div>
            <p style={{ fontStyle: 'italic', fontSize: '1.05rem', color: '#1E293B', margin: '16px 0', lineHeight: 1.5, fontFamily: 'serif' }}>
              "{message}"
            </p>
          </div>
          <div style={{ textAlign: 'right', borderTop: '1px solid #F1F5F9', paddingTop: 10, fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>
            Con cariño: {sender}
          </div>
        </div>
      </div>
    </div>
  )
}
