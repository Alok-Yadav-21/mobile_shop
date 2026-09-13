import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { AuthAPI, UserAPI } from '@/services/api.js'
import { setSession, clearSession } from '@/services/session.js'

const AuthContext = createContext(null)
const SESSION = 'vt_session'
// Persisted separately from the session rather than stored on the user object: the session is
// the actor the data layer authorises against, and a UI prompt has no business travelling with
// it. Keeping it in storage means refreshing the page cannot skip the forced password change.
const MUST_CHANGE = 'vt_must_change_password'

// Toasts are raised against the screen, not against the account, and the Toaster is mounted
// above the router — so one outlives a change of user. An admin assigning a job is told "SPR-4805
// assigned to Priya Shah — they have been notified", and that message was still standing when the
// next person signed in. Told to a customer, it names a technician and says the shop has been
// spoken to: the workshop's business, not theirs.
//
// Stored notifications never had this problem — they carry a profile_id and the database only
// returns your own. This is the one channel that was addressed to nobody.
function dropOnScreenNotices() { toast.dismiss() }

export function AuthProvider({ children }){
  // The data layer authorises against the same session (src/services/session.js). Every path
  // that changes who is signed in must update both, or the adapter would keep scoping reads to
  // the previous user.
  const [user, setUser] = useState(()=>{
    try{ const s=localStorage.getItem(SESSION); const u = s?JSON.parse(s):null; setSession(u); return u }
    catch{ setSession(null); return null }
  })
  const [mustChangePassword, setMustChangePassword] = useState(()=>{
    try{ return localStorage.getItem(MUST_CHANGE)==='1' }catch{ return false }
  })

  // Who this tab believes is signed in, kept where a listener can read it without waiting for a
  // render. null means nobody — either signed out, or a sign-in still in flight, and in both
  // cases there is nothing here to protect.
  const signedInAs = useRef(user?.id ?? null)

  // Single place a signed-in user is adopted, so the React tree, the ambient session and
  // storage can never disagree about who is signed in.
  const adopt = useCallback((u, must=false)=>{
    dropOnScreenNotices()
    signedInAs.current = u?.id ?? null
    setUser(u); setSession(u); setMustChangePassword(must)
    try{
      localStorage.setItem(SESSION, JSON.stringify(u))
      if(must) localStorage.setItem(MUST_CHANGE,'1'); else localStorage.removeItem(MUST_CHANGE)
    }catch{ /* storage unavailable — the in-memory session still works for this tab */ }
  },[])

  // Verification happens in the data layer (AuthAPI), not here: this only carries the answer
  // into React state. There is no role argument — which area someone lands in is decided by
  // the account they signed into, never by what the sign-in form asked for.
  const login = useCallback(async (identifier, password)=>{
    // Signing in replaces the browser's session, which the listener below sees before adopt runs.
    // Until it does, this tab has no settled opinion about who is here — saying so keeps the
    // listener from reading our own sign-in as somebody else arriving.
    signedInAs.current = null
    const { user:u, mustChangePassword:must } = await AuthAPI.signIn({ identifier, password })
    adopt(u, must)
    UserAPI.touchActivity?.(u.id)?.catch?.(()=>{})
    // Returned rather than read back off context: React state has not committed yet when the
    // caller resumes, so the sign-in screen would see the previous value and skip the forced
    // password change.
    return { user: u, mustChangePassword: must }
  },[adopt])

  // Public sign-up. AuthAPI.registerCustomer sets the role itself, so this cannot create a
  // staff or admin account no matter what the form sends.
  const register = useCallback(async (data)=>{
    signedInAs.current = null
    const u = await AuthAPI.registerCustomer(data)
    adopt(u, false)
    return u
  },[adopt])

  // Forgetting who was signed in, here and in the ambient session the data layer authorises
  // against. Split out from logout because the app has to do exactly this when the backend
  // session ends without anyone pressing anything.
  const forget = useCallback(()=>{
    dropOnScreenNotices()
    // Set here rather than in an effect, which would not run until after the render: a deliberate
    // sign-out reaches the listener below first and would otherwise announce itself as somebody
    // else taking the session over.
    const wasHere = signedInAs.current
    signedInAs.current = null
    setUser(null); clearSession(); setMustChangePassword(false)
    try{
      // Only if the shared record still describes the account this tab was showing. When a tab is
      // signed out because another one signed in, that other tab has already written its own
      // account here — and clearing it would log out the tab that is legitimately signed in the
      // moment it next reloaded.
      const stored = JSON.parse(localStorage.getItem(SESSION) || 'null')
      if(!stored || !wasHere || stored.id === wasHere){
        localStorage.removeItem(SESSION); localStorage.removeItem(MUST_CHANGE)
      }
    }catch{ /* ignore */ }
  },[])

  const logout = useCallback(()=>{
    forget()
    // The backend session is a separate thing from this one and outlives it if nobody says so:
    // on Supabase the tokens stay in the browser, and stay valid, until GoTrue is told. Not
    // awaited — signing out of the screen must not wait on the network, and the local state is
    // already gone either way.
    AuthAPI.signOut?.()?.catch?.(()=>{})
  },[forget])

  // Keeping this tab honest about who it is signed in as.
  //
  // There is one backend session per browser, shared by every tab, and the app's own record of
  // who is here is separate from it. When they disagree the screen lies: it keeps the old name
  // and role on display while every request it sends is authorised as whoever the session now
  // belongs to. That is how a customer's workspace came to be showing a technician's
  // notifications — the bell was reading exactly what it was entitled to read, as the technician.
  //
  // Signing this tab out is the only honest answer. Adopting the new account silently would move
  // somebody between roles without asking, and carrying on as the old one is the lie itself.
  useEffect(()=>AuthAPI.onSessionChanged?.((backendId)=>{
    const here = signedInAs.current
    if(here === null) return            // nobody to protect, or our own sign-in still in flight
    if(backendId === here) return       // same person — a token refresh, not a change
    forget()
    toast.error(backendId
      ? 'Signed out here — another account signed in on this browser.'
      : 'Your session has ended — please sign in again.')
  }),[forget])

  const clearMustChangePassword = useCallback(()=>{
    setMustChangePassword(false)
    try{ localStorage.removeItem(MUST_CHANGE) }catch{ /* ignore */ }
  },[])

  const updateProfile = useCallback((patch)=>{
    setUser(prev=>{ const next = { ...prev, ...patch }; setSession(next); try{ localStorage.setItem(SESSION, JSON.stringify(next)) }catch{ /* ignore */ }; return next })
  },[])

  const value = { user, role:user?.role||null, isAuthed:!!user, mustChangePassword,
    login, register, logout, updateProfile, clearMustChangePassword,
    hasRole:(...r)=>user&&r.includes(user.role) }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuthContext = ()=>useContext(AuthContext)
