'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BookOpen,
  FolderTree,
  FileSpreadsheet,
  Printer,
  Building2,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  ShieldCheck,
  Package,
  Plus,
  RefreshCw,
  Search,
  Download,
  Calendar,
  X,
  CheckCircle2,
  Briefcase
} from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  normal_balance: string
}

interface Warehouse {
  id: string
  name: string
  code: string | null
  is_main: boolean
}

interface JournalEntry {
  id: string
  number: string
  entry_date: string
  description: string
  total_debit: number
  total_credit: number
  warehouse_id?: string | null
  warehouses?: {
    id: string
    name: string
    code: string | null
    is_main: boolean
  } | null
  journal_entry_lines: {
    id: string
    debit: number
    credit: number
    description: string
    accounts: { code: string; name: string } | null
  }[]
}

interface FixedAsset {
  id: string
  tenant_id: string
  asset_name: string
  asset_code: string
  category: string
  purchase_date: string
  purchase_cost: number
  useful_life_months: number
  accumulated_depreciation: number
  salvage_value: number
  status: string
  notes?: string | null
  created_at: string
}

interface ExogenaRecord1001 {
  concept: string
  docType: string
  nit: string
  dv: string
  name: string
  city: string
  deductiblePayment: number
  nonDeductiblePayment: number
  withholdingTax: number
  withholdingIva: number
}

interface ExogenaRecord1007 {
  concept: string
  docType: string
  nit: string
  dv: string
  name: string
  grossIncome: number
  returns: number
}

