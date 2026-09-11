'use client'

import Link from 'next/link'
import { useState } from 'react'

// ── DATA ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Características', href: '#features' },
  { label: 'Sectores', href: '#verticals' },
  { label: 'Precios', href: '#pricing' },
  { label: 'Comparación', href: '#compare' },
]

const STATS = [
  { value: '35+', label: 'módulos integrados' },
  { value: '17', label: 'sectores especializados' },
  { value: '3', label: 'toques para vender' },
  { value: '100%', label: 'DIAN Colombia' },
]

const FEATURES = [
  {
    icon: '',
    color: '#00D6BC',
    bg: '#E6FAF7',
    title: 'POS Ultra-Rápido',
    desc: 'Completa una venta en 3 toques. Escáner de código de barras, múltiples formas de pago (Nequi, Daviplata, Bancolombia QR, efectivo) y ticket digital al instante.',
  },
  {
    icon: '',
    color: '#714AD9',
    bg: '#F0EDFC',
    title: 'Facturación DIAN Completa',
    desc: 'Emisión UBL 2.1 con CUFE SHA-384, notas crédito, documento soporte, nómina electrónica CUNE y habilitación DIAN integrada. Sin software adicional.',
  },
  {
    icon: '',
    color: '#0284C7',
    bg: '#EFF6FF',
    title: 'Inventario Multi-Almacén',
    desc: 'Kardex automático, alertas de stock mínimo, traslados entre bodegas, importación masiva desde Excel y valorización de existencias en tiempo real.',
  },
  {
    icon: '',
    color: '#D97706',
    bg: '#FFFBEB',
    title: 'IA Copilot Integrada',
    desc: 'Asistente de inteligencia artificial con Gemini: consulta ventas, crea productos por voz ("dos gaseosas y una bolsa de pan") y analiza tu negocio en lenguaje natural.',
  },
  {
    icon: '',
    color: '#059669',
    bg: '#ECFDF5',
    title: 'E-commerce Propio',
    desc: 'Tu tienda web en nombre.mrtender.com sincronizada en tiempo real con el inventario. Pedidos que llegan directo a WhatsApp sin comisiones.',
  },
  {
    icon: '',
    color: '#00D6BC',
    bg: '#E6FAF7',
    title: 'CRM con Kanban de Ventas',
    desc: 'Embudo de ventas visual por etapas, links de pago Wompi/PSE, historial de clientes, fiados con estado de cuenta y recordatorios automáticos por WhatsApp.',
  },
  {
    icon: '',
    color: '#714AD9',
    bg: '#F0EDFC',
    title: 'Reportes e Analítica',
    desc: 'Dashboard con KPIs en vivo: ventas netas, utilidad bruta, ticket promedio, cajero del mes y productos top. Exportación a PDF y Excel.',
  },
  {
    icon: '',
    color: '#0284C7',
    bg: '#EFF6FF',
    title: 'Nómina Electrónica DIAN',
    desc: 'Liquidación quincenal/mensual con devengados, deducciones de ley Colombia, cálculo de CUNE y envío de colillas por WhatsApp a cada empleado.',
  },
  {
    icon: '',
    color: '#059669',
    bg: '#ECFDF5',
    title: 'Tesorería y Contabilidad',
    desc: 'Cuentas bancarias en tiempo real, conciliación de extractos, flujo de caja, Plan Único de Cuentas PUC y causación automática de asientos contables.',
  },
]

