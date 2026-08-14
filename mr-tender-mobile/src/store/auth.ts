import { create } from 'zustand'
import { supabase } from '../services/supabase'

interface AuthState {
  user: any | null
  session: any | null
  role: string | null
  tenantId: string | null
  loading: boolean
  error: string | null
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  tenantId: null,
  loading: false,
  error: null,

  login: async (email, pass) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error

      const user = data.user
      const role = user?.user_metadata?.role || 'seller'
      const tenantId = user?.user_metadata?.tenant_id || null

      set({ user, session: data.session, role, tenantId, loading: false })
      return true
    } catch (err: any) {
      set({ error: err.message, loading: false })
      return false
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, role: null, tenantId: null })
  },

  restoreSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const user = session.user
      const role = user?.user_metadata?.role || 'seller'
      const tenantId = user?.user_metadata?.tenant_id || null
      set({ user, session, role, tenantId })
    }
  }
}))
