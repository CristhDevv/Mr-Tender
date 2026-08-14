'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Supplier {
  id: string;
  code: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export default function SuppliersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Form states
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        setTenantId(data.user.user_metadata.tenant_id)
        fetchSuppliers(data.user.user_metadata.tenant_id)
      }
    })
  }, [])

  async function fetchSuppliers(tid: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName || !tenantId) return

    try {
      setCreating(true)
      const randomCode = 'PROV-' + Math.floor(1000 + Math.random() * 9000)
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          tenant_id: tenantId,
          code: randomCode,
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          is_active: true
        }])
        .select()

      if (error) throw error
      if (data) setSuppliers(prev => [data[0], ...prev])

      setCompanyName('')
      setContactName('')
      setPhone('')
      setEmail('')
    } catch (err) {
      console.error('Error creating supplier:', err)
      alert('No se pudo registrar al proveedor.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleSupplierActive(supplierId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: !currentActive })
        .eq('id', supplierId)

      if (error) throw error
      setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, is_active: !currentActive } : s))
    } catch (err) {
      console.error('Error updating supplier status:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Proveedores</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Administra los datos de contacto y facturación de tus proveedores</p>
      </div>

      <form onSubmit={handleCreateSupplier} className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Registrar Nuevo Proveedor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Razón Social / Compañía</label>
            <input type="text" className="input-neu" placeholder="Distribuidora de Harinas S.A." value={companyName} onChange={e => setCompanyName(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Nombre del Contacto</label>
            <input type="text" className="input-neu" placeholder="Eduardo Gómez" value={contactName} onChange={e => setContactName(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Teléfono</label>
            <input type="text" className="input-neu" placeholder="555-0199" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Correo Electrónico</label>
            <input type="email" className="input-neu" placeholder="contacto@distribuidora.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <button type="submit" className="btn-neu btn-primary" disabled={creating} style={{ alignSelf: 'flex-end', padding: '10px 24px', fontSize: '0.85rem' }}>
          {creating ? 'Registrando...' : 'Registrar Proveedor'}
        </button>
      </form>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando proveedores...</div>
      ) : suppliers.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚚</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No tienes proveedores registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Agrega tu primer proveedor utilizando el formulario superior.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Código</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Razón Social</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Contacto</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Teléfono</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600 }}>{s.code}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.company_name}</td>
                  <td style={{ padding: '16px 20px' }}>{s.contact_name}</td>
                  <td style={{ padding: '16px 20px' }}>{s.phone}</td>
                  <td style={{ padding: '16px 20px' }}>{s.email}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: s.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)',
                      color: s.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                    }}>
                      {s.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => toggleSupplierActive(s.id, s.is_active)}
                      className="btn-neu btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: s.is_active ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}
                    >
                      {s.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