const VERTICALS = [
  { icon: '', name: 'Restaurante & Café', desc: 'Mesas, comandas KDS cocina, split bill, recetas' },
  { icon: '', name: 'Droguería & Farmacia', desc: 'INVIMA, lotes vencimiento, termohigrometría' },
  { icon: '', name: 'Carnicería & Charcutería', desc: 'Desposte canales, rendimiento cárnico, frío' },
  { icon: '', name: 'Panadería & Pastelería', desc: 'Recetas panaderas, horneadas, encargos' },
  { icon: '️', name: 'Gimnasio & Fitness', desc: 'Membresías, torniquete QR, aforo clases' },
  { icon: '', name: 'Veterinaria & Pet Shop', desc: 'Historias clínicas, vacunas WhatsApp, grooming' },
  { icon: '', name: 'Taller Mecánico', desc: 'Órdenes de trabajo por placa, checklist, autolavado' },
  { icon: '', name: 'Boutique & Ropa', desc: 'Matriz talla/color, probadores, lookbooks' },
  { icon: '', name: 'Salón de Belleza', desc: 'Agenda citas WhatsApp, comisiones estilistas' },
  { icon: '', name: 'Óptica', desc: 'Fórmulas OD/OI, órdenes laboratorio biselado' },
  { icon: '', name: 'Verdulería & Frutería', desc: 'Mermas, canastas mercado, balanza PLU' },
  { icon: '', name: 'Floristería & Eventos', desc: 'Arreglos por tallos, dedicatorias, domicilios' },
  { icon: '', name: 'Dulcería & Piñatería', desc: 'Sorpresas por niño, venta granel, combos fiesta' },
  { icon: '', name: 'Licorera & Estanco', desc: 'Copeo barra, retornables, combos rumberos' },
  { icon: '', name: 'Ferretería', desc: 'Cotizaciones PDF, venta fraccionada, alquiler herramientas' },
  { icon: '', name: 'Papelería & Variedades', desc: 'Impresiones, fotocopias, útiles escolares' },
  { icon: '', name: 'Lavandería & Tintorería', desc: 'Tickets prenda, percheros, lavado en seco' },
]

const PLANS = [
  {
    id: 'gratis',
    name: 'Gratis',
    tagline: 'Para empezar sin riesgo',
    price: 0,
    priceAnnual: 0,
    highlight: false,
    badge: null,
    cta: 'Empezar gratis',
    ctaHref: '/register',
    features: [
      '1 usuario',
      'Hasta 100 productos',
      'POS básico',
      'Inventario básico',
      'Reportes básicos',
      'Comunidad de soporte',
    ],
    notIncluded: [
      'Facturación DIAN',
      'CRM & links de pago',
      'Nómina electrónica',
      'E-commerce propio',
    ],
  },
  {
    id: 'basico',
    name: 'Básico',
    tagline: 'Para negocios con facturación activa',
    price: 30000,
    priceAnnual: 24000,
    highlight: false,
    badge: null,
    cta: 'Probar 14 días gratis',
    ctaHref: '/register?plan=basico',
    features: [
      '2 usuarios',
      'Productos ilimitados',
      'POS completo (escáner, tickets térmicos)',
      'Facturación DIAN ilimitada',
      'Notas crédito & documento soporte',
      'Inventario 1 almacén',
      'Clientes & cuentas por cobrar (fiado)',
      'Caja, turnos & arqueos',
      'Reportes de ventas básicos',
      'Chat de soporte en horario laboral',
    ],
    notIncluded: [
      'CRM Kanban & links de pago',
      'Nómina electrónica',
      'E-commerce propio',
      'Verticales especializadas',
    ],
  },
  {
    id: 'pyme',
    name: 'Pyme',
    tagline: 'El favorito de los negocios en Colombia',
    price: 89000,
    priceAnnual: 71200,
    highlight: true,
    badge: 'Más popular',
    cta: 'Probar 14 días gratis',
    ctaHref: '/register?plan=pyme',
    features: [
      '5 usuarios',
      'Todo el plan Básico incluido',
      'CRM Kanban + links pago Wompi/PSE',
      'Inventario multi-almacén (hasta 5)',
      'Compras & proveedores',
      'Personal, turnos & asistencia',
      'Nómina Electrónica DIAN (hasta 10 empleados)',
      'Tesorería & bancos',
      'E-commerce propio (tienda en tu subdominio)',
      '1 vertical especializada (ej: restaurante, gym)',
      'Reportes avanzados + exportación Excel/PDF',
      'Soporte prioritario por WhatsApp',
    ],
    notIncluded: [
      'Contabilidad PUC automatizada',
      'IA Copilot',
      'Acceso API',
    ],
  },
  {
    id: 'cadena',
    name: 'Cadena',
    tagline: 'Para multi-sucursales y operaciones complejas',
    price: 169000,
    priceAnnual: 135200,
    highlight: false,
    badge: null,
    cta: 'Contactar ventas',
    ctaHref: '/register?plan=cadena',
    features: [
      'Usuarios ilimitados',
      'Todo el plan Pyme incluido',
      'Inventario multi-almacén ilimitado',
      'Todas las 17 verticales especializadas',
      'Nómina DIAN (empleados ilimitados)',
      'Contabilidad automatizada PUC',
      'IA Copilot (Gemini) integrado',
      'Reportes analíticos avanzados',
      'Acceso API completo',
      'Gestor de cuenta dedicado',
      'Soporte 24/7 WhatsApp + llamada',
    ],
    notIncluded: [],
  },
]

