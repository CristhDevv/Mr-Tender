'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import {
  calculatePrintingJob,
  PrintingJobConfig,
  PrintColorMode,
  PaperSize,
  PaperStock,
  DuplexMode,
  BindingType,
  LaminationType
} from '@/lib/stationery/pricing-engine'
import {
  Printer,
  Copy,
  Layers,
  FileText,
  Sparkles,
  CheckCircle2,
  ShoppingCart,
  Percent,
  Scissors,
  Bookmark,
  Share2
} from 'lucide-react'

export default function StationeryPrintingPage() {
  const [config, setConfig] = useState<PrintingJobConfig>({
    pageCount: 24,
    copies: 1,
    colorMode: 'bw',
    paperSize: 'letter',
    paperStock: 'bond_75g',
    duplexMode: 'double_sided',
    binding: 'plastic_spiral',
    lamination: 'none',
    laminationUnits: 0,
    foldingAndStapling: false
  })

  const [customerName, setCustomerName] = useState('')
  const [addedToCartNotice, setAddedToCartNotice] = useState(false)

  const job = calculatePrintingJob(config)

  const handleSendToPOS = () => {
    setAddedToCartNotice(true)
    setTimeout(() => setAddedToCartNotice(false), 4000)
  }

  const applyPreset = (presetName: string) => {
    if (presetName === 'tesis') {
      setConfig({
        pageCount: 120,
        copies: 1,
        colorMode: 'bw',
        paperSize: 'letter',
        paperStock: 'bond_75g',
        duplexMode: 'double_sided',
        binding: 'plastic_spiral',
        lamination: 'none',
        laminationUnits: 0,
        foldingAndStapling: false
      })
    } else if (presetName === 'volante_color') {
      setConfig({
        pageCount: 1,
        copies: 100,
        colorMode: 'color',
        paperSize: 'half_letter',
        paperStock: 'propalcote_150g',
        duplexMode: 'single_sided',
        binding: 'none',
        lamination: 'none',
        laminationUnits: 0,
        foldingAndStapling: false
      })
    } else if (presetName === 'carne_laminado') {
      setConfig({
        pageCount: 1,
        copies: 1,
        colorMode: 'color',
        paperSize: 'letter',
        paperStock: 'opalina',
        duplexMode: 'single_sided',
        binding: 'none',
        lamination: 'carnet',
        laminationUnits: 1,
        foldingAndStapling: false
      })
    } else if (presetName === 'copias_simples') {
      setConfig({
        pageCount: 10,
        copies: 1,
        colorMode: 'bw',
        paperSize: 'letter',
        paperStock: 'bond_75g',
        duplexMode: 'single_sided',
        binding: 'none',
        lamination: 'none',
        laminationUnits: 0,
        foldingAndStapling: false
      })
    }
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
          <span style={{ fontSize: '1.8rem' }}></span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              Tarificador de Impresiones, Fotocopias & Anillados
            </h1>
            <p style={{ margin: '3px 0 0', opacity: 0.9, fontSize: '0.84rem' }}>
              Cotización instantánea con escala de volumen, sustratos especiales, espiral y laminación térmica
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          
          
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
          Plantillas Rápidas:
        </span>
        <button onClick={() => applyPreset('copias_simples')} className="btn-neu" style={{ padding: '6px 12px', fontSize: '0.76rem', background: '#FFFFFF' }}>
           Fotocopias Simples
        </button>
        <button onClick={() => applyPreset('tesis')} className="btn-neu" style={{ padding: '6px 12px', fontSize: '0.76rem', background: '#FFFFFF' }}>
           Tesis / Trabajo Anillado
        </button>
        <button onClick={() => applyPreset('volante_color')} className="btn-neu" style={{ padding: '6px 12px', fontSize: '0.76rem', background: '#FFFFFF' }}>
           100 Volantes Color Propalcote
        </button>
        <button onClick={() => applyPreset('carne_laminado')} className="btn-neu" style={{ padding: '6px 12px', fontSize: '0.76rem', background: '#FFFFFF' }}>
           Carné / Documento Plastificado
        </button>
      </div>

      {addedToCartNotice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>¡Trabajo de impresión ({formatCurrency(job.totalPrice)}) enviado al carrito del POS con éxito!</span>
        </div>
      )}

      {/* Main Grid Studio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 0.8fr)', gap: 16 }}>
        {/* Left: Job Configuration Controls */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Configuración del Trabajo de Impresión / Copiado
          </h3>

          {/* Color Mode & Duplex */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Modo de Color
              </label>
              <select
                value={config.colorMode}
                onChange={e => setConfig({ ...config, colorMode: e.target.value as PrintColorMode })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '0.82rem', fontWeight: 700 }}
              >
                <option value="bw"> Blanco y Negro (B/N)</option>
                <option value="color"> Color Estándar / Inyección / Láser</option>
                <option value="full_photo"> Fotográfico HD / Full Color</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Caras de Impresión
              </label>
              <select
                value={config.duplexMode}
                onChange={e => setConfig({ ...config, duplexMode: e.target.value as DuplexMode })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '0.82rem', fontWeight: 700 }}
              >
                <option value="double_sided"> Doble Cara (Doble Faz - Ahorro de papel)</option>
                <option value="single_sided"> Una Sola Cara (Simple Faz)</option>
              </select>
            </div>
          </div>

          {/* Page Count & Number of Copies */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Número de Páginas del Documento
              </label>
              <input
                type="number"
                min="1"
                value={config.pageCount}
                onChange={e => setConfig({ ...config, pageCount: Math.max(1, parseInt(e.target.value) || 1) })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '1rem', fontWeight: 800 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Juegos / Copias
              </label>
              <input
                type="number"
                min="1"
                value={config.copies}
                onChange={e => setConfig({ ...config, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '1rem', fontWeight: 800 }}
              />
            </div>
          </div>

          {/* Paper Size & Paper Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Tamaño del Papel
              </label>
              <select
                value={config.paperSize}
                onChange={e => setConfig({ ...config, paperSize: e.target.value as PaperSize })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '0.82rem' }}
              >
                <option value="letter">Carta (Letter - 21.5 x 27.9 cm)</option>
                <option value="legal">Oficio / Legal (21.5 x 33 cm)</option>
                <option value="half_letter">Media Carta (14 x 21.5 cm)</option>
                <option value="tabloid">Tabloide / Doble Carta (28 x 43 cm)</option>
                <option value="pliego">Pliego Completo (70 x 100 cm)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Tipo de Papel / Sustrato
              </label>
              <select
                value={config.paperStock}
                onChange={e => setConfig({ ...config, paperStock: e.target.value as PaperStock })}
                className="input-neu"
                style={{ width: '100%', height: 38, fontSize: '0.82rem' }}
              >
                <option value="bond_75g">Papel Bond 75g (Estándar)</option>
                <option value="bond_90g">Papel Bond 90g (Grueso)</option>
                <option value="propalcote_150g">Propalcote 150g Brillante</option>
                <option value="propalcote_240g">Propalcote 240g Cartulina</option>
                <option value="opalina">Cartulina Opalina Blanca</option>
                <option value="photographic">Papel Fotográfico Glossy</option>
                <option value="sticker">Papel Adhesivo / Sticker</option>
              </select>
            </div>
          </div>

          {/* Finishing: Spiral Binding & Lamination */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 10px' }}>
              Acabados & Encuadernación
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Anillado / Argollado
                </label>
                <select
                  value={config.binding}
                  onChange={e => setConfig({ ...config, binding: e.target.value as BindingType })}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.82rem' }}
                >
                  <option value="none">Sin anillar (Hojas sueltas)</option>
                  <option value="plastic_spiral"> Anillado Espiral Plástico + Tapas</option>
                  <option value="wire_o">️ Doble O / Metálico Ring Wire</option>
                  <option value="stapled"> Grapado de esquina / folleto</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Plastificado / Laminado Térmico
                </label>
                <select
                  value={config.lamination}
                  onChange={e => setConfig({ ...config, lamination: e.target.value as LaminationType, laminationUnits: e.target.value !== 'none' ? 1 : 0 })}
                  className="input-neu"
                  style={{ width: '100%', height: 38, fontSize: '0.82rem' }}
                >
                  <option value="none">Sin plastificar</option>
                  <option value="carnet"> Plastificado Carné / Cédula</option>
                  <option value="letter"> Laminado Carta Térmico</option>
                  <option value="legal"> Laminado Oficio Térmico</option>
                  <option value="tabloid">️ Laminado Tabloide / Póster</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Instant Breakdown Ticket & Quotation */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderBottom: '1px dashed #CBD5E1', paddingBottom: 12 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#00B19D', textTransform: 'uppercase' }}>
              Cotización en Tiempo Real
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0' }}>
              Resumen del Trabajo
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Total páginas impresas:</span>
              <strong style={{ color: '#0F172A' }}>{job.totalPagesToPrint} págs ({config.pageCount} x {config.copies} copias)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Hojas físicas de papel:</span>
              <strong style={{ color: '#0F172A' }}>{job.totalSheetsOfPaper} hojas ({config.duplexMode === 'double_sided' ? 'Doble Faz' : 'Simple Faz'})</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Tarifa por página:</span>
              <strong style={{ color: '#0F172A' }}>{formatCurrency(job.unitPricePerPage)} / pág</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Costo base de impresión:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(job.printingTotalCost)}</span>
            </div>

            {job.paperStockSurcharge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Recargo por papel especial:</span>
                <span style={{ fontFamily: 'monospace', color: '#475569' }}>+{formatCurrency(job.paperStockSurcharge)}</span>
              </div>
            )}

            {job.bindingCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Anillado ({job.bindingSpiralSizeMm} mm + Tapas):</span>
                <span style={{ fontFamily: 'monospace', color: '#475569' }}>+{formatCurrency(job.bindingCost)}</span>
              </div>
            )}

            {job.laminationCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Plastificado / Laminado:</span>
                <span style={{ fontFamily: 'monospace', color: '#475569' }}>+{formatCurrency(job.laminationCost)}</span>
              </div>
            )}

            {job.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
                <span>Descuento por volumen ({job.volumeDiscountPercent}%):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>-{formatCurrency(job.discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Grand Total Box */}
          <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', textAlign: 'center', marginTop: 'auto' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Total a Cobrar al Cliente
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00B19D', marginTop: 2 }}>
              {formatCurrency(job.totalPrice)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 800, marginTop: 2 }}>
              Rentabilidad estimada: ~{job.suggestedMarginPercent}%
            </div>
          </div>

          {/* Send to POS Button */}
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
            <span>Enviar al Carrito POS ({formatCurrency(job.totalPrice)})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
