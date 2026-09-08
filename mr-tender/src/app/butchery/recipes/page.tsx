'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Scale,
  Percent,
  Play,
  ArrowLeft,
  X
} from 'lucide-react'

interface CharcuterieRecipe {
  id: string
  name: string
  category: 'embutido_fresco' | 'ahumado' | 'cocido' | 'curado'
  meatBase: string
  batchWeightKg: number
  casingType: string // Tripa de cerdo / colágeno / fibra
  smokingShrinkPercent: number // Merma por ahumado/cocción
  costPerBatch: number
  costPerKg: number
  suggestedSalePricePerKg: number
  ingredients: Array<{ name: string; quantity: string; cost: number }>
  instructions: string
}

const DEFAULT_RECIPES: CharcuterieRecipe[] = [
  {
    id: 'chorizo_santarrosano',
    name: 'Chorizo Santarrosano Tradicional',
    category: 'embutido_fresco',
    meatBase: 'Pierna de Cerdo + Tocino Dorsal (80/20)',
    batchWeightKg: 10,
    casingType: 'Tripa natural de cerdo calibre 28/30',
    smokingShrinkPercent: 8,
    costPerBatch: 142000,
    costPerKg: 14200,
    suggestedSalePricePerKg: 24000,
    ingredients: [
      { name: 'Carne magra de cerdo picada a cuchillo', quantity: '8.0 kg', cost: 104000 },
      { name: 'Grasa dorsal (tocino duro)', quantity: '2.0 kg', cost: 16000 },
      { name: 'Cebolla larga finamente picada', quantity: '800 g', cost: 4000 },
      { name: 'Ajo fresco triturado', quantity: '120 g', cost: 2000 },
      { name: 'Sal marina', quantity: '180 g', cost: 500 },
      { name: 'Comino, cilantro molido y pimienta', quantity: '90 g', cost: 3500 },
      { name: 'Cerveza rubia / Vino blanco', quantity: '500 ml', cost: 4000 },
      { name: 'Tripa natural de cerdo', quantity: '14 metros', cost: 8000 }
    ],
    instructions: 'Picar la carne y tocino en dados de 1x1 cm. Mezclar con adobos y dejar reposar 12h en frío (2°C). Embutir sin burbujas de aire y amarrar cada 10 cm con hilo de algodón.'
  },
  {
    id: 'morcilla_antioquena',
    name: 'Morcilla / Rellena Antioqueña',
    category: 'cocido',
    meatBase: 'Sangre de Cerdo + Arroz + Empella',
    batchWeightKg: 15,
    casingType: 'Tripa gruesa de res o cerdo',
    smokingShrinkPercent: 5,
    costPerBatch: 125000,
    costPerKg: 8333,
    suggestedSalePricePerKg: 16000,
    ingredients: [
      { name: 'Sangre fresca de cerdo pasteurizada', quantity: '4.0 L', cost: 20000 },
      { name: 'Arroz cocido al dente', quantity: '6.0 kg', cost: 24000 },
      { name: 'Empella / Tocino picado', quantity: '2.5 kg', cost: 20000 },
      { name: 'Cebolla junca picada', quantity: '2.0 kg', cost: 10000 },
      { name: 'Poleo, yerbabuena y orégano fresco', quantity: '400 g', cost: 6000 },
      { name: 'Arveja cocida y sal de cura', quantity: '1.0 kg', cost: 8000 },
      { name: 'Tripa de res / cerdo para rellena', quantity: '18 metros', cost: 12000 }
    ],
    instructions: 'Rehogar la cebolla con las hierbas y el tocino. Mezclar con el arroz y la sangre fría sazonada. Embutir holgado (arroz expande) y cocer a fuego lento (80°C) durante 45 minutos.'
  },
  {
    id: 'tocineta_ahumada',
    name: 'Tocineta Ahumada Artesanal en Maderas Nobles',
    category: 'ahumado',
    meatBase: 'Panceta de Cerdo Seleccionada',
    batchWeightKg: 12,
    casingType: 'Sin tripa (corte directo)',
    smokingShrinkPercent: 18,
    costPerBatch: 210000,
    costPerKg: 17500,
    suggestedSalePricePerKg: 32000,
    ingredients: [
      { name: 'Panceta de cerdo con piel y carne marmoleada', quantity: '12.0 kg', cost: 180000 },
      { name: 'Sal marina y azúcar morena / Panela', quantity: '600 g', cost: 3000 },
      { name: 'Sal de cura #1 (Praga)', quantity: '30 g', cost: 2000 },
      { name: 'Pimienta negra, laurel y nuez moscada', quantity: '100 g', cost: 5000 },
      { name: 'Virutas de madera de manzano/guayabo', quantity: '2.0 kg', cost: 20000 }
    ],
    instructions: 'Frotar la panceta con el curado seco. Envasar al vacío 7 días a 2°C rotando diario. Enjuagar, secar 24h para formar película y ahumar a 75°C hasta temperatura interna de 65°C.'
  }
]

