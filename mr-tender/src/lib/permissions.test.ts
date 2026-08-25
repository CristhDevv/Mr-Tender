import { describe, it, expect } from 'vitest'

function checkPermission(
  isAdmin: boolean,
  permissions: string[],
  role: string,
  requiredPermission: string
): boolean {
  if (isAdmin || permissions.includes('*') || role === 'admin' || role === 'superadmin') return true
  if (!requiredPermission) return true
  if (permissions.includes(requiredPermission)) return true
  const module = requiredPermission.split('.')[0]
  if (permissions.includes(`${module}.*`) || permissions.includes(`${module}.manage`)) return true
  return false
}

describe('Permissions Verification System', () => {
  it('should grant access to admin or owner role with wildcard', () => {
    expect(checkPermission(true, ['*'], 'admin', 'pos.view')).toBe(true)
    expect(checkPermission(false, ['*'], 'owner', 'accounting.view')).toBe(true)
    expect(checkPermission(false, ['pos.*'], 'admin', 'reports.sales')).toBe(true)
  })

  it('should grant access to specific cashier permissions', () => {
    const cashierPerms = ['pos.view', 'pos.create_sale', 'cash.view']
    expect(checkPermission(false, cashierPerms, 'cashier', 'pos.view')).toBe(true)
    expect(checkPermission(false, cashierPerms, 'cashier', 'pos.create_sale')).toBe(true)
    expect(checkPermission(false, cashierPerms, 'cashier', 'cash.view')).toBe(true)
  })

  it('should reject access to restricted modules when permission is absent', () => {
    const cashierPerms = ['pos.view', 'pos.create_sale', 'cash.view']
    expect(checkPermission(false, cashierPerms, 'cashier', 'accounting.view')).toBe(false)
    expect(checkPermission(false, cashierPerms, 'cashier', 'pos.edit_price')).toBe(false)
    expect(checkPermission(false, cashierPerms, 'cashier', 'employees.view')).toBe(false)
  })

  it('should support module-level wildcards', () => {
    const inventoryManagerPerms = ['inventory.*', 'products.*']
    expect(checkPermission(false, inventoryManagerPerms, 'manager', 'inventory.view')).toBe(true)
    expect(checkPermission(false, inventoryManagerPerms, 'manager', 'products.edit')).toBe(true)
    expect(checkPermission(false, inventoryManagerPerms, 'manager', 'accounting.view')).toBe(false)
  })
})