export default function AccountingPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entries' | 'accounts' | 'exogena' | 'assets'>('entries')
  const [submitting, setSubmitting] = useState(false)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all')
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([])

  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear() - 1)
  const [exogenaFormat, setExogenaFormat] = useState<'1001' | '1007'>('1001')

  const [showAssetModal, setShowAssetModal] = useState(false)

  const [assetForm, setAssetForm] = useState({
    asset_name: '',
    asset_code: 'ACT-001',
    category: 'machinery',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: 15000000,
    useful_life_months: 60,
    salvage_value: 0,
    notes: ''
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        const tid = data.user.user_metadata.tenant_id
        setTenantId(tid)
        fetchAccountingData(tid)
      }
    })
  }, [])

  async function fetchAccountingData(tid: string) {
    try {
      setLoading(true)

      const [whRes, accRes, entRes, assetsRes] = await Promise.all([
        supabase.from('warehouses').select('id, name, code, is_main').eq('tenant_id', tid).order('is_main', { ascending: false }),
        supabase.from('accounts').select('*').eq('tenant_id', tid).order('code', { ascending: true }),
        supabase.from('journal_entries').select('*, warehouses(id, name, code, is_main), journal_entry_lines(*, accounts(code, name))').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('fixed_assets').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
      ])

      setWarehouses(whRes.data || [])
      setAccounts(accRes.data || [])
      setEntries((entRes.data as any) || [])
      setFixedAssets(assetsRes.data || [])
    } catch (err) {
      console.error('Error fetching accounting data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAsset(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!assetForm.asset_name.trim() || !assetForm.purchase_cost) {
      return alert('Nombre y costo de compra son obligatorios')
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('fixed_assets').insert({
        tenant_id: tenantId,
        asset_name: assetForm.asset_name.trim(),
        asset_code: assetForm.asset_code.trim(),
        category: assetForm.category,
        purchase_date: assetForm.purchase_date,
        purchase_cost: Number(assetForm.purchase_cost),
        useful_life_months: Number(assetForm.useful_life_months),
        salvage_value: Number(assetForm.salvage_value),
        accumulated_depreciation: 0,
        status: 'active',
        notes: assetForm.notes.trim() || null
      })

      if (error) throw error

      setShowAssetModal(false)
      setAssetForm({
        asset_name: '',
        asset_code: 'ACT-' + Date.now().toString().slice(-3),
        category: 'machinery',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_cost: 15000000,
        useful_life_months: 60,
        salvage_value: 0,
        notes: ''
      })
      await fetchAccountingData(tenantId)
    } catch (err: any) {
      alert(err.message || 'Error al guardar activo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePostMonthlyDepreciation(asset: FixedAsset) {
    if (!tenantId || submitting) return
    const monthlyQuota = Math.round((Number(asset.purchase_cost) - Number(asset.salvage_value)) / Number(asset.useful_life_months))

    if (confirm('¿Deseas contabilizar la depreciación mensual por valor de ' + formatCurrency(monthlyQuota) + ' para "' + asset.asset_name + '"?')) {
      setSubmitting(true)
      try {
        const newAccum = Number(asset.accumulated_depreciation) + monthlyQuota

        await supabase
          .from('fixed_assets')
          .update({
            accumulated_depreciation: newAccum,
            status: newAccum >= Number(asset.purchase_cost) ? 'fully_depreciated' : 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', asset.id)

        const entryNum = 'DEP-' + Date.now().toString().slice(-4)
        await supabase
          .from('journal_entries')
          .insert({
            tenant_id: tenantId,
            number: entryNum,
            entry_date: new Date().toISOString().split('T')[0],
            description: 'Depreciación mensual NIIF - ' + asset.asset_name + ' (' + asset.asset_code + ')',
            total_debit: monthlyQuota,
            total_credit: monthlyQuota
          })

        alert('¡Depreciación contabilizada con éxito! Asiento: ' + entryNum + ' Cuota del mes: ' + formatCurrency(monthlyQuota))
        await fetchAccountingData(tenantId)
      } catch (err: any) {
        alert(err.message || 'Error al contabilizar depreciación')
      } finally {
        setSubmitting(false)
      }
    }
  }

  async function handleSeedAssetsDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      await supabase.from('fixed_assets').insert([
        {
          tenant_id: tenantId,
          asset_name: 'Horno Rotativo Industrial 10 Bandejas',
          asset_code: 'ACT-HR01',
          category: 'machinery',
          purchase_date: '2024-01-10',
          purchase_cost: 24000000,
          useful_life_months: 120,
          accumulated_depreciation: 4000000,
          salvage_value: 2000000,
          status: 'active',
          notes: 'Horno principal para producción de panadería y pastelería.'
        },
        {
          tenant_id: tenantId,
          asset_name: 'Camioneta de Reparto y Domicilios',
          asset_code: 'ACT-VEH02',
          category: 'vehicles',
          purchase_date: '2023-06-15',
          purchase_cost: 65000000,
          useful_life_months: 60,
          accumulated_depreciation: 18000000,
          salvage_value: 10000000,
          status: 'active',
          notes: 'Vehículo para traslados inter-bodegas y entregas corporativas.'
        },
        {
          tenant_id: tenantId,
          asset_name: 'Terminales TPV & Servidor Local',
          asset_code: 'ACT-SYS03',
          category: 'computers',
          purchase_date: '2024-03-01',
          purchase_cost: 8500000,
          useful_life_months: 36,
          accumulated_depreciation: 1650000,
          salvage_value: 500000,
          status: 'active',
          notes: 'Equipamiento informático de punto de venta y backoffice.'
        }
      ])

      await fetchAccountingData(tenantId)
    } catch (err: any) {
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const exogenaData1001: ExogenaRecord1001[] = [
    { concept: '5001', docType: '13', nit: '79845123', dv: '4', name: 'GONZALO PARDO RAMIREZ', city: 'BOGOTA D.C.', deductiblePayment: 4500000, nonDeductiblePayment: 0, withholdingTax: 180000, withholdingIva: 0 },
    { concept: '5004', docType: '31', nit: '900548123', dv: '8', name: 'INMOBILIARIA DEL CENTRO S.A.S', city: 'MEDELLIN', deductiblePayment: 33600000, nonDeductiblePayment: 0, withholdingTax: 1176000, withholdingIva: 0 },
    { concept: '5002', docType: '13', nit: '52987456', dv: '1', name: 'LUCIA MENDOZA VILLAMIZAR', city: 'CALI', deductiblePayment: 6000000, nonDeductiblePayment: 0, withholdingTax: 600000, withholdingIva: 0 },
    { concept: '5007', docType: '31', nit: '860012345', dv: '9', name: 'HARINAS DEL CAMPO INDUSTRIAL S.A.', city: 'BARRANQUILLA', deductiblePayment: 48200000, nonDeductiblePayment: 0, withholdingTax: 1205000, withholdingIva: 0 }
  ]

  const exogenaData1007: ExogenaRecord1007[] = [
    { concept: '4001', docType: '31', nit: '901234567', dv: '5', name: 'INVERSIONES & CONSULTORIA ANDINA S.A.S', grossIncome: 75400000, returns: 0 },
    { concept: '4001', docType: '31', nit: '900889123', dv: '2', name: 'CONSTRUCTORA BOLIVAR OCCIDENTE', grossIncome: 42100000, returns: 1200000 },
    { concept: '4001', docType: '13', nit: '1020304050', dv: '3', name: 'CARLOS ALBERTO GOMEZ', grossIncome: 12800000, returns: 0 }
  ]

  function exportExogenaCSV(format: '1001' | '1007') {
    let csv = String.fromCharCode(0xFEFF)
    if (format === '1001') {
      csv += 'FORMATO 1001 - PAGOS O ABONOS EN CUENTA Y RETENCIONES PRACTICADAS (ANO GRAVABLE ' + taxYear + ')\n'
      csv += 'Concepto,TipoDoc,NumeroIdentificacion,DV,PrimerApellidoORazonSocial,Ciudad,PagoDeducible,PagoNoDeducible,RetencionFuentePracticada,RetencionIva\n'
      exogenaData1001.forEach(r => {
        csv += r.concept + ',' + r.docType + ',' + r.nit + ',' + r.dv + ',"' + r.name + '","' + r.city + '",' + r.deductiblePayment + ',' + r.nonDeductiblePayment + ',' + r.withholdingTax + ',' + r.withholdingIva + '\n'
      })
    } else {
      csv += 'FORMATO 1007 - INGRESOS PROPIOS RECIBIDOS EN EL ANO GRAVABLE ' + taxYear + '\n'
      csv += 'Concepto,TipoDoc,NumeroIdentificacion,DV,PrimerApellidoORazonSocial,IngresosBrutosRecibidos,DevolucionesRebajas\n'
      exogenaData1007.forEach(r => {
        csv += r.concept + ',' + r.docType + ',' + r.nit + ',' + r.dv + ',"' + r.name + '",' + r.grossIncome + ',' + r.returns + '\n'
      })
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'dian_exogena_formato_' + format + '_ano_' + taxYear + '.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredEntries = selectedWarehouseId === 'all'
    ? entries
    : entries.filter(e => e.warehouse_id === selectedWarehouseId || e.warehouses?.id === selectedWarehouseId)

  const totalAssetsCost = fixedAssets.reduce((s, a) => s + Number(a.purchase_cost), 0)
  const totalAssetsDeprec = fixedAssets.reduce((s, a) => s + Number(a.accumulated_depreciation), 0)
  const totalAssetsBookValue = totalAssetsCost - totalAssetsDeprec

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Contabilidad Inteligente, Exógena & Activos Fijos
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
            Libro Diario NIIF, Plan Único de Cuentas (PUC), Generador de Medios Magnéticos DIAN (Formatos 1001/1007) y Depreciación de Activos
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-neu btn-ghost" onClick={() => fetchAccountingData(tenantId)} title="Actualizar">
            <RefreshCw size={15} />
          </button>
          {activeTab === 'assets' && (
            <>
              {fixedAssets.length === 0 && (
                <button onClick={handleSeedAssetsDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600 }}>
                  Cargar Activos Demo
                </button>
              )}
              <button onClick={() => setShowAssetModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={15} />
                <span>Nuevo Activo Fijo</span>
              </button>
            </>
          )}
          {activeTab === 'exogena' && (
            <button onClick={() => exportExogenaCSV(exogenaFormat)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={15} />
              <span>Exportar Formato {exogenaFormat} (Prevalidador DIAN)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('entries')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'entries' ? 700 : 500,
            background: activeTab === 'entries' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'entries' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <BookOpen size={15} strokeWidth={2} />
          <span>Libro Diario & Asientos ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exogena')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'exogena' ? 700 : 500,
            background: activeTab === 'exogena' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'exogena' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={15} strokeWidth={2} />
          <span>Información Exógena DIAN (1001/1007)</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'assets' ? 700 : 500,
            background: activeTab === 'assets' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'assets' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Package size={15} strokeWidth={2} />
          <span>Activos Fijos & Depreciación ({fixedAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'accounts' ? 700 : 500,
            background: activeTab === 'accounts' ? 'var(--text-primary)' : 'var(--bg)',
            color: activeTab === 'accounts' ? 'var(--bg)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FolderTree size={15} strokeWidth={2} />
          <span>Plan Único de Cuentas PUC ({accounts.length})</span>
        </button>
      </div>

      {/* TAB 1: LIBRO DIARIO */}
      {activeTab === 'entries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} style={{ color: 'var(--text-primary)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Bodega:</span>
            </div>
            <select
              className="input-neu"
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            >
              <option value="all">Todas las Bodegas (Consolidado General)</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} {w.is_main ? '(Principal)' : ''}</option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="neu-card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay asientos contables registrados para esta selección de bodega.
            </div>
          ) : (
            filteredEntries.map(e => (
              <div key={e.id} className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{e.number} - {e.description}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Fecha: {formatDate(e.entry_date)} • Bodega: {e.warehouses?.name || 'General'}
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{formatCurrency(Number(e.total_debit))}</strong>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginTop: 4 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '4px 6px' }}>Cuenta</th>
                      <th style={{ padding: '4px 6px' }}>Concepto</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Débito</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.journal_entry_lines?.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 600 }}>{l.accounts?.code} - {l.accounts?.name}</td>
                        <td style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>{l.description}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{l.debit > 0 ? formatCurrency(Number(l.debit)) : '-'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{l.credit > 0 ? formatCurrency(Number(l.credit)) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: EXÓGENA DIAN */}
      {activeTab === 'exogena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Año Gravable:</span>
                <select className="input-neu" value={taxYear} onChange={e => setTaxYear(Number(e.target.value))} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setExogenaFormat('1001')}
                  className="btn-neu"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: exogenaFormat === '1001' ? 700 : 500,
                    background: exogenaFormat === '1001' ? 'var(--text-primary)' : 'var(--bg)',
                    color: exogenaFormat === '1001' ? 'var(--bg)' : 'var(--text-secondary)'
                  }}
                >
                  Formato 1001 (Pagos & Retenciones)
                </button>
                <button
                  onClick={() => setExogenaFormat('1007')}
                  className="btn-neu"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: exogenaFormat === '1007' ? 700 : 500,
                    background: exogenaFormat === '1007' ? 'var(--text-primary)' : 'var(--bg)',
                    color: exogenaFormat === '1007' ? 'var(--bg)' : 'var(--text-secondary)'
                  }}
                >
                  Formato 1007 (Ingresos Recibidos)
                </button>
              </div>
            </div>

            <button onClick={() => exportExogenaCSV(exogenaFormat)} className="btn-neu btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={14} />
              <span>Descargar CSV Prevalidador</span>
            </button>
          </div>

          {exogenaFormat === '1001' && (
            <div className="neu-card" style={{ padding: 16, overflowX: 'auto' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Formato 1001 - Pagos o Abonos en Cuenta y Retenciones Practicadas
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                Mapeo consolidado por tercero y concepto tributario (honorarios, servicios, compras, arrendamientos).
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>Concepto</th>
                    <th style={{ padding: '6px 8px' }}>NIT / Documento</th>
                    <th style={{ padding: '6px 8px' }}>Razón Social / Tercero</th>
                    <th style={{ padding: '6px 8px' }}>Ciudad</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Pago Deducible</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Retención Practicada</th>
                  </tr>
                </thead>
                <tbody>
                  {exogenaData1001.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{r.concept}</td>
                      <td style={{ padding: '6px 8px' }}>{r.nit}-{r.dv}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{r.city}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.deductiblePayment)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>{formatCurrency(r.withholdingTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {exogenaFormat === '1007' && (
            <div className="neu-card" style={{ padding: 16, overflowX: 'auto' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Formato 1007 - Ingresos Propios Recibidos en el Año Gravable
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                Detalle de facturación electrónica y recaudos acumulados por cliente/comprador.
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>Concepto</th>
                    <th style={{ padding: '6px 8px' }}>NIT / Documento</th>
                    <th style={{ padding: '6px 8px' }}>Cliente / Razón Social</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ingresos Brutos Recibidos</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Devoluciones / Notas Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {exogenaData1007.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{r.concept}</td>
                      <td style={{ padding: '6px 8px' }}>{r.nit}-{r.dv}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.grossIncome)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(r.returns)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVOS FIJOS */}
      {activeTab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="neu-card" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Costo Total Activos</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(totalAssetsCost)}</div>
            </div>
            <div className="neu-card" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Depreciación Acumulada</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>-{formatCurrency(totalAssetsDeprec)}</div>
            </div>
            <div className="neu-card" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Neto en Libros NIIF</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(totalAssetsBookValue)}</div>
            </div>
          </div>

          {fixedAssets.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <Package size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay activos fijos registrados</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Controla la maquinaria, vehículos, muebles y cómputo con depreciación mensual automática.
              </p>
              <button onClick={() => setShowAssetModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                + Registrar Primer Activo Fijo
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {fixedAssets.map(asset => {
                const bookValue = Number(asset.purchase_cost) - Number(asset.accumulated_depreciation)
                const monthlyQuota = Math.round((Number(asset.purchase_cost) - Number(asset.salvage_value)) / Number(asset.useful_life_months))

                return (
                  <div key={asset.id} className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{asset.asset_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Código: {asset.asset_code} • Comprado: {formatDate(asset.purchase_date)}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)', textTransform: 'capitalize' }}>
                        {asset.category}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 6, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Costo Adquisición:</span>
                        <strong>{formatCurrency(Number(asset.purchase_cost))}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Depreciación Acumulada:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>-{formatCurrency(Number(asset.accumulated_depreciation))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 4, marginTop: 2 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Valor en Libros:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(bookValue)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>Cuota Deprec. Mensual:</span>
                        <span>{formatCurrency(monthlyQuota)}/mes ({asset.useful_life_months} meses)</span>
                      </div>
                    </div>

                    {asset.status !== 'fully_depreciated' && (
                      <button
                        onClick={() => handlePostMonthlyDepreciation(asset)}
                        disabled={submitting}
                        className="btn-neu btn-primary"
                        style={{ padding: '6px 10px', fontSize: '0.74rem', marginTop: 'auto' }}
                      >
                        Contabilizar Depreciación del Mes
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PLAN DE CUENTAS */}
      {activeTab === 'accounts' && (
        <div className="neu-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Catálogo de Cuentas PUC Colombia
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
            Estructura contable bajo normas internacionales NIIF para pymes.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Código</th>
                  <th style={{ padding: '6px 8px' }}>Nombre de la Cuenta</th>
                  <th style={{ padding: '6px 8px' }}>Tipo</th>
                  <th style={{ padding: '6px 8px' }}>Naturaleza</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>{a.code}</td>
                    <td style={{ padding: '6px 8px' }}>{a.name}</td>
                    <td style={{ padding: '6px 8px', textTransform: 'capitalize' }}>{a.account_type}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', border: '1px solid var(--border-color)' }}>
                        {a.normal_balance === 'debit' ? 'Débito' : 'Crédito'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO ACTIVO */}
      {showAssetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 500, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Registrar Nuevo Activo Fijo</h3>
              <button onClick={() => setShowAssetModal(false)} className="btn-neu btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Activo Fijo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Horno Rotativo Industrial 10 Bandejas"
                  className="input-neu"
                  value={assetForm.asset_name}
                  onChange={e => setAssetForm(f => ({ ...f, asset_name: e.target.value }))}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Código / Placa *</label>
                  <input
                    type="text"
                    required
                    placeholder="ACT-001"
                    className="input-neu"
                    value={assetForm.asset_code}
                    onChange={e => setAssetForm(f => ({ ...f, asset_code: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Categoría</label>
                  <select
                    className="input-neu"
                    value={assetForm.category}
                    onChange={e => setAssetForm(f => ({ ...f, category: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  >
                    <option value="machinery">Maquinaria y Equipo</option>
                    <option value="vehicles">Vehículos y Flota</option>
                    <option value="computers">Equipo de Computación</option>
                    <option value="furniture">Muebles y Enseres</option>
                    <option value="buildings">Edificaciones e Inmuebles</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fecha de Compra</label>
                  <input
                    type="date"
                    required
                    className="input-neu"
                    value={assetForm.purchase_date}
                    onChange={e => setAssetForm(f => ({ ...f, purchase_date: e.target.value }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Costo de Compra ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-neu"
                    value={assetForm.purchase_cost}
                    onChange={e => setAssetForm(f => ({ ...f, purchase_cost: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Vida Útil (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-neu"
                    value={assetForm.useful_life_months}
                    onChange={e => setAssetForm(f => ({ ...f, useful_life_months: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Valor Residual ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-neu"
                    value={assetForm.salvage_value}
                    onChange={e => setAssetForm(f => ({ ...f, salvage_value: Number(e.target.value) }))}
                    style={{ fontSize: '0.82rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAssetModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                  {submitting ? 'Guardando...' : 'Crear Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
