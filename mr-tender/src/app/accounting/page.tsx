'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BookOpen,
  FolderTree,
  FileText,
  Layers,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Contabilidad y Libro Diario</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>Asientos contables automáticos por partida doble generados por POS y Compras</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('entries')}
          className={`btn-neu ${activeTab === 'entries' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={14} strokeWidth={2} />
          <span>Libro Diario</span>
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`btn-neu ${activeTab === 'accounts' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FolderTree size={14} strokeWidth={2} />
          <span>Catálogo de Cuentas</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando contabilidad...</div>
      ) : activeTab === 'accounts' ? (
        // CATÁLOGO DE CUENTAS (Responsive Card List)
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
          {entries.length === 0 ? (
            <div className="neu-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Aún no hay asientos contables registrados. Al procesar ventas en el POS o compras se generarán automáticamente.
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="neu-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--bg-deep)', paddingBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{entry.number}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: 8 }}>{entry.description}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(entry.entry_date || (entry as any).created_at)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {entry.journal_entry_lines?.map(line => (
                    <div key={line.id} className="neu-flat" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.accounts?.name || 'Cuenta'} ({line.accounts?.code})</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{line.description}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {line.debit > 0 ? (
                          <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>D: {formatCurrency(line.debit)}</span>
                        ) : (
                          <span style={{ fontWeight: 800, color: 'var(--accent-coral)' }}>H: {formatCurrency(line.credit)}</span>
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
