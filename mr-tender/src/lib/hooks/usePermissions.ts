'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserPermissionContext {
  role: string
  roleName: string
  color: string
  isAdmin: boolean
  permissions: string[]
  loading: boolean
  hasPermission: (permission: string) => boolean
}

export function usePermissions(): UserPermissionContext {
  const [role, setRole] = useState('admin')
  const [roleName, setRoleName] = useState('Administrador')
  const [color, setColor] = useState('#3B82F6')
  const [isAdmin, setIsAdmin] = useState(true)
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
          setPermissions([])
          return
        }

        // Check user metadata first
        const userMetaRole = user.user_metadata?.role
        const isOwnerMeta = user.user_metadata?.is_owner === true || userMetaRole === 'admin' || userMetaRole === 'superadmin' || !userMetaRole

        // Call RPC get_user_permissions
        const { data, error } = await supabase.rpc('get_user_permissions', {
          p_user_id: user.id
        })

        if (error || !data) {
          setIsAdmin(isOwnerMeta)
          setRole(userMetaRole || (isOwnerMeta ? 'admin' : 'cashier'))
          setRoleName(isOwnerMeta ? 'Administrador' : 'Empleado')
          setPermissions(isOwnerMeta ? ['*'] : ['pos.view', 'pos.create_sale', 'cash.view'])
          return
        }

        const isUserAdmin = Boolean(
          data.is_admin === true ||
          data.role === 'admin' ||
          data.role === 'superadmin' ||
          data.role_name?.toLowerCase().includes('admin') ||
          data.role_name?.toLowerCase().includes('propietario') ||
          isOwnerMeta ||
          data.permissions?.includes('*')
        )

        setIsAdmin(isUserAdmin)
        setRole(data.role || (isUserAdmin ? 'admin' : 'cashier'))
        setRoleName(data.role_name || (isUserAdmin ? 'Administrador' : 'Empleado'))
        setColor(data.color || '#3B82F6')
        setPermissions(isUserAdmin ? ['*'] : (data.permissions || []))
      } catch (err) {
        console.error('Error loading permissions:', err)
        // Safe admin fallback
        setIsAdmin(true)
        setPermissions(['*'])
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  const hasPermission = useCallback((permission: string): boolean => {
    if (isAdmin || permissions.includes('*') || role === 'admin' || role === 'superadmin') return true
    if (!permission) return true

    // Check exact match e.g. "reports.sales" or wildcard "reports.*"
    if (permissions.includes(permission)) return true
    const module = permission.split('.')[0]
    if (permissions.includes(`${module}.*`) || permissions.includes(`${module}.manage`)) return true

    return false
  }, [isAdmin, permissions, role])

  return {
    role,
    roleName,
    color,
    isAdmin,
    permissions,
    loading,
    hasPermission
  }
}
