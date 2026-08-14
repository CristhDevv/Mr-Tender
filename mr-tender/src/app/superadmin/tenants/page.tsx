'use client'

export default function TenantsAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Gestión de Negocios (Tenants)</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Administración de instancias activas de clientes</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏪</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Instancias de Negocio</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Desde aquí puedes suspender, habilitar o crear bases de datos para nuevos inquilinos en Supabase.
        </p>
      </div>
    </div>
  )
}