const COMPARE_ROWS = [
  { feature: 'Precio plan entrada', mrtender: '$30.000/mes', alegra: '$74.900/mes', siigo: '~$145.993/mes' },
  { feature: 'Precios públicos y claros', mrtender: true, alegra: true, siigo: false },
  { feature: 'Sin topes de ingresos mensuales', mrtender: true, alegra: false, siigo: true },
  { feature: 'POS + DIAN + Inventario en plan base', mrtender: true, alegra: false, siigo: false },
  { feature: 'Nómina DIAN incluida en plan Pyme', mrtender: true, alegra: 'extra $29.900/mes', siigo: 'extra' },
  { feature: 'E-commerce propio incluido', mrtender: true, alegra: false, siigo: false },
  { feature: 'Verticales especializadas (17 sectores)', mrtender: true, alegra: false, siigo: false },
  { feature: 'IA Copilot integrada', mrtender: 'Plan Cadena', alegra: 'básica', siigo: 'básica' },
  { feature: 'Pago mensual sin permanencia forzada', mrtender: true, alegra: true, siigo: false },
  { feature: 'Prueba gratis 14 días sin tarjeta', mrtender: true, alegra: '15 días', siigo: false },
]

const FAQS = [
  {
    q: '¿Mr. Tender está habilitado ante la DIAN?',
    a: 'Sí. Mr. Tender emite facturas electrónicas UBL 2.1 con CUFE SHA-384 validadas ante la DIAN, además de notas crédito, documento soporte de compras a no obligados a facturar, y nómina electrónica con CUNE. Incluye el asistente de habilitación DIAN integrado.',
  },
  {
    q: '¿Hay límite de ingresos o facturación mensual?',
    a: 'No. A diferencia de Alegra (que limita a $10M, $40M o $180M COP/mes según el plan), en Mr. Tender no hay tope de ingresos. Tu negocio puede crecer sin penalización.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. Los planes mensuales no tienen permanencia forzada. Puedes cancelar antes de que se renueve el siguiente período y conservas el acceso hasta el final del mes pagado.',
  },
  {
    q: '¿Los precios incluyen IVA?',
    a: 'Los precios mostrados son más IVA (19%). Al facturar, recibirás el comprobante con el desglose completo del IVA.',
  },
  {
    q: '¿Puedo migrar desde Alegra o Siigo?',
    a: 'Sí. Ofrecemos importación masiva de productos y clientes desde Excel/CSV. El equipo de soporte te acompaña durante la migración sin costo adicional.',
  },
  {
    q: '¿Funciona sin internet?',
    a: 'El POS funciona en modo offline usando IndexedDB. Las ventas se sincronizan automáticamente cuando se restaura la conexión. La facturación DIAN requiere conexión para el timbrado.',
  },
  {
    q: '¿Qué es una "vertical especializada"?',
    a: 'Son módulos adicionales para industrias específicas: restaurantes (mesas, comandas KDS), farmacias (INVIMA, lotes), carnicerías (desposte de canales), gimnasios (membresías, torniquete QR), entre otras. En el plan Cadena están todas incluidas.',
  },
]

