'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
  User
} from 'lucide-react'

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  base_salary: number;
  is_active: boolean;
}

export default function EmployeesPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        setTenantId(data.user.user_metadata.tenant_id)
        fetchEmployees(data.user.user_metadata.tenant_id)
      }
    })
  }, [])

  async function fetchEmployees(tid: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName || !tenantId) return

    try {
      setCreating(true)
      const empNo = 'EMP-' + Math.floor(100 + Math.random() * 900)

      const { data, error } = await supabase
        .from('employees')
        .insert([{
          tenant_id: tenantId,
          employee_number: empNo,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          position: position.trim() || 'Vendedor',
          base_salary: parseFloat(salary) || 0,
          is_active: true
        }])
        .select()

      if (error) throw error
      if (data) setEmployees(prev => [data[0], ...prev])

      setFullName('')
      setEmail('')
      setPhone('')
      setPosition('')
      setSalary('')
    } catch (err) {
      console.error('Error creating employee:', err)
      alert('No se pudo registrar al empleado.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleEmployeeStatus(empId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: !currentActive })
        .eq('id', empId)

      if (error) throw error
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, is_active: !currentActive } : e))
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Empleados y Personal</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>Administra tu personal, salarios y permisos del negocio</p>
      </div>

      <form onSubmit={handleCreateEmployee} className="neu-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Registrar Nuevo Empleado</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre Completo *</label>
            <input type="text" className="input-neu" placeholder="Roberto Mendoza" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Puesto / Cargo</label>
            <input type="text" className="input-neu" placeholder="Cajero / Vendedor" value={position} onChange={e => setPosition(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Salario Base Mensual</label>
            <input type="number" className="input-neu" placeholder="1500000" value={salary} onChange={e => setSalary(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Teléfono</label>
            <input type="text" className="input-neu" placeholder="3001234567" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Correo Electrónico</label>
            <input type="email" className="input-neu" placeholder="roberto@negocio.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
          </div>
        </div>
        <button type="submit" className="btn-neu btn-primary" disabled={creating} style={{ alignSelf: 'flex-start', padding: '8px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} strokeWidth={2.5} />
          <span>{creating ? 'Registrando...' : 'Registrar Empleado'}</span>
        </button>
      </form>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando personal...</div>
      ) : employees.length === 0 ? (
        <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <UserCheck size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
          <h2 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>No tienes empleados registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Registra a tus vendedores y cajeros para operar la app.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {employees.map(emp => (
            <div key={emp.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span>{emp.position}</span>
                  {emp.phone && <span>• {emp.phone}</span>}
                  {emp.base_salary > 0 && <span>• {formatCurrency(emp.base_salary)}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.65rem' }}>
                  {emp.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <button className="btn-neu btn-ghost" onClick={() => toggleEmployeeStatus(emp.id, emp.is_active)} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                  {emp.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
