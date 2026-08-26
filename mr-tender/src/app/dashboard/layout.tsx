'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/hooks/usePermissions'
import CopilotWidget from '@/components/CopilotWidget'
import { ALL_SYSTEM_MODULES } from '@/lib/constants/modules'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingBag,
  DollarSign,
  BarChart3,
  BookOpen,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  Plus,
  Pill,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Receipt,
  Wrench,
  Wine,
  UtensilsCrossed,
  Scissors,
  Dog,
  Car,
  Shirt,
  Dumbbell,
  Footprints,
  Glasses,
  Croissant,
  Briefcase,
  TrendingUp,
  Landmark,
  ChefHat,
  Flame,
  Clock,
  Activity,
  Sparkles,
  ShieldCheck,
  Thermometer,
  Calendar,
  Percent,
  Globe,
  FileText,
  RotateCcw,
  GlassWater,
  Stethoscope,
  Syringe
} from 'lucide-react'

interface NavSubItem {
  href: string
  label: string
  Icon: any
  moduleKey?: string
  requiredPermission?: string
}

interface NavSection {
  id: string
  label: string
  Icon: any
  href?: string
  items?: NavSubItem[]
}

const NAV_SECTIONS: NavSection[] = [
  // 1. INICIO
  {
    id: 'dashboard',
    label: 'Inicio',
    Icon: LayoutDashboard,
    href: '/dashboard'
  },

  // 2. VENTAS
  {
    id: 'sales',
    label: 'Ventas',
    Icon: ShoppingCart,
    items: [
      { href: '/pos',                   Icon: ShoppingCart,    label: 'POS',          moduleKey: 'pos',            requiredPermission: 'pos.view' },
      { href: '/cash',                  Icon: DollarSign,      label: 'Caja',         moduleKey: 'cash',           requiredPermission: 'cash.view' },
      { href: '/hardware/quotes',       Icon: FileText,        label: 'Cotizaciones', moduleKey: 'hardware',       requiredPermission: 'pos.view' },
      { href: '/crm',                   Icon: TrendingUp,      label: 'CRM',          moduleKey: 'crm',            requiredPermission: 'pos.view' },
      { href: '/ecommerce',             Icon: Globe,           label: 'E-commerce',   moduleKey: 'ecommerce',      requiredPermission: 'settings.view' },
      { href: '/restaurant/tables',     Icon: UtensilsCrossed, label: 'Mesas',        moduleKey: 'restaurant',     requiredPermission: 'pos.view' },
      { href: '/salon/agenda',          Icon: Calendar,        label: 'Agenda',       moduleKey: 'beauty_salon',   requiredPermission: 'pos.view' },
      { href: '/laundry/orders',        Icon: Shirt,           label: 'Recepción',    moduleKey: 'laundry',        requiredPermission: 'pos.view' },
      { href: '/automotive/orders',     Icon: Car,             label: 'Taller',       moduleKey: 'automotive',     requiredPermission: 'pos.view' },
      { href: '/bakery/custom-orders',  Icon: Croissant,       label: 'Encargos',     moduleKey: 'bakery',         requiredPermission: 'pos.view' },
      { href: '/gym/classes',           Icon: Users,           label: 'Clases',       moduleKey: 'gym',            requiredPermission: 'pos.view' },
      { href: '/estanco/combos',        Icon: Sparkles,        label: 'Combos',       moduleKey: 'liquor_tobacco', requiredPermission: 'pos.view' },
      { href: '/apparel/lookbooks',     Icon: Sparkles,        label: 'Lookbooks',    moduleKey: 'apparel',        requiredPermission: 'pos.view' }
    ]
  },

  // 3. FACTURACIÓN
  {
    id: 'invoicing',
    label: 'Facturación',
    Icon: Receipt,
    items: [
      { href: '/invoices',              Icon: Receipt,         label: 'Facturas',     moduleKey: 'pos',            requiredPermission: 'pos.view' },
      { href: '/purchases/support-doc', Icon: FileText,        label: 'Soportes',     moduleKey: 'purchases',      requiredPermission: 'purchases.view' }
    ]
  },

  // 4. INVENTARIO
  {
    id: 'catalog',
    label: 'Inventario',
    Icon: Package,
    items: [
      { href: '/products',              Icon: Package,         label: 'Productos',    moduleKey: 'inventory',      requiredPermission: 'products.view' },
      { href: '/inventory',             Icon: Boxes,           label: 'Kardex',       moduleKey: 'inventory',      requiredPermission: 'inventory.view' },
      { href: '/warehouses',            Icon: Building2,       label: 'Bodegas',      moduleKey: 'inventory',      requiredPermission: 'inventory.view' },
      { href: '/pharmacy/medicines',    Icon: Pill,            label: 'Medicamentos', moduleKey: 'pharmacy',       requiredPermission: 'products.view' },
      { href: '/pharmacy/lots',         Icon: Clock,           label: 'Lotes',        moduleKey: 'pharmacy',       requiredPermission: 'inventory.view' },
      { href: '/restaurant/recipes',    Icon: UtensilsCrossed, label: 'Recetas',      moduleKey: 'restaurant',     requiredPermission: 'products.view' },
      { href: '/bakery/recipes',        Icon: Croissant,       label: 'Fichas',       moduleKey: 'bakery',         requiredPermission: 'products.view' },
      { href: '/apparel/matrix',        Icon: Shirt,           label: 'Variantes',    moduleKey: 'apparel',        requiredPermission: 'products.view' },
      { href: '/estanco/returns',       Icon: RotateCcw,       label: 'Retornables',  moduleKey: 'liquor_tobacco', requiredPermission: 'products.view' }
    ]
  },

  // 5. COMPRAS
  {
    id: 'procurement',
    label: 'Compras',
    Icon: Truck,
    items: [
      { href: '/purchases',             Icon: ShoppingBag,     label: 'Compras',      moduleKey: 'purchases',      requiredPermission: 'purchases.view' },
      { href: '/suppliers',             Icon: Truck,           label: 'Proveedores',  moduleKey: 'suppliers',      requiredPermission: 'suppliers.view' }
    ]
  },

  // 6. CLIENTES
  {
    id: 'customers',
    label: 'Clientes',
    Icon: Users,
    items: [
      { href: '/customers',             Icon: Users,           label: 'Directorio',   moduleKey: 'customers',      requiredPermission: 'customers.view' },
      { href: '/gym/members',           Icon: Dumbbell,        label: 'Socios',       moduleKey: 'gym',            requiredPermission: 'customers.view' },
      { href: '/veterinary/pets',       Icon: Dog,             label: 'Pacientes',    moduleKey: 'veterinary',     requiredPermission: 'customers.view' },
      { href: '/veterinary/clinical',   Icon: Stethoscope,     label: 'Consultas',    moduleKey: 'veterinary',     requiredPermission: 'customers.view' },
      { href: '/optometry/patients',    Icon: Glasses,         label: 'Fórmulas',     moduleKey: 'optometry',      requiredPermission: 'customers.view' }
    ]
  },

  // 7. OPERACIONES
  {
    id: 'operations',
    label: 'Operaciones',
    Icon: ChefHat,
    items: [
      { href: '/restaurant/kds',        Icon: Flame,           label: 'Cocina',       moduleKey: 'restaurant',     requiredPermission: 'pos.view' },
      { href: '/bakery/production',     Icon: Clock,           label: 'Producción',   moduleKey: 'bakery',         requiredPermission: 'inventory.view' },
      { href: '/gym/checkin',           Icon: Activity,        label: 'Check-in',     moduleKey: 'gym',            requiredPermission: 'pos.view' },
      { href: '/automotive/wash',       Icon: Sparkles,        label: 'Lavado',       moduleKey: 'automotive',     requiredPermission: 'pos.view' },
      { href: '/laundry/rack',          Icon: Boxes,           label: 'Percheros',    moduleKey: 'laundry',        requiredPermission: 'inventory.view' },
      { href: '/optometry/lab',         Icon: Glasses,         label: 'Laboratorio',  moduleKey: 'optometry',      requiredPermission: 'inventory.view' },
      { href: '/hardware/rentals',      Icon: Wrench,          label: 'Alquileres',   moduleKey: 'hardware',       requiredPermission: 'inventory.view' },
      { href: '/estanco/bar',           Icon: GlassWater,      label: 'Barra',        moduleKey: 'liquor_tobacco', requiredPermission: 'inventory.view' },
      { href: '/apparel/fitting-rooms', Icon: Footprints,      label: 'Probadores',   moduleKey: 'apparel',        requiredPermission: 'pos.view' },
      { href: '/veterinary/grooming',   Icon: Scissors,        label: 'Peluquería',   moduleKey: 'veterinary',     requiredPermission: 'pos.view' }
    ]
  },

  // 8. PERSONAL
  {
    id: 'employees',
    label: 'Personal',
    Icon: UserCheck,
    items: [
      { href: '/employees',             Icon: UserCheck,       label: 'Empleados',    moduleKey: 'employees',      requiredPermission: 'employees.view' },
      { href: '/payroll',               Icon: Briefcase,       label: 'Nómina',       moduleKey: 'payroll',        requiredPermission: 'employees.view' },
      { href: '/salon/commissions',     Icon: Percent,         label: 'Comisiones',   moduleKey: 'beauty_salon',   requiredPermission: 'accounting.view' }
    ]
  },

  // 9. FINANZAS
  {
    id: 'finance',
    label: 'Finanzas',
    Icon: BarChart3,
    items: [
      { href: '/reports',               Icon: BarChart3,       label: 'Reportes',     moduleKey: 'reports',        requiredPermission: 'reports.sales' },
      { href: '/treasury',              Icon: Landmark,        label: 'Tesorería',    moduleKey: 'treasury',       requiredPermission: 'accounting.view' },
      { href: '/accounting',            Icon: BookOpen,        label: 'Contabilidad', moduleKey: 'accounting',     requiredPermission: 'accounting.view' }
    ]
  },

  // 10. CALIDAD
  {
    id: 'compliance',
    label: 'Calidad',
    Icon: ShieldCheck,
    items: [
      { href: '/pharmacy/temperature',  Icon: Thermometer,     label: 'Temperatura',  moduleKey: 'pharmacy',       requiredPermission: 'inventory.view' },
      { href: '/veterinary/vaccines',   Icon: Syringe,         label: 'Vacunación',   moduleKey: 'veterinary',     requiredPermission: 'customers.view' }
    ]
  },

  // 11. ADMINISTRACIÓN
  {
    id: 'admin',
    label: 'Administración',
    Icon: Settings,
    items: [
      { href: '/settings',              Icon: Settings,        label: 'Configuración',                              requiredPermission: 'settings.view' }
    ]
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { roleName, color, isAdmin, hasPermission, loading: permsLoading } = usePermissions()
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [user, setUser] = useState<{ full_name?: string; email?: string } | null>(null)
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    const defaultMods: Record<string, boolean> = {}
    ALL_SYSTEM_MODULES.forEach(m => {
      defaultMods[m.id] = m.defaultEnabled
    })
    return defaultMods
  })

  // Load user, module settings & saved collapsed preference
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('mr_tender_sidebar_collapsed')
      if (savedCollapsed === 'true') setCollapsed(true)
    } catch {}

    async function loadUserAndModules() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ full_name: user.user_metadata?.full_name, email: user.email })
        let tid = user.app_metadata?.tenant_id || user.app_metadata?.tenantId || user.user_metadata?.tenant_id

        // Fallback: resolve tenant_id if not present directly in auth app_metadata
        if (!tid) {
          const { data: userData } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .limit(1)

          if (userData?.[0]?.tenant_id) {
            tid = userData[0].tenant_id
          } else {
            const { data: ptData } = await supabase
              .from('platform_tenants')
              .select('id')
              .eq('owner_email', user.email)
              .limit(1)

            if (ptData?.[0]?.id) {
              tid = ptData[0].id
            }
          }
        }

        if (tid) {
          const { data: tData } = await supabase
            .from('tenant_settings')
            .select('enabled_modules')
            .eq('tenant_id', tid)
            .limit(1)

          if (tData?.[0]?.enabled_modules) {
            const defaultMods: Record<string, boolean> = {}
            ALL_SYSTEM_MODULES.forEach(m => { defaultMods[m.id] = m.defaultEnabled })
            setEnabledModules({ ...defaultMods, ...tData[0].enabled_modules })
          }
        }
      }
    }
    loadUserAndModules()
  }, [])

  // Auto-expand group that contains current active route
  useEffect(() => {
    NAV_SECTIONS.forEach(sec => {
      if (sec.items?.some(it => pathname === it.href || (it.href !== '/dashboard' && pathname.startsWith(it.href)))) {
        setOpenGroups(prev => ({ ...prev, [sec.id]: true }))
      }
    })
  }, [pathname])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('mr_tender_sidebar_collapsed', String(next)) } catch {}
      return next
    })
  }

  function toggleGroup(groupId: string) {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // Filter items strictly by enabled module first, then by role permissions
  function filterItems(items?: NavSubItem[]) {
    if (!items) return []
    return items.filter(item => {
      // 1. If item belongs to a specific module and that module is not active, hide it immediately
      if (item.moduleKey && !enabledModules[item.moduleKey]) return false

      // 2. Admins have access to all enabled modules
      if (isAdmin) return true

      // 3. For other roles, check granular permissions
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false

      return true
    })
  }

  // Check if current page is authorized for user and module is enabled
  const allSubItems = NAV_SECTIONS.flatMap(s => s.items || (s.href ? [{ href: s.href, label: s.label, Icon: s.Icon, moduleKey: undefined, requiredPermission: undefined }] : []))
  const currentNavItem = allSubItems.find(i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))
  const isModuleEnabled = !currentNavItem?.moduleKey || !!enabledModules[currentNavItem.moduleKey]
  const isRoleAuthorized = isAdmin || !currentNavItem?.requiredPermission || hasPermission(currentNavItem.requiredPermission)
  const isPageAuthorized = isModuleEnabled && isRoleAuthorized

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name?: string) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />}

      {/* ── SIDEBAR (ORGANIZED IN COMPACT PROFESSIONAL SUBMENUS) ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        
        {/* Brand Header with Collapse Toggle Button */}
        <div style={{
          padding: collapsed ? '14px 10px' : '14px 14px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
          flexShrink: 0
        }}>
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            title="Mr Tender - Panel Principal"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
          >
            <img src="/logo.png" alt="Mr Tender" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
            <div className="sidebar-brand-text" style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Mr Tender
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Gestión Empresarial
              </div>
            </div>
          </Link>

          {/* Desktop Collapse Button */}
          <button
            onClick={toggleCollapsed}
            className="btn-neu btn-ghost sidebar-collapse-btn"
            title={collapsed ? "Expandir menú lateral" : "Colapsar a iconos"}
            style={{
              padding: '5px',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              display: collapsed ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ChevronLeft size={15} />
          </button>
        </div>

        {/* Small Expand Button when Collapsed */}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 6px', flexShrink: 0 }}>
            <button
              onClick={toggleCollapsed}
              className="btn-neu btn-ghost"
              title="Expandir menú lateral"
              style={{ padding: '5px', borderRadius: 6, color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        <div className="divider" style={{ margin: collapsed ? '0 10px 8px' : '0 12px 8px' }} />

        {/* Navigation Sections with Accordion Submenus */}
        <nav style={{ flex: 1, padding: collapsed ? '0 6px' : '0 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_SECTIONS.map(section => {
            // If single link (e.g. Inicio)
            if (section.href) {
              const Icon = section.Icon
              const isActive = pathname === section.href
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  title={section.label}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={17} strokeWidth={2} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.85 }} />
                  <span>{section.label}</span>
                </Link>
              )
            }

            // Submenu Accordion Group
            const visibleSubItems = filterItems(section.items)
            if (visibleSubItems.length === 0) return null

            const isGroupOpen = openGroups[section.id] ?? false
            const hasActiveChild = visibleSubItems.some(it => pathname === it.href || (it.href !== '/dashboard' && pathname.startsWith(it.href)))
            const GroupIcon = section.Icon

            // Collapsed Mode representation: click leads to first child
            if (collapsed) {
              return (
                <Link
                  key={section.id}
                  href={visibleSubItems[0].href}
                  title={`${section.label} (${visibleSubItems.map(i => i.label).join(', ')})`}
                  className={`sidebar-nav-item ${hasActiveChild ? 'active' : ''}`}
                >
                  <GroupIcon size={17} strokeWidth={2} style={{ flexShrink: 0, opacity: hasActiveChild ? 1 : 0.85 }} />
                </Link>
              )
            }

            return (
              <div key={section.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(section.id)}
                  className={`sidebar-group-header ${hasActiveChild ? 'has-active-child' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <GroupIcon size={16} strokeWidth={2} style={{ color: hasActiveChild ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                    <span>{section.label}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`sidebar-group-chevron ${isGroupOpen ? 'open' : ''}`}
                  />
                </button>

                {/* Submenu Accordion Items */}
                {isGroupOpen && (
                  <div className="sidebar-sub-menu animate-fade-in">
                    {visibleSubItems.map(subItem => {
                      const SubIcon = subItem.Icon
                      const isSubActive = pathname === subItem.href || (subItem.href !== '/dashboard' && pathname.startsWith(subItem.href))
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`sidebar-sub-item ${isSubActive ? 'active' : ''}`}
                        >
                          <SubIcon size={14} strokeWidth={2} style={{ opacity: isSubActive ? 1 : 0.75, flexShrink: 0 }} />
                          <span>{subItem.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User Profile & Role Footer */}
        <div className="divider" style={{ margin: collapsed ? '6px 8px 0' : '8px 12px 0' }} />
        
        <div className="user-footer-box" style={{ padding: collapsed ? '8px 4px' : '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: collapsed ? 0 : 4 }}>
            <div
              title={user?.full_name || 'Usuario'}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'var(--accent-blue-lt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.75rem',
                color: 'var(--accent-blue)',
                boxShadow: 'var(--neu-subtle)',
                flexShrink: 0
              }}
            >
              {getInitials(user?.full_name)}
            </div>

            <div className="user-info-text" style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || 'Usuario'}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Dynamic Role Badge */}
          <div className="role-pill-text" style={{ marginBottom: 6 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: 5,
              background: `${color}18`,
              color: color,
              border: `1px solid ${color}35`
            }}>
              <span>●</span>
              <span>{roleName}</span>
            </span>
          </div>

          <button
            className="btn-neu btn-ghost"
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              width: '100%',
              padding: collapsed ? '6px 0' : '6px 8px',
              fontSize: '0.75rem',
              justifyContent: 'center',
              color: 'var(--accent-coral)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <LogOut size={14} strokeWidth={2} />
            <span className="role-pill-text">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className={`app-content ${collapsed ? 'collapsed' : ''}`}>
        
        {/* Topbar Header */}
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {/* Mobile Toggle Button */}
            <button className="btn-neu btn-ghost sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: '7px 10px', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Menu size={16} strokeWidth={2} />
              <span>Menú</span>
            </button>

            {/* Clickable Brand Logo in Topbar */}
            <Link href="/dashboard" title="Mr Tender - Ir a Inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img src="/logo.png" alt="Mr Tender" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'contain' }} />
            </Link>

            <div style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

            {/* Current Page Title */}
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {allSubItems.find(i => i.href === pathname)?.label || 'Panel de Control'}
            </div>
          </div>

          {pathname !== '/pos' && hasPermission('pos.create_sale') && (
            <Link href="/pos" className="btn-neu btn-primary" style={{ padding: '7px 12px', fontSize: '0.78rem', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} strokeWidth={2.5} />
              <span>Nueva venta</span>
            </Link>
          )}
        </header>

        {/* Page or Access Denied Guard */}
        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1400, width: '100%', overflowX: 'hidden' }}>
          {!permsLoading && !isPageAuthorized ? (
            <div className="neu-card animate-scale-in" style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '60px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-coral-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-coral)' }}>
                <Lock size={28} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {!isModuleEnabled ? 'Módulo Desactivado' : 'Acceso Restringido'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {!isModuleEnabled
                  ? 'Este módulo no se encuentra activo para tu negocio. Puedes solicitar su activación al administrador de la plataforma desde el panel de gestión.'
                  : `Tu rol actual (${roleName}) no tiene permisos asignados para acceder a esta sección.`}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Link href="/dashboard" className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  Ir al Inicio
                </Link>
                {enabledModules.pos && (
                  <Link href="/pos" className="btn-neu btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    Ir al POS
                  </Link>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Omnipresent AI Assistant Widget */}
      <CopilotWidget />
    </div>
  )
}
