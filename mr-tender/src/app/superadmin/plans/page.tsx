'use client'

export default function PlansAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Planes de Suscripción</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configuración de tarifas, límites de usuarios y facturación</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Planes de Servicio</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Modifica los planes Gratis, Básico, Profesional y Empresarial con sus correspondientes límites.
        </p>
      </div>
    </div>
  )
}
