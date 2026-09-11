'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserPermissionContext {
  role: string
  roleName: string
  color: string
  isAdmin: boolean
  isSuperAdmin: boolean
  permissions: string[]
  loading: boolean
  hasPermission: (permission: string) => boolean
}

export function usePermissions(): UserPermissionContext {
  const [role, setRole] = useState('admin')
  const [roleName, setRoleName] = useState('Administrador')
  const [color, setColor] = useState('#3B82F6')
  const [isAdmin, setIsAdmin] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [permissions, setPermissions] = useState<string[]>(['*'])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchPermissions() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsAdmin(false)
          setIsSuperAdmin(false)
          setPermissions([])
          return
        }

        // Check user metadata safely
        const userMetaRole = user.app_metadata?.role || user.user_metadata?.role
        const isOwnerMeta = Boolean(
          user.user_metadata?.is_owner === true ||
          userMetaRole === 'admin' ||
          userMetaRole === 'superadmin' ||
          userMetaRole === 'owner'
        )

        const isSuper = Boolean(
          userMetaRole === 'superadmin' ||
          user.user_metadata?.is_superadmin === true ||
          user.email === 'camilovelascoofficial@gmail.com' ||
          user.email === 'camivelasco93@gmail.com'
        )

        // Call RPC get_user_permissions
        const { data, error } = await supabase.rpc('get_user_permissions', {
          p_user_id: user.id
        })

        if (error || !data) {
          setIsAdmin(isOwnerMeta)
          setIsSuperAdmin(isSuper || userMetaRole === 'superadmin')
          setRole(userMetaRole || (isOwnerMeta ? 'admin' : 'employee'))
          setRoleName(isSuper || userMetaRole === 'superadmin' ? 'Super Administrador' : (isOwnerMeta ? 'Administrador' : 'Empleado'))
          setPermissions(isOwnerMeta ? ['*'] : ['pos.view', 'pos.create_sale', 'cash.view'])
          return
        }

        const isSuperDetected = Boolean(
          isSuper ||
          data.role === 'superadmin' ||
          data.role_name?.toLowerCase().includes('super') ||
          userMetaRole === 'superadmin'
        )

        const isUserAdmin = Boolean(
          data.is_admin === true ||
          data.role === 'admin' ||
          data.role === 'superadmin' ||
          data.role_name?.toLowerCase().includes('admin') ||
          data.role_name?.toLowerCase().includes('propietario') ||
          isOwnerMeta ||
          isSuperDetected ||
          data.permissions?.includes('*')
        )

        setIsAdmin(isUserAdmin)
        setIsSuperAdmin(isSuperDetected)
        setRole(data.role || (isUserAdmin ? 'admin' : 'employee'))
        setRoleName(data.role_name || (isSuperDetected ? 'Super Administrador' : (isUserAdmin ? 'Administrador' : 'Empleado')))
        setColor(data.color || (isSuperDetected ? '#BE185D' : '#3B82F6'))
        setPermissions(isUserAdmin ? ['*'] : (data.permissions || []))
      } catch (err) {
        console.error('Error loading permissions:', err)
        setIsAdmin(false)
        setIsSuperAdmin(false)
        setPermissions([])
        setRole('restricted')
        setRoleName('Acceso Restringido')
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  const hasPermission = useCallback((permission: string): boolean => {
    if (isAdmin || isSuperAdmin || permissions.includes('*') || role === 'admin' || role === 'superadmin') return true
    if (!permission) return true

    // Check exact match e.g. "reports.sales" or wildcard "reports.*"
    if (permissions.includes(permission)) return true
    const module = permission.split('.')[0]
    if (permissions.includes(`${module}.*`) || permissions.includes(`${module}.manage`)) return true

    return false
  }, [isAdmin, isSuperAdmin, permissions, role])

  return {
    role,
    roleName,
    color,
    isAdmin,
    isSuperAdmin,
    permissions,
    loading,
    hasPermission
  }
}