export default function ButcheryRecipesPage() {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<CharcuterieRecipe[]>(DEFAULT_RECIPES)
  const [selectedRecipe, setSelectedRecipe] = useState<CharcuterieRecipe>(DEFAULT_RECIPES[0])
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1)
  const [showNewModal, setShowNewModal] = useState(false)
  const [successNotice, setSuccessNotice] = useState('')

  const currentBatchKg = selectedRecipe.batchWeightKg * batchMultiplier
  const currentShrinkKg = (currentBatchKg * selectedRecipe.smokingShrinkPercent) / 100
  const currentFinalKg = currentBatchKg - currentShrinkKg
  const currentTotalCost = selectedRecipe.costPerBatch * batchMultiplier
  const currentRevenue = currentFinalKg * selectedRecipe.suggestedSalePricePerKg
  const currentProfit = currentRevenue - currentTotalCost
  const currentMargin = currentRevenue > 0 ? Math.round((currentProfit / currentRevenue) * 100) : 0

  const handleProduceBatch = () => {
    setSuccessNotice(`¡Orden de producción de ${currentBatchKg} kg de "${selectedRecipe.name}" procesada! Se generarán ${Math.round(currentFinalKg * 10) / 10} kg de producto terminado.`)
    setTimeout(() => setSuccessNotice(''), 6000)
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
              Salsamentaria, Embutidos & Fórmulas Cárnicas
            </h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '0.8rem' }}>
              Formulación artesanal de chorizos, morcillas, tocinetas y costeo de mermas por cocción/ahumado
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => alert('Para agregar una nueva fórmula personalizada, completa los ingredientes en el formulario.')}
            className="btn-neu"
            style={{ background: '#fff', color: '#008F7E', border: 'none', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800 }}
          >
            <Plus size={15} />
            <span>Nueva Fórmula</span>
          </button>
        </div>
      </div>

      {successNotice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: 16 }}>
        {/* Left: Recipe List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Fórmulas Disponibles ({recipes.length})
          </span>
          {recipes.map(r => {
            const isSelected = selectedRecipe.id === r.id
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRecipe(r)}
                className="neu-card"
                style={{
                  padding: '14px 16px',
                  background: isSelected ? '#E6F7F5' : '#FFFFFF',
                  border: isSelected ? '1.5px solid #00B19D' : '1px solid #E2E8F0',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{r.name}</h4>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#FFFFFF', color: '#008F7E', border: '1px solid #99F6E4' }}>
                    {r.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
                  Base: {r.meatBase}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 6, marginTop: 8, fontSize: '0.74rem' }}>
                  <span style={{ color: '#64748B' }}>Lote Base: <strong>{r.batchWeightKg} kg</strong></span>
                  <span style={{ color: '#00B19D', fontWeight: 800 }}>{formatCurrency(r.costPerKg)} / kg</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Recipe Inspector & Batch Production Simulator */}
        <div className="neu-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {selectedRecipe.name}
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Tripa recomendada: <strong>{selectedRecipe.casingType}</strong>
              </span>
            </div>

            {/* Batch Scale Multiplier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Multiplicador Lote:</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0.5, 1, 2, 5].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBatchMultiplier(m)}
                    className="btn-neu"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: batchMultiplier === m ? 800 : 600,
                      background: batchMultiplier === m ? '#00B19D' : '#F8FAFC',
                      color: batchMultiplier === m ? '#fff' : '#64748B',
                      border: 'none',
                      borderRadius: 6
                    }}
                  >
                    {m}x ({selectedRecipe.batchWeightKg * m} kg)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Pasta Cárnica Cruda</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>{currentBatchKg} kg</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Merma Ahumado (-{selectedRecipe.smokingShrinkPercent}%)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#DC2626' }}>-{Math.round(currentShrinkKg * 10) / 10} kg</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Producto Terminado</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#00B19D' }}>{Math.round(currentFinalKg * 10) / 10} kg</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Utilidad Estimada</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10B981' }}>+{currentMargin}%</div>
            </div>
          </div>

          {/* Ingredients Table */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
              Lista de Ingredientes & Aditivos (Escalado {batchMultiplier}x)
            </h4>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748B' }}>Ingrediente / Insumo</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748B' }}>Cantidad Requerida</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748B' }}>Costo Proporcional</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: '#0F172A' }}>{ing.name}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#00B19D' }}>
                        {ing.quantity}
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                        {formatCurrency(ing.cost * batchMultiplier)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td style={{ padding: '8px 12px', color: '#0F172A' }}>TOTAL COSTO MATERIA PRIMA</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0F172A' }}>{currentBatchKg} kg</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#00B19D', fontFamily: 'monospace' }}>{formatCurrency(currentTotalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: 10 }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Procedimiento de Elaboración & Reposo
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#334155', margin: 0, lineHeight: 1.4 }}>
              {selectedRecipe.instructions}
            </p>
          </div>

          {/* Production Action Button */}
          <button
            type="button"
            onClick={handleProduceBatch}
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
            <Play size={16} />
            <span>Iniciar Lote de Producción ({currentBatchKg} kg de pasta)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