// ── HELPERS ──────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 clamp(16px, 4vw, 48px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/icon-192.png" alt="Mr Tender" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
          Mr Tender
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2, marginRight: 8 }} className="hide-on-mobile">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              textDecoration: 'none',
              borderRadius: 8,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{l.label}</a>
          ))}
        </div>
        <Link href="/login" className="btn-neu btn-ghost" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
          Iniciar sesión
        </Link>
        <Link href="/register" className="btn-neu btn-primary" style={{ padding: '7px 16px', fontSize: '0.82rem' }}>
          Comenzar gratis
        </Link>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section style={{
      padding: 'clamp(60px, 10vw, 120px) clamp(16px, 4vw, 48px) 80px',
      textAlign: 'center',
      maxWidth: 860,
      margin: '0 auto',
    }}>
      <div className="badge badge-blue animate-fade-in" style={{ marginBottom: 20, fontSize: '0.78rem' }}>
         ERP Cloud-Native para Colombia
      </div>

      <h1 className="animate-fade-in" style={{
        fontSize: 'clamp(2.2rem, 6vw, 4rem)',
        fontWeight: 800,
        lineHeight: 1.1,
        color: '#0F172A',
        letterSpacing: '-0.03em',
        marginBottom: 20,
      }}>
        El ERP más completo de Colombia<br />
        <span style={{ color: '#00D6BC' }}>desde $30.000/mes</span>
      </h1>

      <p className="animate-fade-in" style={{
        fontSize: '1.1rem',
        color: '#475569',
        lineHeight: 1.7,
        marginBottom: 40,
        maxWidth: 600,
        margin: '0 auto 40px',
      }}>
        POS, inventario, facturación DIAN, nómina electrónica, CRM, e-commerce
        y 17 verticales especializadas. Todo integrado en un solo sistema.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <Link href="/register" className="btn-neu btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
          Probar 14 días gratis →
        </Link>
        <a href="#pricing" className="btn-neu" style={{ padding: '14px 28px', fontSize: '1rem' }}>
          Ver planes y precios
        </a>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
        Sin tarjeta de crédito · Sin permanencia · Cancela cuando quieras
      </p>
    </section>
  )
}

