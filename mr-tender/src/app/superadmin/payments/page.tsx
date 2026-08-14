'use client'

export default function PaymentsAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Historial de Pagos</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Registro de cobros recibidos de los tenants</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>💰</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Transacciones Registradas</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Monitorea los pagos procesados a través de Stripe o pasarelas de pago integradas.
        </p>
      </div>
    </div>
  )
}
