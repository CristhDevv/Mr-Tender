import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Invocación Directa de Route Handlers Reales de Next.js ──
import { POST as handleCreditNote } from '../app/api/dian/credit-note/route'
import { GET as handleDownloadInvoice } from '../app/api/dian/download/[id]/route'
import { POST as handleEmitInvoice } from '../app/api/dian/emit/route'
import { POST as handleCopilot } from '../app/api/ai/copilot/route'
import { POST as handleCreatePaymentLink } from '../app/api/payments/create-link/route'
import { POST as handlePayrollEmit } from '../app/api/dian/payroll/emit/route'
import { POST as handleSupportDocEmit } from '../app/api/dian/support-doc/emit/route'

// Estado del contexto de autenticación y espía de queries para pruebas E2E de Route Handlers
let mockAuthUser: any = null
let capturedQueries: Array<{ table: string; method: string; filters: Record<string, any>; updates?: any }> = []

// Base de datos simulada multi-tenant para contrastar respuestas de PostgreSQL
const dbStore = {
  invoices: [
    {
      id: 'inv-alpha-001',
      tenant_id: 'tenant-alpha-001',
      number: 'SETP-100',
      total: 50000,
      subtotal: 50000,
      tax_amount: 0,
      signed_xml: '<InvoiceAlpha/>',
      issued_at: '2026-08-20T10:00:00Z',
      dian_environment: '2',
      customer_tax_data: { id: '900111222', name: 'Cliente Alpha' }
    },
    {
      id: 'inv-beta-999',
      tenant_id: 'tenant-beta-002',
      number: 'SETP-999',
      total: 180000,
      subtotal: 180000,
      tax_amount: 0,
      signed_xml: '<InvoiceBetaVictim/>',
      issued_at: '2026-08-20T10:00:00Z',
      dian_environment: '2',
      customer_tax_data: { id: '900333444', name: 'Cliente Beta Víctima' }
    }
  ],
  tenant_settings: [
    {
      tenant_id: 'tenant-alpha-001',
      business_name: 'Droguería Alpha',
      tax_id: '900111222',
      phone: '3001111111',
      dian_resolution: '18760000001',
      dian_prefix: 'SETP',
      dian_from: 1,
      dian_to: 50000
    }
  ],
  dian_resolutions: [
    {
      id: 'res-alpha-1',
      tenant_id: 'tenant-alpha-001',
      resolution_number: '18760000001',
      prefix: 'SETP',
      from_number: 1,
      to_number: 50000,
      current_number: 100,
      valid_from: '2026-01-01',
      valid_to: '2027-12-31',
      technical_key: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
      environment: '2',
      is_active: true
    },
    {
      id: 'res-beta-2',
      tenant_id: 'tenant-beta-002',
      resolution_number: '18760000002',
      prefix: 'SETP',
      from_number: 1,
      to_number: 50000,
      current_number: 500,
      valid_from: '2026-01-01',
      valid_to: '2027-12-31',
      technical_key: '998eac422eba16e22ffd8c6f94b3f40a6e381160999',
      environment: '2',
      is_active: true
    }
  ],
  payroll_settlements: [
    {
      id: 'settlement-alpha-1',
      tenant_id: 'tenant-alpha-001',
      employee_name: 'Juan Perez',
      document_number: '10101010',
      period_start: '2026-08-01',
      period_end: '2026-08-15',
      base_salary: 1500000,
      payroll_contracts: { email: 'juan@alpha.com', bank_name: 'Bancolombia' }
    }
  ]
}

// Mock del cliente Supabase del servidor para interceptar las llamadas del backend real
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockAuthUser },
        error: mockAuthUser ? null : { message: 'Auth session missing' }
      }))
    },
    from: (tableName: string) => {
      const currentFilters: Record<string, any> = {}

      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: any) => {
          currentFilters[column] = value
          return builder
        }),
        gte: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        or: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        single: vi.fn(async () => {
          capturedQueries.push({ table: tableName, method: 'single', filters: { ...currentFilters } })
          const tableData = (dbStore as any)[tableName] || []
          const found = tableData.find((row: any) => {
            return Object.entries(currentFilters).every(([col, val]) => row[col] === val)
          })
          if (!found) return { data: null, error: { message: 'Row not found' } }
          return { data: found, error: null }
        }),
        maybeSingle: vi.fn(async () => {
          capturedQueries.push({ table: tableName, method: 'maybeSingle', filters: { ...currentFilters } })
          const tableData = (dbStore as any)[tableName] || []
          const found = tableData.find((row: any) => {
            return Object.entries(currentFilters).every(([col, val]) => row[col] === val)
          })
          return { data: found || null, error: null }
        }),
        insert: vi.fn((payload: any) => {
          capturedQueries.push({ table: tableName, method: 'insert', filters: { ...currentFilters }, updates: payload })
          const record = Array.isArray(payload) ? payload[0] : payload
          const created = { ...record, id: 'gen-' + Date.now() }
          return {
            select: () => ({
              single: async () => ({ data: created, error: null })
            })
          }
        }),
        update: vi.fn((updates: any) => {
          const updateFilters: Record<string, any> = { ...currentFilters }
          const queryRecord = { table: tableName, method: 'update', filters: updateFilters, updates }
          capturedQueries.push(queryRecord)

          const updateBuilder: any = {
            eq: vi.fn((column: string, value: any) => {
              updateFilters[column] = value
              return updateBuilder
            })
          }
          return updateBuilder
        }),
        upsert: vi.fn(async () => ({ error: null }))
      }

      return builder
    }
  }))
}))

