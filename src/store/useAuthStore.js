import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/database'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  // Initialise la session existante (à appeler au démarrage)
  init: async () => {
    if (!supabase) { set({ loading: false }); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await getProfile(session.user.id)
      set({ user: session.user, session, profile, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id)
        set({ user: session.user, session, profile })
      } else {
        set({ user: null, session: null, profile: null })
      }
    })
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return { data }
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { data }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const profile = await getProfile(user.id)
    set({ profile })
  },
}))

export default useAuthStore
