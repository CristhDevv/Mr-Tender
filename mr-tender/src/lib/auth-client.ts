import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Robust logout function that guarantees the user is always redirected to /login
 * even if Supabase network calls hang or fail, and clears all client-side auth tokens.
 */
export async function performLogout(supabase: SupabaseClient, targetUrl = '/login'): Promise<void> {
  try {
    // 1. Attempt Supabase signOut with a strict 800ms timeout so it never hangs
    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 800))
    ])
  } catch (err) {
    console.error('SignOut error ignored for clean exit:', err)
  } finally {
    // 2. Wipe all local storage & session storage tokens
    try {
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('mr_tender'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
        sessionStorage.clear()

        // 3. Clear auth cookies manually on document if available
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            if (name.startsWith('sb-') || name.includes('auth') || name.includes('token')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`
            }
          }
        }
      }
    } catch (storageErr) {
      console.error('Storage clear error:', storageErr)
    }

    // 4. Hard redirect to target URL to completely wipe React state, in-memory caches, and headers
    if (typeof window !== 'undefined') {
      window.location.replace(targetUrl)
    }
  }
}
