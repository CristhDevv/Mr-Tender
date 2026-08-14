import Link from 'next/link'

const features = [
  { icon: '⚡', title: 'POS Ultra Rápido', desc: 'Completa una venta en 3 toques. Escaneo de código de barras, múltiples formas de pago y ticket digital.' },
  { icon: '📦', title: 'Inventario en Tiempo Real', desc: 'Multi-almacén, alertas de stock bajo, transferencias y Kardex completo automático.' },
  { icon: '👥', title: 'CRM Integrado', desc: 'Directorio de clientes, historial de compras, programa de puntos y créditos con estado de cuenta.' },
  { icon: '📊', title: 'Reportes Inteligentes', desc: 'KPIs en vivo, gráficas interactivas, exportación a PDF y Excel. Decisiones con datos reales.' },
  { icon: '🧾', title: 'Facturación Electrónica', desc: 'CFDI México, DIAN Colombia, SUNAT Perú. Timbrado y envío automático al cliente.' },
  { icon: '🛒', title: 'E-commerce Integrado', desc: 'Tu tienda online sincronizada con el inventario. Pedidos online que llegan directo al ERP.' },
]

const plans = [
  {
    name: 'Gratis',
    price: '$0',
    period: 'siempre',
    desc: 'Para empezar sin riesgo',
    features: ['1 usuario', '100 productos', 'POS básico', 'Inventario básico'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    name: 'Básico',
    price: '$29',
    period: '/mes USD',
    desc: 'Para negocios en crecimiento',
    features: ['3 usuarios', 'Productos ilimitados', 'Facturación electrónica', '2 almacenes', 'Soporte por email'],
    cta: 'Probar 14 días gratis',
    highlight: false,
  },
  {
    name: 'Profesional',
    price: '$79',
    period: '/mes USD',
    desc: 'El favorito de los negocios',
    features: ['10 usuarios', 'Multi-sucursal (hasta 5)', 'Tienda online propia', 'Reportes avanzados', 'RRHH básico', 'Soporte prioritario'],
    cta: 'Probar 14 días gratis',
    highlight: true,
  },
  {
    name: 'Empresarial',
    price: '$199',
    period: '/mes USD',
    desc: 'Para cadenas y grandes operaciones',
    features: ['Usuarios ilimitados', 'Sucursales ilimitadas', 'API completa', 'White label', 'Multi-moneda', 'Cuenta dedicada'],
    cta: 'Contactar ventas',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── NAV ── */}
      <nav style={{ background: 'var(--bg)', boxShadow: '0 2px 16px var(--shadow-dark)', position: 'sticky', top: 0, zIndex: 50, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 10px rgba(74,144,217,0.4)', color: '#fff', fontWeight: 800, fontSize: 18 }}>M</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Mr Tender</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" className="btn-neu btn-ghost" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>Iniciar sesión</Link>
          <Link href="/register" className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>Comenzar gratis</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '100px 32px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <div className="badge badge-blue animate-fade-in" style={{ marginBottom: 20, fontSize: '0.8rem' }}>
          ✦ ERP Cloud-Native para LATAM
        </div>
        <h1 className="animate-fade-in" style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 22 }}>
          Gestiona tu negocio<br />
          <span style={{ color: 'var(--accent-blue)' }}>en un toque.</span>
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
          POS, inventario, clientes, finanzas y e-commerce integrados. Cualquier acción crítica del negocio en máximo 3 toques desde tu celular.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-neu btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Comenzar gratis →
          </Link>
          <Link href="#features" className="btn-neu" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            Ver funciones
          </Link>
        </div>
        <p style={{ marginTop: 18, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin tarjeta de crédito · Cancela cuando quieras</p>
      </section>

      {/* ── HERO VISUAL ── */}
      <section style={{ padding: '0 32px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="neu-card" style={{ padding: 32, background: 'var(--bg-deep)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Ventas hoy', value: '$28,450', delta: '+12.4%', color: 'var(--accent-blue)' },
              { label: 'Productos vendidos', value: '143', delta: '+8.1%', color: 'var(--accent-green)' },
              { label: 'Clientes nuevos', value: '24', delta: '+5.3%', color: 'var(--accent-purple)' },
              { label: 'Ticket promedio', value: '$198.95', delta: '+3.8%', color: 'var(--accent-amber)' },
            ].map((kpi) => (
              <div key={kpi.label} className="kpi-card" style={{ gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{kpi.value}</span>
                <span className="delta-up">↑ {kpi.delta} vs ayer</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '60px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>Todo lo que necesitas, integrado</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 52, fontSize: '1.05rem' }}>16 módulos completos. Un solo precio.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="neu-card" style={{ padding: '24px 24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '60px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>Precios simples y transparentes</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 52, fontSize: '1.05rem' }}>Sin costos ocultos. Cambia de plan cuando quieras.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {plans.map((plan) => (
            <div key={plan.name} className="neu-card" style={{ padding: '28px 24px', position: 'relative', border: plan.highlight ? '2px solid var(--accent-blue)' : 'none' }}>
              {plan.highlight && (
                <div className="badge badge-blue" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>Más popular</div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{plan.price}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>{plan.desc}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`btn-neu ${plan.highlight ? 'btn-primary' : ''}`} style={{ width: '100%', justifyContent: 'center' }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '60px 32px 100px', textAlign: 'center' }}>
        <div className="neu-card" style={{ maxWidth: 640, margin: '0 auto', padding: '52px 40px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.02em' }}>Empieza a vender en 5 minutos</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1rem', lineHeight: 1.6 }}>Regístrate, configura tu negocio y haz tu primera venta. Sin instalar nada, sin configuración técnica.</p>
          <Link href="/register" className="btn-neu btn-primary" style={{ padding: '14px 36px', fontSize: '1rem' }}>
            Crear mi cuenta gratis →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--bg-deep)', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mr Tender</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>© 2026 Mr Tender. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
