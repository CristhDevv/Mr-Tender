'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EcommerceSettings {
  id: string;
  store_name: string;
  subdomain: string;
  description: string;
  primary_color: string;
  show_stock: boolean;
  is_active: boolean;
}

export default function EcommercePage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<EcommerceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Form states
  const [storeName, setStoreName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [description, setDescription] = useState('')
  const [showStock, setShowStock] = useState(false)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        setTenantId(data.user.user_metadata.tenant_id)
        fetchSettings(data.user.user_metadata.tenant_id)
      }
    })
  }, [])

  async function fetchSettings(tid: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ecommerce_settings')
        .select('*')
        .eq('tenant_id', tid)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettings(data)
        setStoreName(data.store_name || '')
        setSubdomain(data.subdomain || '')
        setDescription(data.description || '')
        setShowStock(data.show_stock || false)
        setIsActive(data.is_active || false)
      } else {
        // Create default settings row if it doesn't exist
        const defaultSubdomain = 'tienda-' + Math.floor(1000 + Math.random() * 9000)
        const { data: newSettings, error: insertErr } = await supabase
          .from('ecommerce_settings')
          .insert([{
            tenant_id: tid,
            store_name: 'Mi Tienda Virtual',
            subdomain: defaultSubdomain,
            description: 'Bienvenido a nuestra tienda en línea',
            primary_color: '#4A90D9',
            show_stock: true,
            is_active: true
          }])
          .select()
          .single()

        if (insertErr) throw insertErr
        if (newSettings) {
          setSettings(newSettings)
          setStoreName(newSettings.store_name)
          setSubdomain(newSettings.subdomain)
          setDescription(newSettings.description)
          setShowStock(newSettings.show_stock)
          setIsActive(newSettings.is_active)
        }
      }
    } catch (err) {
      console.error('Error fetching ecommerce settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !settings) return

    try {
      setSaving(true)
      const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-')

      const { error } = await supabase
        .from('ecommerce_settings')
        .update({
          store_name: storeName.trim(),
          subdomain: cleanSubdomain,
          description: description.trim(),
          show_stock: showStock,
          is_active: isActive
        })
        .eq('tenant_id', tenantId)

      if (error) throw error
      alert('Configuración de e-commerce guardada con éxito.')
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Error al guardar la configuración. El subdominio podría estar duplicado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mi Tienda Virtual (E-commerce)</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Personaliza tu catálogo en línea y los datos de tu storefront público</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando configuraciones...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Configuración */}
          <form onSubmit={handleSaveSettings} className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Ajustes del E-commerce</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Nombre de la tienda</label>
                <input type="text" className="input-neu" value={storeName} onChange={e => setStoreName(e.target.value)} required style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Subdominio URL</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="text" className="input-neu" value={subdomain} onChange={e => setSubdomain(e.target.value)} required style={{ width: '60%', textAlign: 'right' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>.mrtender.com</span>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Descripción de la tienda</label>
              <textarea className="input-neu" rows={3} value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', resize: 'none', padding: '10px 14px' }} />
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showStock} onChange={e => setShowStock(e.target.checked)} style={{ width: 18, height: 18 }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Mostrar Stock</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Muestra la cantidad disponible de productos en la tienda pública</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 18, height: 18 }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Tienda Virtual Activa</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Permite el acceso público a tu tienda y catálogo en línea</span>
                </div>
              </label>
            </div>

            <button type="submit" className="btn-neu btn-primary" disabled={saving} style={{ alignSelf: 'flex-end', padding: '12px 30px', fontSize: '0.85rem', marginTop: 12 }}>
              {saving ? 'Guardando ajustes...' : 'Guardar Ajustes'}
            </button>
          </form>

          {/* Vista Previa de URL */}
          <div className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, height: 'fit-content' }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Tu Enlace Público</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tus clientes pueden comprar tus productos ingresando a la siguiente URL pública desde el navegador o móvil:
            </p>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bg-deep)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Enlace del E-commerce:</span>
              <a
                href={subdomain ? `/store/${subdomain}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 700, textDecoration: 'none', wordBreak: 'break-all' }}
              >
                {subdomain ? `${window.location.origin}/store/${subdomain}` : 'Cargando...'}
              </a>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ⚠️ Asegúrate de marcar "Tienda Virtual Activa" para que el catálogo sea visible.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
