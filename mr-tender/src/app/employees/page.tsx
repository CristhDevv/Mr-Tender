'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Empleados y Personal</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Administra tu personal, salarios y comisiones del negocio</p>
      </div>

      <form onSubmit={handleCreateEmployee} className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Registrar Nuevo Empleado</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Nombre Completo</label>
            <input type="text" className="input-neu" placeholder="Roberto Mendoza" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Puesto / Cargo</label>
            <input type="text" className="input-neu" placeholder="Cajero / Vendedor" value={position} onChange={e => setPosition(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Salario Base Mensual</label>
            <input type="number" className="input-neu" placeholder="12000" value={salary} onChange={e => setSalary(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Teléfono</label>
            <input type="text" className="input-neu" placeholder="555-0182" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Correo Electrónico</label>
            <input type="email" className="input-neu" placeholder="roberto@negocio.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <button type="submit" className="btn-neu btn-primary" disabled={creating} style={{ alignSelf: 'flex-end', padding: '10px 24px', fontSize: '0.85rem' }}>
          {creating ? 'Registrando...' : 'Registrar Empleado'}
        </button>
      </form>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando personal...</div>
      ) : employees.length === 0 ? (
        <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No tienes empleados registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Registra a tus vendedores y cajeros para que operen desde la app móvil.
          </p>
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>N° Empleado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Cargo</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Salario Base</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Teléfono / Email</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600 }}>{emp.employee_number}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>{emp.full_name}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>{emp.position}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatCurrency(emp.base_salary)}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>{emp.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: emp.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)',
                      color: emp.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                    }}>
                      {emp.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => toggleEmployeeStatus(emp.id, emp.is_active)}
                      className="btn-neu btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: emp.is_active ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}
                    >
                      {emp.is_active ? 'Desactivar' : 'Activar'}
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
