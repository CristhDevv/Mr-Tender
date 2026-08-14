'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
}

interface JournalEntry {
  id: string;
  number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  journal_entry_lines: {
    id: string;
    debit: number;
    credit: number;
    description: string;
    accounts: { code: string; name: string } | null;
  }[];
}

export default function AccountingPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
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

      // Fetch Accounts
      const { data: accData } = await supabase
        .from('accounts')
        .select('*')
        .eq('tenant_id', tid)
        .order('code', { ascending: true })

      // Fetch Journal Entries with lines and accounts
      const { data: entData } = await supabase
        .from('journal_entries')
        .select(`
          *,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Contabilidad y Libro Diario</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Asientos contables automáticos por partida doble generados por el POS y Compras</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => setActiveTab('entries')}
          className={`btn-neu ${activeTab === 'entries' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '10px 20px', fontSize: '0.85rem' }}
        >
          📖 Libro Diario
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`btn-neu ${activeTab === 'accounts' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '10px 20px', fontSize: '0.85rem' }}
        >
          📂 Catálogo de Cuentas
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando contabilidad...</div>
      ) : activeTab === 'accounts' ? (
        // CATÁLOGO DE CUENTAS
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Código</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Nombre de Cuenta</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Tipo de Cuenta</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Naturaleza</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-blue)' }}>{acc.code}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{acc.name}</td>
                  <td style={{ padding: '16px 20px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{acc.account_type}</td>
                  <td style={{ padding: '16px 20px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: acc.normal_balance === 'debit' ? 'var(--accent-emerald)' : 'var(--accent-purple)' }}>
                    {acc.normal_balance === 'debit' ? 'Deudora (D)' : 'Acreedora (A)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // LIBRO DIARIO
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {entries.length === 0 ? (
            <div className="neu-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aún no hay asientos contables registrados. Procesa una venta en el POS o registra una compra en la pestaña de Compras para ver el registro contable automático.
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{entry.number}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 12 }}>{entry.description}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(entry.entry_date || (entry as any).created_at)}</span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', marginTop: 8 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Cuenta</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Descripción de Línea</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Debe</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.journal_entry_lines?.map(line => (
                      <tr key={line.id} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontFamily: 'monospace', marginRight: 8, color: 'var(--accent-blue)' }}>
                            {line.accounts?.code}
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{line.accounts?.name}</strong>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{line.description}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: line.debit > 0 ? 700 : 400, color: line.debit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: line.credit > 0 ? 700 : 400, color: line.credit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Sumas Iguales */}
                    <tr style={{ background: 'var(--bg-deep)' }}>
                      <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>Sumas Iguales:</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatCurrency(entry.total_debit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatCurrency(entry.total_credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
