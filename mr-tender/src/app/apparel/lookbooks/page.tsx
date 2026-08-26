'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Sparkles,
  Shirt,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShoppingBag,
  Percent,
  X
} from 'lucide-react'

interface ApparelLookbook {
  id: string
  tenant_id: string
  title: string
  description?: string | null
  discount_percent: number
  items_json: {
    item_name: string
    price: number
  }[]
  total_price: number
  is_active: boolean
  created_at: string
}

export default function ApparelLookbooksPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lookbooks, setLookbooks] = useState<ApparelLookbook[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: 'Outfit Casual Urbano Verano',
    description: 'Camisa Polo + Jean Slim + Cinturón de Cuero',
    discount_percent: 15,
    items: [
      { item_name: 'Camisa Polo Piqué Blanca', price: 65000 },
      { item_name: 'Jean Slim Denim Oscuro', price: 110000 },
      { item_name: 'Cinturón Cuero Café', price: 45000 }
    ]
  })

  useEffect(() => {
    loadLookbooks()
  }, [])

  async function loadLookbooks() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('apparel_lookbooks')
        .select('*')
        .eq('tenant_id', tid)
        .order('title', { ascending: true })

      if (error) throw error

      let list = data || []
      if (list.length === 0) {
        list = [
          {
            id: '1',
            tenant_id: tid,
            title: 'Look Casual Ejecutivo',
            description: 'Blazer Azul Marino + Camisa Oxford + Pantalón Dril',
            discount_percent: 20,
            items_json: [
              { item_name: 'Blazer Slim Fit', price: 180000 },
              { item_name: 'Camisa Oxford Blanca', price: 75000 },
              { item_name: 'Pantalón Dril Beige', price: 95000 }
            ],
            total_price: 280000,
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            tenant_id: tid,
            title: 'Look Gala & Noche',
            description: 'Vestido Seda Largo + Collar Brillantes + Tacones',
            discount_percent: 15,
            items_json: [
              { item_name: 'Vestido Gala Seda', price: 220000 },
              { item_name: 'Accesorio Collar', price: 45000 }
            ],
            total_price: 225250,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ]
      }

      setLookbooks(list)
    } catch (err) {
      console.error('Error loading lookbooks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLookbook(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const sum = form.items.reduce((acc, it) => acc + Number(it.price || 0), 0)
      const discounted = sum * (1 - (Number(form.discount_percent) || 0) / 100)

      const { error } = await supabase.from('apparel_lookbooks').insert({
        tenant_id: tenantId,
        title: form.title,
        description: form.description || null,
        discount_percent: Number(form.discount_percent) || 0,
        items_json: form.items,
        total_price: discounted,
        is_active: true
      })

      if (error) throw error
      setShowModal(false)
      await loadLookbooks()
    } catch (err: any) {
      alert(err.message || 'Error al crear outfit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Outfits & Lookbooks</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--accent-purple)' }} />
            Lookbooks, Colecciones & Venta de Outfits Completos
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Venta cruzada sugerida para asesores de tienda: viste al maniquí y vende el look completo con descuento en un clic.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Look / Outfit</span>
          </button>
        </div>
      </div>

      {/* Lookbooks Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {lookbooks.map(l => {
          const items = Array.isArray(l.items_json) ? l.items_json : []
          const regularSum = items.reduce((acc, it) => acc + Number(it.price || 0), 0)

          return (
            <div key={l.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{l.title}</div>
                  {l.description && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{l.description}</div>}
                </div>
                {l.discount_percent > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)' }}>
                    -{l.discount_percent}% Combo Look
                  </span>
                )}
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Prendas del Outfit:</div>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>• {it.item_name}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(it.price)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    {formatCurrency(regularSum)}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                    {formatCurrency(l.total_price)}
                  </div>
                </div>

                <Link
                  href="/pos"
                  className="btn-neu btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ShoppingBag size={13} />
                  <span>Cobrar Outfit</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Nuevo Outfit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Crear Lookbook / Outfit Completo</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateLookbook} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Título del Look</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Outfit Casual Verano"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Descripción / Recomendación</label>
                <input
                  type="text"
                  placeholder="Ideal para fines de semana..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Descuento por llevar el Look Completo (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={form.discount_percent}
                  onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Crear Lookbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
