import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  // Exclude static assets and PWA files from auth check
  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/_next') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|webmanifest|json)$/i.test(pathname)
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that don't need auth
  const publicRoutes = ['/', '/login', '/register', '/pricing']
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith('/auth') || pathname.startsWith('/store/'))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const role = user.app_metadata?.role || user.user_metadata?.role
    const isSuperadmin = role === 'superadmin'
    return NextResponse.redirect(new URL(isSuperadmin ? '/superadmin' : '/dashboard', request.url))
  }

  // Protect superadmin routes (must have superadmin in app_metadata or fallback)
  if (pathname.startsWith('/superadmin')) {
    const role = user?.app_metadata?.role || user?.user_metadata?.role
    if (role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js)$).*)'],
}
