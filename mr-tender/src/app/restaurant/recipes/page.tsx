'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  UtensilsCrossed,
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Percent,
  ChefHat,
  X,
  Flame
} from 'lucide-react'

interface RestaurantRecipe {
  id: string
  tenant_id: string
  dish_name: string
  dish_price: number
  portion_cost: number
  ingredients_json: Array<{ ingredient: string; quantity: string; cost: number }>
  preparation_notes?: string | null
  created_at: string
}

export default function RestaurantRecipesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recipes, setRecipes] = useState<RestaurantRecipe[]>([])
  const [showRecipeModal, setShowRecipeModal] = useState(false)

  const [recipeForm, setRecipeForm] = useState({
    dish_name: '',
    dish_price: 28000,
    preparation_notes: '',
    ingredients: [
      { ingredient: 'Ingrediente principal', quantity: '150 g', cost: 4500 },
      { ingredient: 'Acompañamiento / Guarnición', quantity: '1 porción', cost: 1800 }
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
        .from('restaurant_recipes')
        .select('*')
        .eq('tenant_id', tid)
        .order('dish_name', { ascending: true })

      if (error) throw error
      setRecipes(data || [])
    } catch (err) {
      console.error('Error loading recipes:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleAddIngredientRow() {
    setRecipeForm({
      ...recipeForm,
      ingredients: [...recipeForm.ingredients, { ingredient: '', quantity: '1 und', cost: 0 }]
    })
  }

  function handleRemoveIngredientRow(index: number) {
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
      const portionCost = recipeForm.ingredients.reduce((acc, it) => acc + Number(it.cost || 0), 0)
      const payload = {
        tenant_id: tenantId,
        dish_name: recipeForm.dish_name,
        dish_price: Number(recipeForm.dish_price),
        portion_cost: portionCost,
        ingredients_json: recipeForm.ingredients,
        preparation_notes: recipeForm.preparation_notes || null
      }
      const { error } = await supabase.from('restaurant_recipes').insert(payload)
      if (error) throw error
      setShowRecipeModal(false)
      setRecipeForm({
        dish_name: '',
        dish_price: 28000,
        preparation_notes: '',
        ingredients: [{ ingredient: 'Ingrediente principal', quantity: '150 g', cost: 4500 }]
      })
      await loadRecipes()
    } catch (err: any) {
      alert(err.message || 'Error al guardar receta')
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
          dish_name: 'Hamburguesa Artesanal Angus',
          dish_price: 32000,
          portion_cost: 10400,
          ingredients_json: [
            { ingredient: 'Pan Brioche Artesanal', quantity: '1 und', cost: 1800 },
            { ingredient: 'Carne Molida Angus 150g', quantity: '150 g', cost: 5200 },
            { ingredient: 'Queso Cheddar Americano', quantity: '1 tajada', cost: 1100 },
            { ingredient: 'Tocineta Ahumada', quantity: '30 g', cost: 1500 },
            { ingredient: 'Salsas y Vegetales', quantity: 'Porción', cost: 800 }
          ],
          preparation_notes: 'Parrilla a fuego alto 4 min por lado. Sellar pan con mantequilla.'
        },
        {
          tenant_id: tenantId,
          dish_name: 'Costillas BBQ San Luis 500g',
          dish_price: 45000,
          portion_cost: 16500,
          ingredients_json: [
            { ingredient: 'Costillar de Cerdo San Luis', quantity: '500 g', cost: 12000 },
            { ingredient: 'Salsa BBQ Casera Ahumada', quantity: '80 ml', cost: 2200 },
            { ingredient: 'Papas a la Francesa', quantity: '150 g', cost: 2300 }
          ],
          preparation_notes: 'Cocción lenta al vacío 8 horas. Caramelizar en parrilla con BBQ.'
        }
      ]
      await supabase.from('restaurant_recipes').insert(demo)
      await loadRecipes()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const totalCalculatedCost = recipeForm.ingredients.reduce((acc, it) => acc + Number(it.cost || 0), 0)
  const currentMargin = recipeForm.dish_price > 0 ? ((recipeForm.dish_price - totalCalculatedCost) / recipeForm.dish_price) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumbs & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Catálogo & Inventario</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Recetas & Escandallo</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UtensilsCrossed size={24} style={{ color: 'var(--accent-green)' }} />
            Recetas, Fichas Técnicas & Escandallo
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Costeo detallado de ingredientes por porción, rentabilidad y fichas de preparación para cocina.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/restaurant/tables"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UtensilsCrossed size={15} />
            <span>Mesas & Salón</span>
          </Link>
          <Link
            href="/restaurant/kds"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Flame size={15} />
            <span>Cocina KDS</span>
          </Link>
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

      {/* Grid of recipes */}
      {recipes.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay recetas registradas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Comienza a costear tus platos para controlar el gasto de insumos y maximizar la rentabilidad.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoRecipes} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Cargar Recetas Demo
            </button>
            <button onClick={() => setShowRecipeModal(true)} className="btn-neu" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Plus size={15} /> Crear Receta
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {recipes.map(rec => {
            const margin = rec.dish_price > 0 ? ((rec.dish_price - rec.portion_cost) / rec.dish_price) * 100 : 0
            const ingredients = Array.isArray(rec.ingredients_json) ? rec.ingredients_json : []

            return (
              <div key={rec.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{rec.dish_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{ingredients.length} insumos costeados</div>
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
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Costo por Porción</div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-coral)' }}>{formatCurrency(rec.portion_cost)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Precio Venta al Público</div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(rec.dish_price)}</div>
                  </div>
                </div>

                {/* Ingredients table preview */}
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 2 }}>Desglose de Ingredientes:</div>
                  {ingredients.slice(0, 4).map((it: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>• {it.ingredient} ({it.quantity})</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(it.cost)}</span>
                    </div>
                  ))}
                  {ingredients.length > 4 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      + {ingredients.length - 4} ingredientes más...
                    </div>
                  )}
                </div>

                {rec.preparation_notes && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <strong>Nota Chef:</strong> {rec.preparation_notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Crear Receta */}
      {showRecipeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 560, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nueva Receta & Escandallo</h3>
              <button onClick={() => setShowRecipeModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateRecipe} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Plato</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Salmón al Horno con Finas Hierbas"
                  value={recipeForm.dish_name}
                  onChange={e => setRecipeForm({ ...recipeForm, dish_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio de Venta Sugerido (COP)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={recipeForm.dish_price}
                  onChange={e => setRecipeForm({ ...recipeForm, dish_price: Number(e.target.value) })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Ingredients List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Ingredientes & Insumos</label>
                  <button type="button" onClick={handleAddIngredientRow} className="btn-neu" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                    + Insumo
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recipeForm.ingredients.map((it, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Insumo (ej. Queso)"
                        value={it.ingredient}
                        onChange={e => handleUpdateIngredient(idx, 'ingredient', e.target.value)}
                        className="input-neu"
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Cant (ej. 100g)"
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
                        onClick={() => handleRemoveIngredientRow(idx)}
                        className="btn-neu btn-ghost"
                        style={{ padding: 6, color: 'var(--accent-coral)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary calculation */}
              <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Costo Total Insumos: </span>
                  <strong style={{ color: 'var(--accent-coral)' }}>{formatCurrency(totalCalculatedCost)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Margen Estimado: </span>
                  <strong style={{ color: currentMargin >= 60 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                    {currentMargin.toFixed(1)}%
                  </strong>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Instrucciones de Preparación / Ficha Chef</label>
                <textarea
                  rows={3}
                  placeholder="Tiempos, temperatura de horno, ensamblado..."
                  value={recipeForm.preparation_notes}
                  onChange={e => setRecipeForm({ ...recipeForm, preparation_notes: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowRecipeModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
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
