import { getModuleById, getMissingDependencies, ALL_SYSTEM_MODULES } from './constants/modules'

/**
 * Validador de dependencias de módulos en el servidor
 * Previene activaciones inválidas o inconsistentes a nivel de API / Base de Datos.
 */

export interface ModuleValidationResult {
  valid: boolean
  missingDependencies: Record<string, string[]>
  errors: string[]
}

/**
 * Valida un mapa completo de módulos activados contra el Grafo de Dependencias (DAG)
 */
export function validateTenantModules(enabledModules: Record<string, boolean>): ModuleValidationResult {
  const missingMap: Record<string, string[]> = {}
  const errors: string[] = []

  for (const [moduleId, isEnabled] of Object.entries(enabledModules)) {
    if (!isEnabled) continue

    const missing = getMissingDependencies(moduleId, enabledModules)
    if (missing.length > 0) {
      const modName = getModuleById(moduleId)?.name || moduleId
      const missingNames = missing.map(id => getModuleById(id)?.name || id)
      missingMap[moduleId] = missing
      errors.push(`El módulo "${modName}" requiere que los siguientes módulos estén activos: ${missingNames.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    missingDependencies: missingMap,
    errors
  }
}

/**
 * Verifica si un módulo específico puede operar dado el estado actual de módulos del tenant
 */
export function assertModuleOperable(moduleId: string, enabledModules: Record<string, boolean>): { operable: boolean; reason?: string } {
  if (!enabledModules[moduleId]) {
    const modName = getModuleById(moduleId)?.name || moduleId
    return {
      operable: false,
      reason: `El módulo "${modName}" no está activo para este comercio.`
    }
  }

  const missing = getMissingDependencies(moduleId, enabledModules)
  if (missing.length > 0) {
    const missingNames = missing.map(id => getModuleById(id)?.name || id).join(', ')
    return {
      operable: false,
      reason: `Faltan prerrequisitos activos: ${missingNames}`
    }
  }

  return { operable: true }
}
