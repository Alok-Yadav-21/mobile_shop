import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const forceMock = import.meta.env.VITE_FORCE_MOCK_BACKEND === 'true'

// True whenever the app should run on the local mock adapter instead of a live Supabase project —
// either because no project is configured yet, or because the mock is explicitly forced for demos.
export const isMockBackend = forceMock || !url || !anonKey

export const supabase = isMockBackend ? null : createClient(url, anonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})
