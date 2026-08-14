'use client'

export default function EmployeesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Recursos Humanos</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Gestión de empleados, turnos y asistencias geolocalizadas</p>
      </div>

      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Registro de Personal</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
          Controla los horarios, las asistencias de entrada/salida y las comisiones de ventas de tus vendedores.
        </p>
        <button className="btn-neu btn-primary" style={{ padding: '10px 20px' }}>Registrar nuevo empleado</button>
      </div>
    </div>
  )
}
