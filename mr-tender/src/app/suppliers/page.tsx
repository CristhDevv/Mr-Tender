'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Truck,
  Plus,
  Phone,
  Mail,
  User,
  Building2,
  CheckCircle2,
  XCircle
} from 'lucide-react'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Proveedores</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>Administra los datos de contacto y facturación de tus proveedores</p>
      </div>

      <form onSubmit={handleCreateSupplier} className="neu-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Registrar Nuevo Proveedor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Razón Social / Compañía *</label>
            <input type="text" className="input-neu" placeholder="Distribuidora de Harinas S.A." value={companyName} onChange={e => setCompanyName(e.target.value)} required style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre del Contacto</label>
            <input type="text" className="input-neu" placeholder="Eduardo Gómez" value={contactName} onChange={e => setContactName(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Teléfono</label>
            <input type="text" className="input-neu" placeholder="555-0199" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Correo Electrónico</label>
            <input type="email" className="input-neu" placeholder="contacto@distribuidora.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
        </div>
        <button type="submit" className="btn-neu btn-primary" disabled={creating} style={{ alignSelf: 'flex-start', padding: '8px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} strokeWidth={2.5} />
          <span>{creating ? 'Registrando...' : 'Registrar Proveedor'}</span>
        </button>
      </form>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando proveedores...</div>
      ) : suppliers.length === 0 ? (
        <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <Truck size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
          <h2 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>No tienes proveedores registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Agrega tu primer proveedor utilizando el formulario superior.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suppliers.map(s => (
            <div key={s.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.company_name}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span>{s.code}</span>
                  {s.contact_name && <span>• {s.contact_name}</span>}
                  {s.phone && <span>• {s.phone}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span className={`badge ${s.is_active ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.65rem' }}>
                  {s.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <button className="btn-neu btn-ghost" onClick={() => toggleSupplierActive(s.id, s.is_active)} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                  {s.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
