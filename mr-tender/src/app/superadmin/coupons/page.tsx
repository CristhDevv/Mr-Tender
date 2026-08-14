'use client'

export default function CouponsAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Cupones de Descuento</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Gestión de promociones y descuentos de la plataforma</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏷</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Códigos Promocionales</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Crea cupones de descuento aplicables al onboarding o renovación de planes de los clientes.
        </p>
      </div>
    </div>
  )
}
