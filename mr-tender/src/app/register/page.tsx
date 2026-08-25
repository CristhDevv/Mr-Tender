'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Tienda / Minimercado / Supermercado' },
  { value: 'hardware', label: 'Ferretería & Construcción' },
  { value: 'pharmacy', label: 'Droguería y Farmacia' },
  { value: 'veterinary', label: 'Veterinaria, Pet Shop & Grooming' },
  { value: 'automotive', label: 'Taller Mecánico, Serviteca & Autolavado' },
  { value: 'laundry', label: 'Lavandería, Tintorería & Planchado' },
  { value: 'liquor_tobacco', label: 'Licorera, Estanco & Cigarrería' },
  { value: 'restaurant', label: 'Restaurante / Cafetería' },
  { value: 'beauty_salon', label: 'Salón de Belleza, Barbería & Spa' },
  { value: 'services', label: 'Servicios' },
  { value: 'wholesale', label: 'Mayorista / Distribuidor' },
  { value: 'clothing', label: 'Ropa y Moda' },
  { value: 'electronics', label: 'Electrónica y Tecnología' },
  { value: 'other', label: 'Otro Comercio' },
]

const PLANS = [
  { slug: 'free', name: 'Gratis', price: '$0', color: 'var(--text-secondary)' },
  { slug: 'basic', name: 'Básico', price: '$29/mes', color: 'var(--accent-blue)' },
  { slug: 'professional', name: 'Profesional', price: '$79/mes', color: 'var(--accent-purple)', popular: true },
  { slug: 'enterprise', name: 'Empresarial', price: '$199/mes', color: 'var(--accent-amber)' },
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    businessType: 'retail',
    ownerName: '',
    email: '',
    password: '',
    country: 'MX',
    currency: 'MXN',
    planSlug: 'free',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      // 1. Create auth user
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.ownerName,
            role: 'admin',
            is_owner: true,
          }
        }
      })
      if (signUpErr) throw signUpErr
      if (!data.user) throw new Error('No se pudo crear el usuario')

      // 2. Create tenant via DB function
      const { data: tenantData, error: tenantErr } = await supabase.rpc('create_tenant', {
        p_tenant_name: form.businessName,
        p_owner_email: form.email,
        p_owner_name: form.ownerName,
        p_business_type: form.businessType,
        p_country: form.country,
        p_currency: form.currency,
        p_plan_slug: form.planSlug,
      })
      if (tenantErr) throw tenantErr

      // 3. Update user with tenant_id
      const tenantId = (tenantData as { tenant_id: string }).tenant_id
      await supabase.auth.updateUser({
        data: { tenant_id: tenantId, role: 'admin', is_owner: true }
      })

      // 4. Initialize specific vertical modules in tenant_settings
      const initialModules: Record<string, boolean> = {
        pos: true, inventory: true, cash: true, customers: true,
        suppliers: true, purchases: true, employees: true,
        accounting: true, reports: true, ecommerce: true,
        pharmacy: form.businessType === 'pharmacy',
        hardware: form.businessType === 'hardware',
        liquor_tobacco: form.businessType === 'liquor_tobacco',
        restaurant: form.businessType === 'restaurant',
        beauty_salon: form.businessType === 'beauty_salon',
        veterinary: form.businessType === 'veterinary',
        automotive: form.businessType === 'automotive',
        laundry: form.businessType === 'laundry'
      }

      await supabase.from('tenant_settings').upsert({
        tenant_id: tenantId,
        enabled_modules: initialModules
      }, { onConflict: 'tenant_id' })

      router.push('/dashboard?onboarding=complete')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear la cuenta')
      setLoading(false)
    }
  }

  const steps = ['Tu negocio', 'Tu cuenta', 'Elige tu plan']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 520, padding: '40px 36px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="Mr Tender" style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 10px', display: 'block', objectFit: 'contain' }} />
          <h1 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Crear mi cuenta</h1>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                background: step > i + 1 ? 'var(--accent-green)' : step === i + 1 ? 'var(--accent-blue)' : 'var(--bg-deep)',
                color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
                boxShadow: step === i + 1 ? '3px 3px 8px rgba(74,144,217,0.35)' : 'var(--neu-subtle)',
              }}>{step > i + 1 ? '✓' : i + 1}</div>
              <span style={{ fontSize: '0.75rem', color: step === i + 1 ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>{s}</span>
              {i < steps.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--shadow-dark)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Business info ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Nombre del negocio</label>
              <input className="input-neu" placeholder="Ej: Tienda La Esperanza" value={form.businessName} onChange={e => set('businessName')(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>Tipo de negocio</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {BUSINESS_TYPES.map(bt => (
                  <button key={bt.value} type="button" onClick={() => set('businessType')(bt.value)}
                    className="btn-neu" style={{ padding: '10px 12px', fontSize: '0.8rem', justifyContent: 'flex-start', gap: 6, background: form.businessType === bt.value ? 'var(--accent-blue-lt)' : 'var(--bg)', color: form.businessType === bt.value ? 'var(--accent-blue)' : 'var(--text-secondary)', boxShadow: form.businessType === bt.value ? 'var(--neu-pressed)' : 'var(--neu-raised)' }}>
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>País</label>
                <select className="input-neu" value={form.country} onChange={e => { set('country')(e.target.value); set('currency')(e.target.value === 'MX' ? 'MXN' : e.target.value === 'CO' ? 'COP' : e.target.value === 'PE' ? 'PEN' : 'USD') }}>
                  <option value="MX">🇲🇽 México</option>
                  <option value="CO">🇨🇴 Colombia</option>
                  <option value="PE">🇵🇪 Perú</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="CL">🇨🇱 Chile</option>
                  <option value="US">🇺🇸 USA</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Moneda</label>
                <input className="input-neu" value={form.currency} readOnly style={{ opacity: 0.7 }} />
              </div>
            </div>
            <button className="btn-neu btn-primary" onClick={() => form.businessName.trim() ? setStep(2) : setError('Ingresa el nombre del negocio')} style={{ width: '100%', padding: '13px', marginTop: 4 }}>Continuar →</button>
          </div>
        )}

        {/* ── STEP 2: Account ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Tu nombre completo</label>
              <input className="input-neu" placeholder="Juan García" value={form.ownerName} onChange={e => set('ownerName')(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Correo electrónico</label>
              <input className="input-neu" type="email" placeholder="juan@negocio.com" value={form.email} onChange={e => set('email')(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Contraseña</label>
              <input className="input-neu" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => set('password')(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn-neu" onClick={() => setStep(1)} style={{ flex: 1, padding: '13px' }}>← Atrás</button>
              <button className="btn-neu btn-primary" onClick={() => form.email && form.password.length >= 8 ? setStep(3) : setError('Completa todos los campos')} style={{ flex: 2, padding: '13px' }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Plan ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PLANS.map(plan => (
              <button key={plan.slug} type="button" onClick={() => set('planSlug')(plan.slug)}
                className="btn-neu" style={{ padding: '14px 18px', justifyContent: 'space-between', background: form.planSlug === plan.slug ? 'var(--accent-blue-lt)' : 'var(--bg)', boxShadow: form.planSlug === plan.slug ? 'var(--neu-pressed)' : 'var(--neu-raised)', border: form.planSlug === plan.slug ? '2px solid var(--accent-blue)' : '2px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: plan.color }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{plan.name}</span>
                  {plan.popular && <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Popular</span>}
                </div>
                <span style={{ fontWeight: 700, color: plan.color, fontSize: '0.875rem' }}>{plan.price}</span>
              </button>
            ))}
            {error && <div style={{ background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>⚠ {error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn-neu" onClick={() => setStep(2)} style={{ flex: 1, padding: '13px' }}>← Atrás</button>
              <button className="btn-neu btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '13px' }}>
                {loading ? 'Creando tu cuenta...' : '🚀 Crear mi negocio'}
              </button>
            </div>
          </div>
        )}

        <div className="divider" style={{ margin: '24px 0' }} />
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
