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

        // Call RPC get_user_permissions
        const { data, error } = await supabase.rpc('get_user_permissions', {
          p_user_id: user.id
        })

        if (error || !data) {
          // Fallback based on user metadata
          const isOwner = user.user_metadata?.is_owner === true || user.user_metadata?.role === 'admin'
          setIsAdmin(isOwner)
          setRole(user.user_metadata?.role || (isOwner ? 'admin' : 'cashier'))
          setRoleName(isOwner ? 'Administrador' : 'Empleado')
          setPermissions(isOwner ? ['*'] : ['pos.view', 'pos.create_sale', 'cash.view'])
          return
        }

        setRole(data.role || 'admin')
        setRoleName(data.role_name || 'Administrador')
        setColor(data.color || '#3B82F6')
        setIsAdmin(data.is_admin === true)
        setPermissions(data.permissions || [])
      } catch (err) {
        console.error('Error loading permissions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  const hasPermission = useCallback((permission: string): boolean => {
    if (isAdmin || permissions.includes('*')) return true
    if (!permission) return true

    // Check exact match e.g. "reports.sales" or wildcard "reports.*"
    if (permissions.includes(permission)) return true
    const module = permission.split('.')[0]
    if (permissions.includes(`${module}.*`) || permissions.includes(`${module}.manage`)) return true

    return false
  }, [isAdmin, permissions])

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
