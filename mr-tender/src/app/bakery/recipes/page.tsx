'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Croissant,
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Flame,
  ChefHat,
  X
} from 'lucide-react'

interface BakeryRecipe {
  id: string
  tenant_id: string
  name: string
  category: string
  yield_quantity: number
  yield_unit: string
  baking_temp_celsius: number
  baking_time_minutes: number
  cost_per_batch: number
  cost_per_unit: number
  suggested_sale_price: number
  ingredients: Array<{ ingredient: string; quantity: string; cost: number }>
  instructions?: string | null
  created_at: string
}

export default function BakeryRecipesPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<BakeryRecipe[]>([])
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [recipeForm, setRecipeForm] = useState({
    name: 'Pan Francés Tradicional',
    category: 'Panadería Salada',
    yield_quantity: 30,
    yield_unit: 'unidades',
    baking_temp_celsius: 210,
    baking_time_minutes: 25,
    suggested_sale_price: 1500,
    instructions: 'Amasar hasta punto de liga. Fermentar 90 min en cámara. Hornear con vapor a 210°C.',
    ingredients: [
      { ingredient: 'Harina de Trigo Especial', quantity: '2000 g', cost: 6500 },
      { ingredient: 'Agua purificada', quantity: '1200 ml', cost: 300 },
      { ingredient: 'Levadura fresca', quantity: '40 g', cost: 1200 },
      { ingredient: 'Sal marina', quantity: '35 g', cost: 200 },
      { ingredient: 'Mejorador de masa', quantity: '20 g', cost: 800 }
    ]
  })

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('bakery_recipes')
        .select('*')
        .eq('tenant_id', tid)
        .order('name', { ascending: true })

      if (error) throw error
      setRecipes(data || [])
    } catch (err) {
      console.error('Error loading bakery recipes:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleAddIngredient() {
    setRecipeForm({
      ...recipeForm,
      ingredients: [...recipeForm.ingredients, { ingredient: '', quantity: '100 g', cost: 0 }]
    })
  }

  function handleRemoveIngredient(index: number) {
    const updated = recipeForm.ingredients.filter((_, i) => i !== index)
    setRecipeForm({ ...recipeForm, ingredients: updated })
  }

  function handleUpdateIngredient(index: number, field: string, value: any) {
    const updated = [...recipeForm.ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setRecipeForm({ ...recipeForm, ingredients: updated })
  }

  async function handleCreateRecipe(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const batchCost = recipeForm.ingredients.reduce((acc, it) => acc + Number(it.cost || 0), 0)
      const unitCost = recipeForm.yield_quantity > 0 ? batchCost / Number(recipeForm.yield_quantity) : 0

      const payload = {
        tenant_id: tenantId,
        name: recipeForm.name,
        category: recipeForm.category,
        yield_quantity: Number(recipeForm.yield_quantity),
        yield_unit: recipeForm.yield_unit,
        baking_temp_celsius: Number(recipeForm.baking_temp_celsius),
        baking_time_minutes: Number(recipeForm.baking_time_minutes),
        cost_per_batch: batchCost,
        cost_per_unit: unitCost,
        suggested_sale_price: Number(recipeForm.suggested_sale_price),
        ingredients: recipeForm.ingredients,
        instructions: recipeForm.instructions || null
      }

      const { error } = await supabase.from('bakery_recipes').insert(payload)
      if (error) throw error
      setShowRecipeModal(false)
      await loadRecipes()
    } catch (err: any) {
      alert(err.message || 'Error al guardar receta de panadería')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoRecipes() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          name: 'Pan Francés / Baguette Tradicional',
          category: 'Panadería Salada',
          yield_quantity: 30,
          yield_unit: 'unidades',
          baking_temp_celsius: 210,
          baking_time_minutes: 25,
          cost_per_batch: 9000,
          cost_per_unit: 300,
          suggested_sale_price: 1200,
          ingredients: [
            { ingredient: 'Harina de Trigo Panificable', quantity: '2000 g', cost: 6500 },
            { ingredient: 'Levadura fresca', quantity: '40 g', cost: 1200 },
            { ingredient: 'Sal y Mejorador', quantity: '50 g', cost: 1300 }
          ],
          instructions: 'Fermentación en bloque 1 hora. Formar baguettes y hornear con inyección de vapor.'
        },
        {
          tenant_id: tenantId,
          name: 'Croissant Hojaldrado de Mantequilla',
          category: 'Pastelería / Hojaldres',
          yield_quantity: 20,
          yield_unit: 'unidades',
          baking_temp_celsius: 190,
          baking_time_minutes: 18,
          cost_per_batch: 24000,
          cost_per_unit: 1200,
          suggested_sale_price: 4500,
          ingredients: [
            { ingredient: 'Harina de Fuerza', quantity: '1000 g', cost: 4500 },
            { ingredient: 'Mantequilla Premium para Empaste', quantity: '600 g', cost: 16000 },
            { ingredient: 'Azúcar y Leche', quantity: 'Porción', cost: 3500 }
          ],
          instructions: 'Laminado francés 3 vueltas simples con descansos en frío de 30 min. Hornear a 190°C.'
        }
      ]
      await supabase.from('bakery_recipes').insert(demo)
      await loadRecipes()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumbs & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Catálogo & Inventario</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Fichas de Panadería</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Croissant size={24} style={{ color: 'var(--accent-amber)' }} />
            Recetas & Costos de Panadería
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Cálculo de costos por ingredientes, costo por tanda y rendimiento de horneada.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          
          
          <button
            onClick={() => setShowRecipeModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Receta</span>
          </button>
        </div>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay recetas registradas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Estandariza tus recetas para garantizar siempre la misma calidad y controlar tus costos de ingredientes.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoRecipes} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Cargar Recetas Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {recipes.map(rec => {
            const margin = rec.suggested_sale_price > 0 ? ((rec.suggested_sale_price - rec.cost_per_unit) / rec.suggested_sale_price) * 100 : 0
            const ings = Array.isArray(rec.ingredients) ? rec.ingredients : []

            return (
              <div key={rec.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{rec.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{rec.category} • Rinde: {rec.yield_quantity} {rec.yield_unit}</div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: margin >= 60 ? 'var(--accent-green-lt)' : 'var(--accent-amber-lt)',
                    color: margin >= 60 ? 'var(--accent-green)' : 'var(--accent-amber)'
                  }}>
                    {margin.toFixed(0)}% Margen
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-deep)', padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Costo por Unidad</div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-coral)' }}>{formatCurrency(rec.cost_per_unit)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Precio Venta Sugerido</div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(rec.suggested_sale_price)}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Ingredientes por Tanda:</div>
                  {ings.slice(0, 3).map((it: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>• {it.ingredient} ({it.quantity})</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(it.cost)}</span>
                    </div>
                  ))}
                  {ings.length > 3 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>+ {ings.length - 3} ingredientes más...</div>}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <strong>Horno:</strong> {rec.baking_temp_celsius}°C por {rec.baking_time_minutes} min
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Crear Receta */}
      {showRecipeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
          <div className="neu-card animate-scale-in" style={{ maxWidth: 580, width: '100%', maxHeight: 'calc(100dvh - 24px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, borderRadius: 16 }}>
            {/* Fixed Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>Nueva Receta de Panadería</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748B' }}>Registra la ficha técnica con ingredientes y costos</p>
              </div>
              <button onClick={() => setShowRecipeModal(false)} className="btn-neu btn-ghost" style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateRecipe} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Pan / Postre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pan de Bono, Croissant..."
                      value={recipeForm.name}
                      onChange={e => setRecipeForm({ ...recipeForm, name: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Categoría</label>
                    <input
                      type="text"
                      placeholder="Panadería Salada, Dulce..."
                      value={recipeForm.category}
                      onChange={e => setRecipeForm({ ...recipeForm, category: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Rendimiento</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={recipeForm.yield_quantity}
                      onChange={e => setRecipeForm({ ...recipeForm, yield_quantity: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Temp Horno (°C)</label>
                    <input
                      type="number"
                      value={recipeForm.baking_temp_celsius}
                      onChange={e => setRecipeForm({ ...recipeForm, baking_temp_celsius: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio Venta</label>
                    <input
                      type="number"
                      value={recipeForm.suggested_sale_price}
                      onChange={e => setRecipeForm({ ...recipeForm, suggested_sale_price: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                {/* Ingredients List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Ingredientes de la Tanda</label>
                    <button type="button" onClick={handleAddIngredient} className="btn-neu" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                      + Ingrediente
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recipeForm.ingredients.map((it, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Ingrediente (ej. Harina)"
                          value={it.ingredient}
                          onChange={e => handleUpdateIngredient(idx, 'ingredient', e.target.value)}
                          className="input-neu"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Gramaje (ej. 1000g)"
                          value={it.quantity}
                          onChange={e => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                          className="input-neu"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        />
                        <input
                          type="number"
                          placeholder="Costo"
                          value={it.cost}
                          onChange={e => handleUpdateIngredient(idx, 'cost', Number(e.target.value))}
                          className="input-neu"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="btn-neu btn-ghost"
                          style={{ padding: 6, color: 'var(--accent-coral)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Instrucciones de Amasado y Fermentación</label>
                  <textarea
                    rows={2}
                    value={recipeForm.instructions}
                    onChange={e => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', flexShrink: 0 }}>
                <button type="button" onClick={() => setShowRecipeModal(false)} className="btn-neu" style={{ flex: 1, padding: 10 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 10, fontWeight: 800 }}>
                  {submitting ? 'Guardando...' : 'Guardar Ficha Técnica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
