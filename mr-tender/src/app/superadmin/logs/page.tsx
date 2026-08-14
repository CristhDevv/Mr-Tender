'use client'

export default function LogsAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Logs de Auditoría</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Registro de seguridad y trazabilidad de acciones</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Trazabilidad del Sistema</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Audita los accesos, llamadas de API críticas y cambios de configuraciones a nivel global.
        </p>
      </div>
    </div>
  )
}
