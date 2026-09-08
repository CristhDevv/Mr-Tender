'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  BookOpen,
  CheckSquare,
  Square,
  ShoppingCart,
  Share2,
  ArrowLeft,
  Plus,
  Percent,
  CheckCircle2,
  Sparkles
} from 'lucide-react'

interface SchoolKitItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  included: boolean
}

interface SchoolList {
  id: string
  schoolName: string
  grade: string
  packageDiscountPercent: number
  items: SchoolKitItem[]
}

const DEFAULT_SCHOOL_LISTS: SchoolList[] = [
  {
    id: '1',
    schoolName: 'Colegio Mayor San Bartolomé',
    grade: 'Grado 3° Primaria',
    packageDiscountPercent: 8,
    items: [
      { id: '101', name: 'Cuaderno 100 hojas cosido cuadro grande (5 und)', quantity: 5, unitPrice: 4500, included: true },
      { id: '102', name: 'Caja de colores x 24 largos doble punta', quantity: 1, unitPrice: 18000, included: true },
      { id: '103', name: 'Pegastick / Pegamento en barra 40g', quantity: 2, unitPrice: 4200, included: true },
      { id: '104', name: 'Tijera punta roma escolar', quantity: 1, unitPrice: 3500, included: true },
      { id: '105', name: 'Cartuchera con cremallera doble', quantity: 1, unitPrice: 12000, included: true },
      { id: '106', name: 'Block papel silueta x 30 hojas', quantity: 1, unitPrice: 5500, included: true },
      { id: '107', name: 'Plastilina grande x 10 barras', quantity: 1, unitPrice: 7500, included: true },
      { id: '108', name: 'Lápices HB mirado #2 (Caja x 12)', quantity: 1, unitPrice: 14000, included: true },
      { id: '109', name: 'Borrador de nata + Sacapuntas con depósito', quantity: 2, unitPrice: 2000, included: true }
    ]
  },
  {
    id: '2',
    schoolName: 'Gimnasio del Norte',
    grade: 'Grado 8° Bachillerato',
    packageDiscountPercent: 10,
    items: [
      { id: '201', name: 'Cuaderno 100 hojas argollado universitario (6 und)', quantity: 6, unitPrice: 7500, included: true },
      { id: '202', name: 'Juego geométrico profesional con transportador', quantity: 1, unitPrice: 9500, included: true },
      { id: '203', name: 'Compás de precisión metálico', quantity: 1, unitPrice: 14000, included: true },
      { id: '204', name: 'Calculadora científica 240 funciones', quantity: 1, unitPrice: 42000, included: true },
      { id: '205', name: 'Bolígrafos gel negro/azul/rojo (Caja x 3)', quantity: 1, unitPrice: 8500, included: true },
      { id: '206', name: 'Corrector en cinta 5mm', quantity: 1, unitPrice: 4500, included: true },
      { id: '207', name: 'Resma papel bond 75g tamaño carta', quantity: 1, unitPrice: 18000, included: true }
    ]
  }
]

export default function StationerySchoolKitsPage() {
  const [lists, setLists] = useState<SchoolList[]>(DEFAULT_SCHOOL_LISTS)
  const [selectedList, setSelectedList] = useState<SchoolList>(DEFAULT_SCHOOL_LISTS[0])
  const [notice, setNotice] = useState('')

  const toggleItem = (itemId: string) => {
    const updatedItems = selectedList.items.map(it => it.id === itemId ? { ...it, included: !it.included } : it)
    setSelectedList({ ...selectedList, items: updatedItems })
  }

  const includedItems = selectedList.items.filter(it => it.included)
  const subtotal = includedItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0)
  const allIncluded = includedItems.length === selectedList.items.length
  const discountAmount = allIncluded ? Math.round((subtotal * selectedList.packageDiscountPercent) / 100) : 0
  const total = subtotal - discountAmount

  const handleShareWhatsApp = () => {
    const text = `Cotización Lista Escolar ${selectedList.schoolName} (${selectedList.grade}): Total ${formatCurrency(total)} (${includedItems.length} artículos)`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Header */}
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
              Listas Escolares & Kits por Colegio
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Armado de paquetes escolares con descuento global y cotización instantánea por WhatsApp
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Para cargar una nueva lista escolar, ingresa el nombre del colegio y pega los ítems.')}
          className="btn-neu"
          style={{ background: '#fff', color: '#008F7E', border: 'none', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800 }}
        >
          <Plus size={15} />
          <span>Nueva Lista Escolar</span>
        </button>
      </div>

      {notice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(400px, 2fr)', gap: 16 }}>
        {/* Left: Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
            Listas Registradas ({lists.length})
          </span>
          {lists.map(l => {
            const isSel = selectedList.id === l.id
            return (
              <div
                key={l.id}
                onClick={() => setSelectedList(l)}
                className="neu-card"
                style={{
                  padding: '14px 16px',
                  background: isSel ? '#E6F7F5' : '#FFFFFF',
                  border: isSel ? '1.5px solid #00B19D' : '1px solid #E2E8F0',
                  borderRadius: 12,
                  cursor: 'pointer'
                }}
              >
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{l.schoolName}</h4>
                <div style={{ fontSize: '0.74rem', color: '#00B19D', fontWeight: 700, marginTop: 2 }}>{l.grade}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 6, marginTop: 8, fontSize: '0.72rem', color: '#64748B' }}>
                  <span>{l.items.length} artículos</span>
                  <span style={{ color: '#15803D', fontWeight: 800 }}>-{l.packageDiscountPercent}% por paquete</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Items Inspector & Quotation */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {selectedList.schoolName}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{selectedList.grade}</span>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="btn-neu"
              style={{ padding: '6px 12px', fontSize: '0.76rem', color: '#15803D', border: '1px solid #BBF7D0', background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Share2 size={14} />
              <span>Compartir WhatsApp</span>
            </button>
          </div>

          {/* Items Checklist Table */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ width: 40, padding: '8px 12px', textAlign: 'center' }}></th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748B' }}>Artículo / Útil Escolar</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748B' }}>Cant.</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748B' }}>Precio Unit.</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748B' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedList.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', background: item.included ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={() => toggleItem(item.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: item.included ? 700 : 400, color: item.included ? '#0F172A' : '#94A3B8', textDecoration: item.included ? 'none' : 'line-through' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#64748B' }}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: item.included ? '#0F172A' : '#94A3B8' }}>
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Box */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#64748B' }}>Subtotal ({includedItems.length} artículos seleccionados):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#15803D' }}>
                <span>Descuento Paquete Completo ({selectedList.packageDiscountPercent}%):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900, color: '#00B19D', borderTop: '1px solid #E2E8F0', paddingTop: 8, marginTop: 4 }}>
              <span>Total Lista:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => { setNotice(`¡Lista escolar "${selectedList.schoolName}" (${formatCurrency(total)}) cargada al POS!`); setTimeout(() => setNotice(''), 5000) }}
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
              gap: 8
            }}
          >
            <ShoppingCart size={16} />
            <span>Facturar Lista Escolar en POS ({formatCurrency(total)})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
