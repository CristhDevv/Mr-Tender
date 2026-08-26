import { describe, it, expect } from 'vitest'
import {
  ALL_SYSTEM_MODULES,
  getModuleById,
  getMissingDependencies,
  getDependents,
  resolveModuleToggle,
  getDefaultModulesForBusinessType
} from './constants/modules'

describe('Module Dependency Graph (DAG) & Integrity', () => {
  it('should have all 25 system modules registered', () => {
    expect(ALL_SYSTEM_MODULES.length).toBe(25)
  })

  it('should have valid requires references for every module', () => {
    ALL_SYSTEM_MODULES.forEach(mod => {
      if (mod.requires) {
        mod.requires.forEach(reqId => {
          const reqMod = getModuleById(reqId)
          expect(reqMod, `Module "${mod.id}" requires non-existent module "${reqId}"`).toBeDefined()
        })
      }
    })
  })

  it('should detect missing dependencies when an enabled module lacks prerequisites', () => {
    const enabledModules: Record<string, boolean> = {
      payroll: true,
      employees: false,
    }

    const missing = getMissingDependencies('payroll', enabledModules)
    expect(missing).toEqual(['employees'])
  })

  it('should auto-enable required dependencies recursively when activating a module', () => {
    const initialModules: Record<string, boolean> = {
      inventory: false,
      purchases: false,
      suppliers: false,
      pharmacy: false,
    }

    const result = resolveModuleToggle('pharmacy', true, initialModules)
    expect(result.updatedModules.pharmacy).toBe(true)
    expect(result.updatedModules.inventory).toBe(true)
    expect(result.updatedModules.purchases).toBe(true)
    expect(result.updatedModules.suppliers).toBe(true)
    expect(result.blockedBy).toEqual([])
    expect(result.autoEnabled).toContain('inventory')
    expect(result.autoEnabled).toContain('purchases')
    expect(result.autoEnabled).toContain('suppliers')
  })

  it('should block deactivation of a module if active modules depend on it', () => {
    const activeModules: Record<string, boolean> = {
      employees: true,
      payroll: true,
      pos: true,
      inventory: true
    }

    const result = resolveModuleToggle('employees', false, activeModules)
    expect(result.blockedBy).toContain('payroll')
    expect(result.updatedModules.employees).toBe(true) // Not deactivated because blocked
  })

  it('should allow deactivation when no active modules depend on it', () => {
    const activeModules: Record<string, boolean> = {
      employees: true,
      payroll: false,
      pos: true,
      inventory: true
    }

    const result = resolveModuleToggle('employees', false, activeModules)
    expect(result.blockedBy).toEqual([])
    expect(result.updatedModules.employees).toBe(false)
  })

  it('should correctly configure default modules for business types including prerequisites', () => {
    const restaurantMods = getDefaultModulesForBusinessType('restaurant')
    expect(restaurantMods.restaurant).toBe(true)
    expect(restaurantMods.inventory).toBe(true)
    expect(restaurantMods.pos).toBe(true)

    const pharmacyMods = getDefaultModulesForBusinessType('pharmacy')
    expect(pharmacyMods.pharmacy).toBe(true)
    expect(pharmacyMods.purchases).toBe(true)
    expect(pharmacyMods.suppliers).toBe(true)
    expect(pharmacyMods.inventory).toBe(true)
  })
})
