'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
  User,
  Shield,
  ShieldCheck,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Key,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  RefreshCw
} from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string
  color: string
  is_system_role: boolean
  can_be_deleted: boolean
  permission_ids?: string[]
}

interface Permission {
  id: string
  module: string
  action: string
  description: string
}

interface Employee {
  id: string
  employee_number: string
  full_name: string
  email: string
  phone: string
  position: string
  base_salary: number
  is_active: boolean
  user_id?: string | null
  role_id?: string
  roles?: {
    id: string
    name: string
    color: string
  }
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#64748B', // Slate
]

const MODULE_LABELS: Record<string, { label: string; icon: string }> = {
  pos: { label: 'Punto de Venta (POS)', icon: '🛒' },
  cash: { label: 'Caja y Turnos', icon: '💵' },
  inventory: { label: 'Inventario & Bodega', icon: '📦' },
  products: { label: 'Productos & Catálogo', icon: '🏷️' },
  customers: { label: 'Clientes & Crédito', icon: '👥' },
  suppliers: { label: 'Proveedores', icon: '🚚' },
  purchases: { label: 'Compras & Recepción', icon: '🛍️' },
  reports: { label: 'Reportes & Finanzas', icon: '📊' },
  accounting: { label: 'Contabilidad', icon: '📖' },
  employees: { label: 'Personal & Empleados', icon: '👤' },
  settings: { label: 'Configuración', icon: '⚙️' },
  users: { label: 'Usuarios del Sistema', icon: '🔐' },
}

