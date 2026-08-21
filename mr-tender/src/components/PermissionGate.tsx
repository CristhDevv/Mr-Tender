'use client'
import React from 'react'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface PermissionGateProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions()

  if (loading) return null

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
