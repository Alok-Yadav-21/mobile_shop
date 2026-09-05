import { createContext, useContext, useState, useCallback } from 'react'
import { AuthAPI, UserAPI } from '@/services/api.js'
import { setSession, clearSession } from '@/services/session.js'

const AuthContext = createContext(null)
const SESSION = 'vt_session'
// Persisted separately from the session rather than stored on the user object: the session is
// the actor the data layer authorises against, and a UI prompt has no business travelling with
// it. Keeping it in storage means refreshing the page cannot skip the forced password change.
const MUST_CHANGE = 'vt_must_change_password'

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

  // Single place a signed-in user is adopted, so the React tree, the ambient session and
  // storage can never disagree about who is signed in.
  const adopt = useCallback((u, must=false)=>{
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
    const u = await AuthAPI.registerCustomer(data)
    adopt(u, false)
    return u
  },[adopt])

  const logout = useCallback(()=>{
    setUser(null); clearSession(); setMustChangePassword(false)
    try{ localStorage.removeItem(SESSION); localStorage.removeItem(MUST_CHANGE) }catch{ /* ignore */ }
  },[])

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
