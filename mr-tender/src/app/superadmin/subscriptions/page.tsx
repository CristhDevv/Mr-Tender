'use client'

export default function SubscriptionsAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Suscripciones Activas</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Estado de suscripción recurrente de inquilinos</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>💳</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Control de Suscripciones</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Visualiza el historial de cobros automáticos, estados pendientes y renovaciones de los clientes.
        </p>
      </div>
    </div>
  )
}