export default function EmployeesAndRolesPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees')
  
  // Data states
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // Employee form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [enableCredentials, setEnableCredentials] = useState(true)
  const [employeePassword, setEmployeePassword] = useState('Caja' + Math.floor(1000 + Math.random() * 9000) + '!')
  const [showPassword, setShowPassword] = useState(false)
  const [creatingEmployee, setCreatingEmployee] = useState(false)

  // Success summary modal
  const [createdSummary, setCreatedSummary] = useState<{
    fullName: string
    email: string
    password: string
    roleName: string
  } | null>(null)

  // Reset password modal states
  const [resetModalEmp, setResetModalEmp] = useState<Employee | null>(null)
  const [newResetPassword, setNewResetPassword] = useState('')
  const [savingReset, setSavingReset] = useState(false)

  // Role editor modal states
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleColor, setRoleColor] = useState('#3B82F6')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [savingRole, setSavingRole] = useState(false)

  // Load initial data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setAdminUserId(user.id)
        const tid = user.user_metadata?.tenant_id
        if (tid) {
          setTenantId(tid)
          // Ensure default roles are seeded for tenant
          await supabase.rpc('seed_tenant_default_roles', { p_tenant_id: tid })
          await Promise.all([
            fetchEmployees(tid),
            fetchRoles(tid),
            fetchPermissions()
          ])
        }
      } catch (err) {
        console.error('Error initializing:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchEmployees(tid: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*, roles:role_id(id, name, color)')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })

    if (!error && data) setEmployees(data)
  }

  async function fetchRoles(tid: string) {
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tid)
      .order('is_system_role', { ascending: false })
      .order('name', { ascending: true })

    if (rolesError || !rolesData) return

    // Get permissions for each role
    const { data: rolePermsData } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id')

    const rolePermsMap: Record<string, string[]> = {}
    rolePermsData?.forEach(rp => {
      if (!rolePermsMap[rp.role_id]) rolePermsMap[rp.role_id] = []
      rolePermsMap[rp.role_id].push(rp.permission_id)
    })

    const populatedRoles: Role[] = rolesData.map(r => ({
      ...r,
      permission_ids: rolePermsMap[r.id] || []
    }))

    setRoles(populatedRoles)
    if (populatedRoles.length > 0 && !selectedRoleId) {
      const defaultRole = populatedRoles.find(r => r.name.toLowerCase().includes('cajero')) || populatedRoles[0]
      setSelectedRoleId(defaultRole.id)
    }
  }

  async function fetchPermissions() {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true })
      .order('action', { ascending: true })

    if (!error && data) setPermissions(data)
  }

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const map: Record<string, Permission[]> = {}
    permissions.forEach(p => {
      if (!map[p.module]) map[p.module] = []
      map[p.module].push(p)
    })
    return map
  }, [permissions])

  function generatePassword() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    let pass = 'Caja'
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    pass += '!'
    setEmployeePassword(pass)
  }

  // Create Employee Handler
  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !tenantId || !adminUserId) return

    try {
      setCreatingEmployee(true)

      const targetRole = roles.find(r => r.id === selectedRoleId)
      const roleNameStr = targetRole?.name || 'Cajero'

      if (enableCredentials) {
        if (!email.trim() || !employeePassword.trim()) {
          alert('Por favor ingresa el correo/usuario y la contraseña de acceso.')
          return
        }

        // Call RPC create_tenant_employee_account (Auto-confirmed)
        const { data: res, error: rpcErr } = await supabase.rpc('create_tenant_employee_account', {
          p_admin_id: adminUserId,
          p_tenant_id: tenantId,
          p_email: email.trim(),
          p_password: employeePassword.trim(),
          p_full_name: fullName.trim(),
          p_role_id: selectedRoleId || null,
          p_position: position.trim() || 'Vendedor / Cajero',
          p_phone: phone.trim(),
          p_salary: parseFloat(salary) || 0
        })

        if (rpcErr || (res && res.success === false)) {
          throw new Error(res?.message || rpcErr?.message || 'Error al crear la cuenta del empleado')
        }

        // Show credentials summary modal
        setCreatedSummary({
          fullName: fullName.trim(),
          email: email.trim(),
          password: employeePassword.trim(),
          roleName: roleNameStr
        })
      } else {
        // Plain employee without auth account
        const empNo = 'EMP-' + Math.floor(100 + Math.random() * 900)
        const { error: insErr } = await supabase
          .from('employees')
          .insert([{
            tenant_id: tenantId,
            employee_number: empNo,
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            position: position.trim() || 'Vendedor / Cajero',
            base_salary: parseFloat(salary) || 0,
            role_id: selectedRoleId || null,
            is_active: true
          }])

        if (insErr) throw insErr
      }

      await fetchEmployees(tenantId)

      // Reset form
      setFullName('')
      setEmail('')
      setPhone('')
      setPosition('')
      setSalary('')
      generatePassword()
    } catch (err: any) {
      console.error('Error creating employee:', err)
      alert('Error: ' + (err.message || 'No se pudo crear al empleado'))
    } finally {
      setCreatingEmployee(false)
    }
  }

  // Reset Password Handler
  async function handleSaveResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetModalEmp || !newResetPassword.trim() || !adminUserId) return

    try {
      setSavingReset(true)
      const { data: res, error: rpcErr } = await supabase.rpc('reset_tenant_employee_password', {
        p_admin_id: adminUserId,
        p_employee_id: resetModalEmp.id,
        p_new_password: newResetPassword.trim()
      })

      if (rpcErr || (res && res.success === false)) {
        throw new Error(res?.message || rpcErr?.message || 'No se pudo restablecer la contraseña')
      }

      alert(`✅ Contraseña actualizada con éxito para ${resetModalEmp.full_name}`)
      setResetModalEmp(null)
      setNewResetPassword('')
    } catch (err: any) {
      alert('Error: ' + (err.message || ''))
    } finally {
      setSavingReset(false)
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

  // Role Editor Handlers
  function openCreateRoleModal() {
    setEditingRoleId(null)
    setRoleName('')
    setRoleDescription('')
    setRoleColor('#3B82F6')
    setSelectedPermissions(new Set())
    setShowRoleModal(true)
  }

  function openEditRoleModal(role: Role) {
    setEditingRoleId(role.id)
    setRoleName(role.name)
    setRoleDescription(role.description || '')
    setRoleColor(role.color || '#3B82F6')
    setSelectedPermissions(new Set(role.permission_ids || []))
    setShowRoleModal(true)
  }

  function togglePermission(permId: string) {
    setSelectedPermissions(prev => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  function toggleModulePermissions(module: string) {
    const modulePerms = permissionsByModule[module] || []
    const allSelected = modulePerms.every(p => selectedPermissions.has(p.id))

    setSelectedPermissions(prev => {
      const next = new Set(prev)
      if (allSelected) {
        modulePerms.forEach(p => next.delete(p.id))
      } else {
        modulePerms.forEach(p => next.add(p.id))
      }
      return next
    })
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault()
    if (!roleName.trim() || !tenantId) return

    try {
      setSavingRole(true)
      let currentRoleId = editingRoleId

      if (editingRoleId) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({
            name: roleName.trim(),
            description: roleDescription.trim(),
            color: roleColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRoleId)

        if (error) throw error
      } else {
        // Create new role
        const { data, error } = await supabase
          .from('roles')
          .insert([{
            tenant_id: tenantId,
            name: roleName.trim(),
            description: roleDescription.trim(),
            color: roleColor,
            is_system_role: false,
            can_be_deleted: true
          }])
          .select()

        if (error) throw error
        currentRoleId = data[0].id
      }

      if (currentRoleId) {
        // Synchronize role_permissions
        await supabase.from('role_permissions').delete().eq('role_id', currentRoleId)

        const permsToInsert = Array.from(selectedPermissions).map(permId => ({
          role_id: currentRoleId,
          permission_id: permId
        }))

        if (permsToInsert.length > 0) {
          const { error: permInsertErr } = await supabase
            .from('role_permissions')
            .insert(permsToInsert)

          if (permInsertErr) throw permInsertErr
        }
      }

      await fetchRoles(tenantId)
      setShowRoleModal(false)
    } catch (err: any) {
      console.error('Error saving role:', err)
      alert('Error al guardar el rol: ' + (err.message || ''))
    } finally {
      setSavingRole(false)
    }
  }

  async function handleDeleteRole(roleId: string, roleName: string) {
    if (!confirm(`¿Estás seguro de eliminar el rol "${roleName}"? Los empleados con este rol perderán sus permisos personalizados.`)) {
      return
    }

    try {
      const { error } = await supabase.from('roles').delete().eq('id', roleId)
      if (error) throw error
      if (tenantId) fetchRoles(tenantId)
    } catch (err: any) {
      console.error('Error deleting role:', err)
      alert('No se pudo eliminar el rol: ' + (err.message || ''))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Tabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Personal y Control de Acceso
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 3, margin: 0 }}>
            Crea empleados con usuario y contraseña instantáneos para operar tu negocio.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="neu-flat" style={{ padding: 4, borderRadius: 10, display: 'flex', gap: 4 }}>
          <button
            className={`btn-neu ${activeTab === 'employees' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('employees')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserCheck size={15} />
            <span>Personal ({employees.length})</span>
          </button>

          <button
            className={`btn-neu ${activeTab === 'roles' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('roles')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ShieldCheck size={15} />
            <span>Roles y Permisos ({roles.length})</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: EMPLEADOS Y PERSONAL ── */}
      {activeTab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Register Employee Form */}
          <form onSubmit={handleCreateEmployee} className="neu-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                Registrar Nuevo Empleado & Crear Credenciales
              </h3>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                <input
                  type="checkbox"
                  checked={enableCredentials}
                  onChange={e => setEnableCredentials(e.target.checked)}
                  style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
                <span>Crear usuario y contraseña de inicio de sesión</span>
              </label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre Completo *</label>
                <input type="text" className="input-neu" placeholder="Roberto Mendoza" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', fontSize: '0.82rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Puesto / Cargo</label>
                <input type="text" className="input-neu" placeholder="Cajero Mostrador" value={position} onChange={e => setPosition(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Rol de Acceso *</label>
                <select
                  className="input-neu"
                  value={selectedRoleId}
                  onChange={e => setSelectedRoleId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-deep)', cursor: 'pointer' }}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_system_role ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {enableCredentials ? 'Correo / Usuario de Acceso *' : 'Correo Electrónico'}
                </label>
                <input
                  type="email"
                  className="input-neu"
                  placeholder="cajero1@mitienda.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required={enableCredentials}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              {enableCredentials && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Contraseña *</label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      🎲 Generar otra
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-neu"
                      value={employeePassword}
                      onChange={e => setEmployeePassword(e.target.value)}
                      required
                      style={{ width: '100%', fontSize: '0.82rem', paddingRight: 32 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Teléfono</label>
                <input type="text" className="input-neu" placeholder="3001234567" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Salario Base Mensual</label>
                <input type="number" className="input-neu" placeholder="1500000" value={salary} onChange={e => setSalary(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
              </div>
            </div>

            <button type="submit" className="btn-neu btn-primary" disabled={creatingEmployee} style={{ alignSelf: 'flex-start', padding: '9px 20px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>{creatingEmployee ? 'Creando Usuario y Empleado...' : 'Crear Empleado y Credenciales'}</span>
            </button>
          </form>

          {/* Employees List */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando personal...</div>
          ) : employees.length === 0 ? (
            <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center' }}>
              <UserCheck size={36} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h2 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>No tienes empleados registrados</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Registra a tus vendedores y cajeros para asignarles credenciales de acceso directo.
              </p>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {employees.map(emp => {
                const assignedRole = roles.find(r => r.id === emp.role_id) || emp.roles
                const hasLogin = Boolean(emp.user_id)

                return (
                  <div key={emp.id} className="neu-flat" style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 220, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <User size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{emp.full_name}</span>
                        
                        {/* Role Badge */}
                        {assignedRole && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: `${assignedRole.color || '#3B82F6'}18`,
                            color: assignedRole.color || '#3B82F6',
                            border: `1px solid ${assignedRole.color || '#3B82F6'}35`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            <span>●</span>
                            <span>{assignedRole.name}</span>
                          </span>
                        )}

                        {/* Login Access Pill */}
                        {hasLogin ? (
                          <span className="badge badge-green" style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Key size={10} />
                            <span>Acceso Habilitado</span>
                          </span>
                        ) : (
                          <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>
                            Sin acceso al sistema
                          </span>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span><strong>Cargo:</strong> {emp.position}</span>
                        {emp.email && <span>• <strong>Usuario:</strong> {emp.email}</span>}
                        {emp.phone && <span>• <strong>Tel:</strong> {emp.phone}</span>}
                        {emp.base_salary > 0 && <span>• <strong>Salario:</strong> {formatCurrency(emp.base_salary)}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {hasLogin && (
                        <button
                          className="btn-neu"
                          onClick={() => {
                            setResetModalEmp(emp)
                            setNewResetPassword('Caja' + Math.floor(1000 + Math.random() * 9000) + '!')
                          }}
                          style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Cambiar contraseña de acceso"
                        >
                          <Key size={12} />
                          <span>Cambiar Clave</span>
                        </button>
                      )}

                      <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.65rem' }}>
                        {emp.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      
                      <button className="btn-neu btn-ghost" onClick={() => toggleEmployeeStatus(emp.id, emp.is_active)} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                        {emp.is_active ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ROLES Y PERMISOS DINÁMICOS ── */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Constructor de Roles y Permisos Granulares
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
                Crea roles ilimitados y personaliza con precisión quirúrgica a qué pantallas y botones tiene acceso cada usuario.
              </p>
            </div>

            <button onClick={openCreateRoleModal} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Crear Nuevo Rol</span>
            </button>
          </div>

          {/* Roles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {roles.map(role => {
              const permCount = role.permission_ids?.length || 0
              const totalPerms = permissions.length
              return (
                <div key={role.id} className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12, borderTop: `3px solid ${role.color}` }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: role.color }} />
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          {role.name}
                        </h4>
                      </div>

                      {role.is_system_role && (
                        <span className="badge badge-blue" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                          Sistema
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, marginBottom: 10, lineHeight: 1.35 }}>
                      {role.description || 'Sin descripción'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        {role.is_system_role ? 'Acceso Total (51/51)' : `${permCount} / ${totalPerms} permisos activos`}
                      </span>
                    </div>
                  </div>

                  {/* Role Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                    <button
                      className="btn-neu"
                      onClick={() => openEditRoleModal(role)}
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit2 size={13} />
                      <span>{role.is_system_role ? 'Ver Permisos' : 'Editar Permisos'}</span>
                    </button>

                    {!role.is_system_role && (
                      <button
                        className="btn-neu btn-ghost"
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--accent-coral)' }}
                        title="Eliminar rol"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: CREDENTIALS SUMMARY (POST CREATION) ── */}
      {createdSummary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Check size={26} strokeWidth={2.5} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              ¡Empleado y Credenciales Creados!
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 16 }}>
              El empleado ya puede iniciar sesión en la tienda sin necesidad de validar correos.
            </p>

            {/* Credentials Card */}
            <div className="neu-flat" style={{ padding: 14, borderRadius: 8, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Nombre:</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{createdSummary.fullName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Rol Asignado:</span>
                <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{createdSummary.roleName}</span>
              </div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Correo / Usuario de Acceso:</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>{createdSummary.email}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Contraseña:</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--accent-coral)', letterSpacing: '0.05em' }}>{createdSummary.password}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-neu"
                onClick={() => {
                  navigator.clipboard.writeText(`Acceso Mr Tender:\nUsuario: ${createdSummary.email}\nContraseña: ${createdSummary.password}\nLink: https://mr-tender.vercel.app/login`)
                  alert('¡Credenciales copiadas al portapapeles!')
                }}
                style={{ flex: 1, padding: '9px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Copy size={14} />
                <span>Copiar Datos</span>
              </button>

              <button
                className="btn-neu btn-primary"
                onClick={() => setCreatedSummary(null)}
                style={{ flex: 1, padding: '9px', fontSize: '0.8rem' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET EMPLOYEE PASSWORD ── */}
      {resetModalEmp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Cambiar Contraseña de Acceso
              </h3>
              <button className="btn-neu btn-ghost" onClick={() => setResetModalEmp(null)} style={{ padding: '2px 6px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, marginBottom: 14 }}>
              Asigna una nueva clave para <strong>{resetModalEmp.full_name}</strong> ({resetModalEmp.email}).
            </p>

            <form onSubmit={handleSaveResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Nueva Contraseña *</label>
                <input
                  type="text"
                  className="input-neu"
                  value={newResetPassword}
                  onChange={e => setNewResetPassword(e.target.value)}
                  required
                  placeholder="NuevaClave2026!"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-neu btn-ghost"
                  onClick={() => setResetModalEmp(null)}
                  style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingReset}
                  className="btn-neu btn-primary"
                  style={{ padding: '7px 16px', fontSize: '0.8rem' }}
                >
                  {savingReset ? 'Actualizando...' : 'Guardar Nueva Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ROLE EDITOR & PERMISSION MATRIX ── */}
      {showRoleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingRoleId ? `Editar Rol: ${roleName}` : 'Crear Nuevo Rol Personalizado'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
                  Configura el nombre, color y activa los permisos exactos que tendrá este perfil.
                </p>
              </div>

              <button className="btn-neu btn-ghost" onClick={() => setShowRoleModal(false)} style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 14 }}>
              
              {/* Top Settings: Name, Description & Color */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, flexShrink: 0 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre del Rol *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Cajero Turno Noche"
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Descripción</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Venta rápida y atención de clientes"
                    value={roleDescription}
                    onChange={e => setRoleDescription(e.target.value)}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Color de Etiqueta</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 36 }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setRoleColor(c)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: c,
                          border: roleColor === c ? '2px solid #fff' : 'none',
                          boxShadow: roleColor === c ? '0 0 0 2px var(--accent-blue)' : 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Permission Matrix Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 10, flexShrink: 0 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Matriz de Permisos ({selectedPermissions.size} seleccionados)
                </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-neu btn-ghost"
                    onClick={() => setSelectedPermissions(new Set(permissions.map(p => p.id)))}
                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                  >
                    Seleccionar Todos
                  </button>
                  <button
                    type="button"
                    className="btn-neu btn-ghost"
                    onClick={() => setSelectedPermissions(new Set())}
                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Scrollable Permissions List by Module */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
                {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
                  const info = MODULE_LABELS[module] || { label: module.toUpperCase(), icon: '📁' }
                  const allInModuleSelected = modulePerms.every(p => selectedPermissions.has(p.id))

                  return (
                    <div key={module} className="neu-flat" style={{ padding: '10px 14px', borderRadius: 8 }}>
                      
                      {/* Module Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '1.1rem' }}>{info.icon}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {info.label}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(module)}
                          className="btn-neu btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--accent-blue)' }}
                        >
                          {allInModuleSelected ? 'Desmarcar módulo' : 'Marcar módulo'}
                        </button>
                      </div>

                      {/* Module Permissions Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                        {modulePerms.map(perm => {
                          const isChecked = selectedPermissions.has(perm.id)
                          return (
                            <label
                              key={perm.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: isChecked ? 'var(--accent-blue-lt)' : 'var(--bg)',
                                border: `1px solid ${isChecked ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(perm.id)}
                                style={{ cursor: 'pointer', accentColor: 'var(--accent-blue)' }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: isChecked ? 700 : 500, color: 'var(--text-primary)' }}>
                                  {perm.description}
                                </div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                  {perm.action}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-neu btn-ghost"
                  onClick={() => setShowRoleModal(false)}
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="btn-neu btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Check size={15} strokeWidth={2.5} />
                  <span>{savingRole ? 'Guardando...' : 'Guardar Rol y Permisos'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
