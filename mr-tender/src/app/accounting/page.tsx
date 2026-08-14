'use client'
import { formatCurrency } from '@/lib/utils'

export default function AccountingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Contabilidad y Finanzas</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Libro diario y asientos automáticos del ERP</p>
      </div>

      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📒</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Libro Diario Contable</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
          Los asientos contables se registran automáticamente en Supabase al procesar ventas, compras o egresos.
        </p>
        <button className="btn-neu btn-primary" style={{ padding: '10px 20px' }}>Ver catálogo de cuentas</button>
      </div>
    </div>
  )
}