// Mock de servicios DIAN externos
vi.mock('@/lib/dian/dian-client', () => ({
  dianClient: {
    sendDocument: vi.fn(async () => ({
      status: 'validated',
      statusMessage: 'Documento validado exitosamente por la DIAN',
      trackId: 'track-12345'
    }))
  }
}))

describe('Auditoría E2E: Remediación Crítica de Aislamiento Multi-Tenant en Route Handlers', () => {
  beforeEach(() => {
    capturedQueries = []
    mockAuthUser = null
    vi.clearAllMocks()
  })

  // ── PRIORIDAD 0: ATAQUE DE SUPLANTACIÓN VÍA USER_METADATA ──

  it('[Prioridad 0] Ataque IDOR/Spoofing: Si un atacante altera user_metadata.tenant_id en el cliente, el backend DEBE ignorarlo y usar app_metadata.tenant_id', async () => {
    // Simulación adversarial:
    // El usuario legítimamente pertenece a 'tenant-alpha-001' (en app_metadata, inmutable).
    // El atacante ejecutó `supabase.auth.updateUser({ data: { tenant_id: 'tenant-beta-002' } })` en el navegador.
    mockAuthUser = {
      id: 'usr-attacker-alpha',
      email: 'attacker@alpha.com',
      app_metadata: {
        tenant_id: 'tenant-alpha-001', // Asignado de forma segura por el backend
        role: 'admin'
      },
      user_metadata: {
        tenant_id: 'tenant-beta-002', // ⚠️ Manipulado maliciosamente en el cliente
        role: 'owner',
        full_name: 'Atacante Alpha'
      }
    }

    // El atacante intenta anular una factura ('inv-beta-999') que pertenece a Tenant Beta
    const req = new NextRequest('http://localhost:3000/api/dian/credit-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: 'inv-beta-999',
        discrepancyCode: '2',
        reason: 'Ataque de cancelación no autorizada'
      })
    })

    const response = await handleCreditNote(req)
    const json = await response.json()

    // 1. Debe retornar 404 (Factura no encontrada o no pertenece a este comercio)
    expect(response.status).toBe(404)
    expect(json.error).toContain('Factura no encontrada o no pertenece a este comercio')

    // 2. Comprobar que la query del backend fue forzada con app_metadata ('tenant-alpha-001') y NUNCA con user_metadata
    const invoiceQuery = capturedQueries.find(q => q.table === 'invoices' && q.filters.id === 'inv-beta-999')
    expect(invoiceQuery).toBeDefined()
    expect(invoiceQuery?.filters.tenant_id).toBe('tenant-alpha-001')
    expect(invoiceQuery?.filters.tenant_id).not.toBe('tenant-beta-002')
  })

  it('[Prioridad 0] Descarga de XML: Bloquea acceso cruzado a documentos tributarios ignorando user_metadata alterado', async () => {
    mockAuthUser = {
      id: 'usr-attacker-alpha',
      email: 'attacker@alpha.com',
      app_metadata: { tenant_id: 'tenant-alpha-001', role: 'admin' },
      user_metadata: { tenant_id: 'tenant-beta-002' } // Spoofed
    }

    const req = new NextRequest('http://localhost:3000/api/dian/download/inv-beta-999?format=xml')
    const response = await handleDownloadInvoice(req, { params: Promise.resolve({ id: 'inv-beta-999' }) })

    expect(response.status).toBe(404)
    const downloadQuery = capturedQueries.find(q => q.table === 'invoices' && q.filters.id === 'inv-beta-999')
    expect(downloadQuery?.filters.tenant_id).toBe('tenant-alpha-001')
  })

  // ── PRIORIDAD 1: VALORES FALSY / AUSENTES EN TENANT_ID ──

  it('[Prioridad 1] Rechazo estricto ante tenant_id vacío, null o ausente en app_metadata (Sin ejecutar queries abiertas)', async () => {
    const falsyContexts = [
      { app_metadata: { tenant_id: '' } },
      { app_metadata: { tenant_id: null } },
      { app_metadata: {} }, // undefined
      { app_metadata: { tenant_id: '   ' } } // whitespace
    ]

    for (const context of falsyContexts) {
      capturedQueries = []
      mockAuthUser = {
        id: 'usr-corrupted-session',
        email: 'user@nowhere.com',
        app_metadata: context.app_metadata,
        user_metadata: { tenant_id: 'tenant-victim-spoofed' }
      }

      // Probar en /api/dian/credit-note
      const req = new NextRequest('http://localhost:3000/api/dian/credit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: 'inv-123', discrepancyCode: '2', reason: 'Test' })
      })

      const res = await handleCreditNote(req)
      expect(res.status, `Falló al rechazar contexto falsy: ${JSON.stringify(context)}`).toBe(403)

      const json = await res.json()
      expect(json.error).toContain('Acceso denegado')

      // Verificar que NINGUNA query a tablas de datos fue ejecutada
      expect(capturedQueries.length).toBe(0)
    }
  })

  it('[Prioridad 1] Copilot AI rechaza inmediatamente sesiones con tenant falsy sin evaluar herramientas', async () => {
    mockAuthUser = {
      id: 'usr-no-tenant',
      email: 'employee@test.com',
      app_metadata: { tenant_id: null },
      user_metadata: {}
    }

    const req = new NextRequest('http://localhost:3000/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '¿Cuáles son las ventas del día?' })
    })

    const res = await handleCopilot(req)
    expect(res.status).toBe(403)
  })

  // ── PRIORIDAD 2: AISLAMIENTO FISCAL DE FOLIOS Y RESOLUCIONES DIAN ──

  it('[Prioridad 2] Integridad Fiscal: La actualización del consecutivo en dian_resolutions debe incluir .eq("tenant_id", tenantId)', async () => {
    mockAuthUser = {
      id: 'usr-alpha-owner',
      email: 'owner@alpha.com',
      app_metadata: { tenant_id: 'tenant-alpha-001', role: 'owner' },
      user_metadata: { full_name: 'Droguería Alpha' }
    }

    const req = new NextRequest('http://localhost:3000/api/dian/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customCustomer: { id: '222222222222', name: 'Cliente Final' },
        customItems: [{ id: '1', name: 'Medicamento A', quantity: 1, unitPrice: 10000, taxRate: 19 }]
      })
    })

    const res = await handleEmitInvoice(req)
    expect(res.status).toBe(200)

    // Verificar la consulta UPDATE en dian_resolutions
    const updateResolutionQuery = capturedQueries.find(q => q.table === 'dian_resolutions' && q.method === 'update')
    expect(updateResolutionQuery).toBeDefined()
    expect(updateResolutionQuery?.filters.id).toBe('res-alpha-1')
    // DEFENSA CRÍTICA: Debe tener tenant_id = tenant-alpha-001 para que jamás pueda alterar la resolución de Tenant Beta
    expect(updateResolutionQuery?.filters.tenant_id).toBe('tenant-alpha-001')
  })

  it('[Prioridad 2] Nómina Electrónica: La actualización de payroll_settlements está estrictamente aislada por tenant_id', async () => {
    mockAuthUser = {
      id: 'usr-alpha-owner',
      email: 'owner@alpha.com',
      app_metadata: { tenant_id: 'tenant-alpha-001', role: 'owner' },
      user_metadata: {}
    }

    const req = new NextRequest('http://localhost:3000/api/dian/payroll/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId: 'settlement-alpha-1' })
    })

    const res = await handlePayrollEmit(req)
    expect(res.status).toBe(200)

    const updatePayrollQuery = capturedQueries.find(q => q.table === 'payroll_settlements' && q.method === 'update')
    expect(updatePayrollQuery).toBeDefined()
    expect(updatePayrollQuery?.filters.id).toBe('settlement-alpha-1')
    expect(updatePayrollQuery?.filters.tenant_id).toBe('tenant-alpha-001')
  })

  // ── PRIORIDAD 0 & 1: RUTAS ADICIONALES (PAYMENTS & SUPPORT DOC) ──

  it('[Prioridad 0 & 1] Link de Pagos y Documento Soporte validan estrictamente app_metadata', async () => {
    mockAuthUser = {
      id: 'usr-alpha-user',
      email: 'user@alpha.com',
      app_metadata: { tenant_id: 'tenant-alpha-001' },
      user_metadata: {}
    }

    const payReq = new NextRequest('http://localhost:3000/api/payments/create-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50000, reference: 'REF-001' })
    })
    const payRes = await handleCreatePaymentLink(payReq)
    expect(payRes.status).toBe(200)

    const supDocReq = new NextRequest('http://localhost:3000/api/dian/support-doc/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Proveedor Local',
        supplierDocNumber: '800123456',
        subtotal: 100000,
        description: 'Servicio de mantenimiento'
      })
    })
    const supDocRes = await handleSupportDocEmit(supDocReq)
    expect(supDocRes.status).toBe(200)
    const supDocInsert = capturedQueries.find(q => q.table === 'support_documents' && q.method === 'insert')
    expect(supDocInsert?.updates.tenant_id).toBe('tenant-alpha-001')
  })
})