function StatsBar() {
  return (
    <section style={{ padding: '0 clamp(16px, 4vw, 48px) 80px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 1,
        background: '#E2E8F0',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
      }}>
        {STATS.map((s) => (
          <div key={s.label} style={{
            background: '#FFFFFF',
            padding: '28px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00D6BC', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DashboardMockup() {
  const kpis = [
    { label: 'Ventas hoy', value: '$2.845.000', delta: '+12.4%', color: '#00D6BC' },
    { label: 'Productos vendidos', value: '143 uds', delta: '+8.1%', color: '#714AD9' },
    { label: 'Clientes atendidos', value: '38', delta: '+5.3%', color: '#0284C7' },
    { label: 'Ticket promedio', value: '$74.868', delta: '+3.8%', color: '#059669' },
  ]

  return (
    <section style={{ padding: '0 clamp(16px, 4vw, 48px) 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{
        background: '#F8FAFC',
        borderRadius: 20,
        padding: 'clamp(20px, 4vw, 40px)',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
      }}>
        {/* Fake browser bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
          </div>
          <div style={{
            flex: 1, background: '#FFF', borderRadius: 6, padding: '4px 12px',
            fontSize: '0.78rem', color: '#94A3B8', border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span></span> app.mrtender.com/dashboard
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '18px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: k.color, fontWeight: 700, marginTop: 4 }}>↑ {k.delta} vs ayer</div>
            </div>
          ))}
        </div>

        {/* Fake mini chart */}
        <div style={{ marginTop: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Ventas de la semana</span>
            <span className="badge badge-blue">En tiempo real</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
            {[40, 65, 45, 80, 70, 95, 85].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${h}%`,
                  background: i === 5 ? '#00D6BC' : '#E6FAF7',
                  borderRadius: '4px 4px 0 0',
                  border: i === 5 ? '1px solid #00BAA4' : '1px solid #94F0E3',
                }} />
                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div className="badge badge-blue" style={{ marginBottom: 14 }}>9 módulos core + 17 verticales</div>
        <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Todo lo que tu negocio necesita, integrado
        </h2>
        <p style={{ color: '#475569', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto' }}>
          Sin apps separadas, sin integraciones complicadas. Un sistema que crece con tu negocio.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="neu-card" style={{ padding: '24px 24px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', marginBottom: 14,
            }}>
              {f.icon}
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function VerticalsSection() {
  return (
    <section id="verticals" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px)', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="badge badge-purple" style={{ marginBottom: 14 }}>17 sectores especializados</div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Diseñado para tu tipo de negocio
          </h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>
            Módulos verticales con terminología, flujos y métricas adaptadas a cada industria.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {VERTICALS.map((v) => (
            <div key={v.name} style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '18px 16px',
              transition: 'all 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#00D6BC'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,214,188,0.12)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E2E8F0'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{v.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginBottom: 4 }}>{v.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.5 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px)', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div className="badge badge-blue" style={{ marginBottom: 14 }}>Precios en pesos colombianos</div>
        <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Precios simples y transparentes
        </h2>
        <p style={{ color: '#475569', fontSize: '1.05rem', marginBottom: 28 }}>
          Sin costos ocultos. Sin topes de ingresos. Cambia de plan cuando quieras.
        </p>

        {/* Annual / Monthly toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#F1F5F9', borderRadius: 999, padding: '6px 6px 6px 14px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: annual ? '#94A3B8' : '#0F172A' }}>Mensual</span>
          <button
            onClick={() => setAnnual(a => !a)}
            style={{
              width: 44, height: 24,
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: annual ? '#00D6BC' : '#CBD5E1',
              position: 'relative',
              transition: 'background 0.2s',
              padding: 0,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#FFF',
              position: 'absolute', top: 3,
              left: annual ? 23 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: annual ? '#0F172A' : '#94A3B8' }}>
            Anual
          </span>
          {annual && (
            <span style={{
              background: '#00D6BC', color: '#FFF', fontSize: '0.72rem',
              fontWeight: 800, padding: '2px 8px', borderRadius: 999,
            }}>
              20% OFF
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {PLANS.map((plan) => {
          const price = annual ? plan.priceAnnual : plan.price
          const isFree = plan.price === 0

          return (
            <div
              key={plan.id}
              style={{
                background: plan.highlight ? '#0F172A' : '#FFFFFF',
                border: plan.highlight ? '2px solid #00D6BC' : '1px solid #E2E8F0',
                borderRadius: 20,
                padding: '28px 24px',
                position: 'relative',
                boxShadow: plan.highlight ? '0 8px 32px rgba(0,214,188,0.18)' : '0 1px 4px rgba(15,23,42,0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: '#00D6BC', color: '#FFF', fontSize: '0.75rem',
                  fontWeight: 800, padding: '4px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: plan.highlight ? '#94A3B8' : '#64748B',
                  marginBottom: 6,
                }}>
                  {plan.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 800, color: plan.highlight ? '#FFFFFF' : '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {isFree ? '$0' : formatCOP(price)}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize: '0.8rem', color: plan.highlight ? '#64748B' : '#94A3B8', marginBottom: 6 }}>
                      /mes
                    </span>
                  )}
                </div>

                {annual && !isFree && plan.price > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#00D6BC', fontWeight: 700, marginBottom: 4 }}>
                    {formatCOP(price * 12)}/año — ahorras {formatCOP((plan.price - price) * 12)}
                  </div>
                )}

                <p style={{ fontSize: '0.82rem', color: plan.highlight ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>
                  {plan.tagline}
                </p>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.84rem' }}>
                    <span style={{ color: '#00D6BC', fontWeight: 800, marginTop: 1, flexShrink: 0 }}></span>
                    <span style={{ color: plan.highlight ? '#E2E8F0' : '#334155' }}>{f}</span>
                  </li>
                ))}
                {plan.notIncluded.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.84rem', opacity: 0.45 }}>
                    <span style={{ color: '#94A3B8', fontWeight: 800, marginTop: 1, flexShrink: 0 }}></span>
                    <span style={{ color: plan.highlight ? '#94A3B8' : '#64748B' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={plan.id === 'gratis' ? 'btn-neu' : 'btn-neu btn-primary'}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                  ...(plan.highlight && plan.id !== 'gratis' ? {} : {}),
                }}
              >
                {plan.cta}
              </Link>
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', marginTop: 28, fontSize: '0.82rem', color: '#94A3B8' }}>
        Precios más IVA (19%) · Sin tarjeta de crédito para el período de prueba
      </p>
    </section>
  )
}

const ONBOARDING_PACKAGES = [
  {
    name: 'Starter',
    subtitle: 'Hasta 80 productos',
    price: 49900,
    ideal: 'Negocios iniciando · Catálogo compacto',
    includes: [
      'Conteo y registro de hasta 80 referencias',
      'Creación de categorías y precios de venta',
      'Configuración de stock inicial y costos',
      'Capacitación de uso (100% Gratis incluida)',
    ],
    highlight: false,
    badge: null,
  },
  {
    name: 'Estándar',
    subtitle: 'Hasta 200 productos',
    price: 99900,
    ideal: 'Comercios en crecimiento · Catálogo mediano',
    includes: [
      'Conteo y levantamiento de hasta 200 referencias',
      'Clasificación por categorías y unidades de medida',
      'Carga de códigos de barras para escáner POS',
      'Configuración de alertas de stock mínimo',
      'Capacitación de uso (100% Gratis incluida)',
    ],
    highlight: true,
    badge: 'Más solicitado',
  },
  {
    name: 'Profesional',
    subtitle: 'Hasta 500 productos',
    price: 199900,
    ideal: 'Empresas consolidadas · Catálogo extenso',
    includes: [
      'Digitalización masiva de hasta 500 referencias',
      'Estructuración de catálogo desde físico o listas de proveedores',
      'Carga de códigos de barra, variantes y precios mayoristas',
      'Configuración de múltiples almacenes o bodegas',
      'Capacitación para todo tu equipo (100% Gratis incluida)',
    ],
    highlight: false,
    badge: null,
  },
]

function OnboardingSection() {
  return (
    <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px)', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="badge badge-purple" style={{ marginBottom: 14 }}>Servicio Opcional · Hacemos el trabajo por ti</div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Digitalización y Carga de Inventario
          </h2>
          <p style={{ color: '#475569', fontSize: '1rem', maxWidth: 620, margin: '0 auto' }}>
            ¿No tienes tiempo para contar y digitar todos tus productos? Nosotros lo hacemos por ti.
            Levantamos tu inventario y te dejamos todo el catálogo cargado en Mr. Tender listo para vender desde el primer día.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
          {ONBOARDING_PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              style={{
                background: pkg.highlight ? '#0F172A' : '#FFFFFF',
                border: pkg.highlight ? '2px solid #714AD9' : '1px solid #E2E8F0',
                borderRadius: 20,
                padding: '28px 24px',
                position: 'relative',
                boxShadow: pkg.highlight ? '0 8px 32px rgba(113,74,217,0.18)' : '0 1px 4px rgba(15,23,42,0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {pkg.badge && (
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: '#714AD9', color: '#FFF', fontSize: '0.72rem',
                  fontWeight: 800, padding: '4px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>
                  {pkg.badge}
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <div style={{
                  fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: pkg.highlight ? '#94A3B8' : '#64748B',
                  marginBottom: 4,
                }}>
                  Inventario {pkg.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: pkg.highlight ? '#FFFFFF' : '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    ${pkg.price.toLocaleString('es-CO')}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: pkg.highlight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                    /pago único
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#714AD9', marginBottom: 4 }}>
                  {pkg.subtitle}
                </div>
                <div style={{ fontSize: '0.78rem', color: pkg.highlight ? '#64748B' : '#94A3B8' }}>
                  {pkg.ideal}
                </div>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, flex: 1 }}>
                {pkg.includes.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.84rem' }}>
                    <span style={{ color: '#714AD9', fontWeight: 800, marginTop: 1, flexShrink: 0 }}></span>
                    <span style={{ color: pkg.highlight ? '#E2E8F0' : '#334155' }}>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://wa.me/573000000000?text=Hola,%20quiero%20el%20servicio%20de%20digitalizacion%20de%20inventario%20Mr.%20Tender"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: 12,
                  textDecoration: 'none',
                  background: pkg.highlight ? '#714AD9' : 'transparent',
                  color: pkg.highlight ? '#FFFFFF' : '#714AD9',
                  border: pkg.highlight ? 'none' : '2px solid #714AD9',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#5D3BB5'
                  e.currentTarget.style.color = '#FFFFFF'
                  e.currentTarget.style.border = '2px solid #5D3BB5'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = pkg.highlight ? '#714AD9' : 'transparent'
                  e.currentTarget.style.color = pkg.highlight ? '#FFFFFF' : '#714AD9'
                  e.currentTarget.style.border = pkg.highlight ? 'none' : '2px solid #714AD9'
                }}
              >
                Solicitar por WhatsApp
              </a>
            </div>
          ))}
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #F0EDFC 0%, #E6FAF7 100%)',
          border: '1px solid #C4B5F5',
          borderRadius: 14,
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '1.2rem' }}></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
              Capacitación 100% gratuita:{' '}
            </span>
            <span style={{ fontSize: '0.86rem', color: '#475569' }}>
              El acompañamiento y la enseñanza para usar Mr. Tender no tienen costo. Este servicio es exclusivamente para el conteo, organización y digitalización de tus productos si prefieres que nosotros hagamos el trabajo pesado.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function CompareSection() {
  const renderCell = (val: string | boolean) => {
    if (val === true) return <span style={{ color: '#059669', fontWeight: 800, fontSize: '1rem' }}></span>
    if (val === false) return <span style={{ color: '#EF4444', fontWeight: 800, fontSize: '0.9rem' }}></span>
    return <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{val}</span>
  }

  return (
    <section id="compare" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px)', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="badge badge-green" style={{ marginBottom: 14 }}>Comparación honesta</div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>
            ¿Por qué Mr. Tender?
          </h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>
            Más completo, más transparente y más económico que las alternativas del mercado.
          </p>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#0F172A' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '0.78rem' }}>
                    Característica
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', color: '#00D6BC', fontWeight: 800, fontSize: '0.9rem' }}>
                    Mr. Tender
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', color: '#94A3B8', fontWeight: 700, fontSize: '0.82rem' }}>
                    Alegra
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', color: '#94A3B8', fontWeight: 700, fontSize: '0.82rem' }}>
                    Siigo
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFF' : '#FAFCFF' }}>
                    <td style={{ padding: '12px 18px', color: '#334155', fontWeight: 600 }}>{row.feature}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>{renderCell(row.mrtender)}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>{renderCell(row.alegra)}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>{renderCell(row.siigo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Savings highlight */}
        <div style={{
          marginTop: 24,
          background: 'linear-gradient(135deg, #E6FAF7 0%, #F0EDFC 100%)',
          border: '1px solid #94F0E3',
          borderRadius: 14,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700, marginBottom: 2 }}>
              Mr. Tender Básico vs. Alegra equivalente
            </div>
            <div style={{ fontSize: '1rem', color: '#0F172A', fontWeight: 800 }}>
              <span style={{ color: '#00D6BC' }}>$30.000/mes</span>
              {' vs. '}
              <span style={{ color: '#EF4444', textDecoration: 'line-through' }}>$100.800/mes</span>
              {' → ahorras '}
              <span style={{ color: '#059669' }}>$849.600/año</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px)', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Preguntas frecuentes
        </h2>
        <p style={{ color: '#64748B', fontSize: '1rem' }}>Lo que los negocios colombianos nos preguntan antes de empezar.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{
            background: '#FFFFFF',
            border: `1px solid ${openIdx === i ? '#00D6BC' : '#E2E8F0'}`,
            borderRadius: 12,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', textAlign: 'left', gap: 16,
              }}
            >
              {faq.q}
              <span style={{ fontSize: '1.2rem', color: '#00D6BC', flexShrink: 0, transition: 'transform 0.2s', transform: openIdx === i ? 'rotate(45deg)' : 'none' }}>+</span>
            </button>
            {openIdx === i && (
              <div style={{ padding: '0 20px 18px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.7 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 48px) 100px', textAlign: 'center' }}>
      <div style={{
        maxWidth: 680, margin: '0 auto',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: 24,
        padding: 'clamp(40px, 6vw, 64px) clamp(24px, 5vw, 56px)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.20)',
        border: '1px solid #334155',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 14, letterSpacing: '-0.02em' }}>
          Empieza a vender en 5 minutos
        </h2>
        <p style={{ color: '#94A3B8', marginBottom: 32, fontSize: '0.95rem', lineHeight: 1.7 }}>
          Registra tu negocio, configura tu catálogo y haz tu primera venta.
          Sin instalar nada. Sin configuración técnica. Sin tarjeta de crédito.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-neu btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Crear mi cuenta gratis →
          </Link>
          <a href="#pricing" className="btn-neu" style={{
            padding: '14px 24px', fontSize: '1rem',
            background: 'transparent', color: '#94A3B8', borderColor: '#475569',
          }}>
            Ver planes
          </a>
        </div>
        <p style={{ marginTop: 20, fontSize: '0.8rem', color: '#475569' }}>
          14 días gratis · Sin tarjeta · Cancela cuando quieras
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #E2E8F0',
      padding: '32px clamp(16px, 4vw, 48px)',
      background: '#FFFFFF',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/icon-192.png" alt="Mr Tender" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>Mr Tender</span>
          <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>Colombia </span>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Características', href: '#features' },
            { label: 'Sectores', href: '#verticals' },
            { label: 'Precios', href: '#pricing' },
            { label: 'Iniciar sesión', href: '/login' },
          ].map(l => (
            <a key={l.href} href={l.href} style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00D6BC')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
            >{l.label}</a>
          ))}
        </div>

        <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
          © 2026 Mr Tender. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', overflowX: 'hidden' }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <DashboardMockup />
      <FeaturesSection />
      <VerticalsSection />
      <PricingSection />
      <OnboardingSection />
      <CompareSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
