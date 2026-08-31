import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dysvpqdgqpidieshwrgv.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5c3ZwcWRncXBpZGllc2h3cmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NTkzOTksImV4cCI6MjEwMjIzNTM5OX0.PU41_9Q5BcHyvS3Eb5uBjZ7e57yTq3HWjK9rP6tVYMc'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // 1. Exclude static assets, API routes, and PWA files from middleware processing
  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|webmanifest|json)$/i.test(pathname)
  ) {
    return supabaseResponse
  }

  // 2. Public routes definition
  const publicRoutes = ['/', '/login', '/register', '/pricing']
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith('/auth') || pathname.startsWith('/store/'))

  // 3. Fast cookie inspection: check if any Supabase session cookies exist
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(c => c.name.startsWith('sb-') && (c.name.includes('auth-token') || c.name.includes('access-token')))

  // If no auth cookie exists:
  if (!hasAuthCookie) {
    if (isPublic) {
      return supabaseResponse
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Auth cookie exists, verify user with strict timeout
  try {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
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

    // Strict 2500ms timeout to guarantee middleware never hangs Vercel
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase auth timeout')), 2500)
    )

    const authResult = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise
    ])

    const user = authResult.data?.user

    if (!user && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && (pathname === '/login' || pathname === '/register')) {
      const role = user.app_metadata?.role || user.user_metadata?.role
      const isSuperadmin = role === 'superadmin'
      return NextResponse.redirect(new URL(isSuperadmin ? '/superadmin' : '/dashboard', request.url))
    }

    // Protect superadmin routes
    if (pathname.startsWith('/superadmin')) {
      const role = user?.app_metadata?.role || user?.user_metadata?.role
      if (role !== 'superadmin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware Error]:', error)
    // On timeout or failure, allow public routes or redirect to login safely
    if (isPublic) {
      return supabaseResponse
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|manifest.json|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js)$).*)'],
}
