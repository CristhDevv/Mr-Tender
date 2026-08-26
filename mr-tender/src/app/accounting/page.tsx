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
  Filter
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

export default function AccountingPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entries' | 'accounts'>('entries')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        fetchAccountingData(data.user.user_metadata.tenant_id)
      }
    })
  }, [])

  async function fetchAccountingData(tid: string) {
    try {
      setLoading(true)

      // 1. Fetch Warehouses
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, name, code, is_main')
        .eq('tenant_id', tid)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true })

      setWarehouses(whData || [])

      // 2. Fetch Accounts
      const { data: accData } = await supabase
        .from('accounts')
        .select('*')
        .eq('tenant_id', tid)
        .order('code', { ascending: true })

      // 3. Fetch Journal Entries with lines, accounts, and linked warehouse
      const { data: entData } = await supabase
        .from('journal_entries')
        .select(`
          *,
          warehouses (
            id,
            name,
            code,
            is_main
          ),
          journal_entry_lines (
            id,
            debit,
            credit,
            description,
            accounts (
              code,
              name
            )
          )
        `)
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      setAccounts(accData || [])
      setEntries((entData as any) || [])
    } catch (err) {
      console.error('Error fetching accounting data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter entries according to selected warehouse
  const filteredEntries = selectedWarehouseId === 'all'
    ? entries
    : entries.filter(e => e.warehouse_id === selectedWarehouseId || e.warehouses?.id === selectedWarehouseId)

  // Calculations for current selection
  const totalDebits = filteredEntries.reduce((s, e) => s + (Number(e.total_debit) || 0), 0)
  const totalCredits = filteredEntries.reduce((s, e) => s + (Number(e.total_credit) || 0), 0)
  const activeWhObj = warehouses.find(w => w.id === selectedWarehouseId)

  function exportAccountingExcel() {
    if (filteredEntries.length === 0) {
      alert('No hay asientos contables para exportar en la bodega seleccionada.')
      return
    }

    const whLabel = selectedWarehouseId === 'all' ? 'CONSOLIDADO - TODAS LAS BODEGAS' : activeWhObj?.name || 'BODEGA'
    let csvContent = '\uFEFF'
    csvContent += `LIBRO DIARIO Y CONTABILIDAD - MR TENDER (${whLabel})\n`
    csvContent += `Fecha de Exportación: ${new Date().toLocaleString('es-CO')}\n\n`
    csvContent += 'Asiento,Fecha,Bodega,Descripcion,CuentaCodigo,CuentaNombre,Debito,Credito\n'

    filteredEntries.forEach(e => {
      const date = formatDate(e.entry_date)
      const desc = (e.description || '').replace(/,/g, ' ')
      const whName = e.warehouses?.name || (selectedWarehouseId === 'all' ? 'General / No asignada' : whLabel)
      e.journal_entry_lines?.forEach(line => {
        const code = line.accounts?.code || 'N/A'
        const accName = (line.accounts?.name || 'Cuenta').replace(/,/g, ' ')
        csvContent += `${e.number},${date},${whName},${desc},${code},${accName},${line.debit || 0},${line.credit || 0}\n`
      })
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `contabilidad_${selectedWarehouseId === 'all' ? 'consolidado' : 'bodega'}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Contabilidad y Libro Diario</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>Asientos contables automáticos por partida doble segmentados por bodega</p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-neu" onClick={exportAccountingExcel} style={{ padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={15} style={{ color: 'var(--accent-green)' }} />
            <span>Excel {selectedWarehouseId !== 'all' ? `(${activeWhObj?.name})` : ''}</span>
          </button>
          <button className="btn-neu btn-primary" onClick={() => window.print()} style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* ── WAREHOUSE SELECTOR BAR ── */}
      <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Filtrar contabilidad por bodega:
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSelectedWarehouseId('all')}
            className={`btn-neu ${selectedWarehouseId === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}
          >
            Consolidado ({entries.length})
          </button>

          {warehouses.map(wh => {
            const count = entries.filter(e => e.warehouse_id === wh.id || e.warehouses?.id === wh.id).length
            const isSelected = selectedWarehouseId === wh.id
            return (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouseId(wh.id)}
                className={`btn-neu ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <span>{wh.name} {wh.is_main ? '(Principal)' : ''}</span>
                <span style={{ opacity: 0.8, fontSize: '0.68rem' }}>({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── KPI METRICS CARDS FOR CURRENT SELECTION ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Débitos ({selectedWarehouseId === 'all' ? 'Todas' : activeWhObj?.name})
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {formatCurrency(totalDebits)}
          </span>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Créditos ({selectedWarehouseId === 'all' ? 'Todas' : activeWhObj?.name})
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {formatCurrency(totalCredits)}
          </span>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Asientos Registrados
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {filteredEntries.length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('entries')}
          className={`btn-neu ${activeTab === 'entries' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={14} strokeWidth={2} />
          <span>Libro Diario ({filteredEntries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`btn-neu ${activeTab === 'accounts' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FolderTree size={14} strokeWidth={2} />
          <span>Catálogo de Cuentas ({accounts.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando contabilidad...</div>
      ) : activeTab === 'accounts' ? (
        // CATÁLOGO DE CUENTAS
        <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {accounts.map(acc => (
            <div key={acc.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 800 }}>{acc.code}</code>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{acc.account_type}</div>
              </div>
              <span className={`badge ${acc.normal_balance === 'debit' ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: '0.65rem' }}>
                {acc.normal_balance === 'debit' ? 'Deudora (D)' : 'Acreedora (A)'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        // LIBRO DIARIO
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredEntries.length === 0 ? (
            <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {selectedWarehouseId === 'all'
                ? 'Aún no hay asientos contables registrados. Al procesar ventas en el POS o compras se generarán automáticamente.'
                : `No hay asientos contables registrados para ${activeWhObj?.name || 'esta bodega'}.`}
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className="neu-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--bg-deep)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{entry.number}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{entry.description}</span>
                    {entry.warehouses && (
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Building2 size={11} />
                        <span>{entry.warehouses.name}</span>
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(entry.entry_date || (entry as any).created_at)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {entry.journal_entry_lines?.map(line => (
                    <div key={line.id} className="neu-flat" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{line.accounts?.name || 'Cuenta'}</span>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>{line.accounts?.code}</code>
                      </div>
                      <div style={{ display: 'flex', gap: 16, textAlign: 'right', flexShrink: 0 }}>
                        {Number(line.debit) > 0 ? (
                          <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>D: {formatCurrency(line.debit)}</span>
                        ) : (
                          <span style={{ color: 'var(--accent-purple)', fontWeight: 800 }}>H: {formatCurrency(line.credit)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
