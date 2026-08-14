'use client'

export default function EcommercePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mi Tienda Online</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configuración del e-commerce y pedidos en línea</p>
      </div>

      <div className="neu-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌐</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Configuración de E-commerce</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
          Personaliza tu subdominio, colores de marca y logo para que tus clientes puedan comprar directamente.
        </p>
        <button className="btn-neu btn-primary" style={{ padding: '10px 20px' }}>Ver pedidos del e-commerce</button>
      </div>
    </div>
  )
}
