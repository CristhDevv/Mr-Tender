'use client'

export default function SupportAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Tickets de Soporte</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Atención al cliente y comunicación con administradores</p>
      </div>
      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎧</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Soporte Técnico</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Resuelve dudas, reportes de fallas y solicitudes de asistencia enviadas por los inquilinos.
        </p>
      </div>
    </div>
  )
}
