import { createContext, useContext, useState, useCallback } from 'react'
import { USERS } from '@/data/users.js'
import { UserAPI } from '@/services/api.js'
import { setSession, clearSession } from '@/services/session.js'

const AuthContext = createContext(null)
const SESSION = 'vt_session'

export function AuthProvider({ children }){
  // The data layer authorises against the same session (src/services/session.js). Every
  // path that changes who is signed in must update both, or the adapter would keep scoping
  // reads to the previous user.
  const [user, setUser] = useState(()=>{
    try{ const s=localStorage.getItem(SESSION); const u = s?JSON.parse(s):null; setSession(u); return u }
    catch{ setSession(null); return null }
  })

  const login = useCallback((email, _password, roleHint)=>{
    // Mock auth: match a demo user by email, else create one with the chosen role.
    let found = USERS.find(u=>u.email.toLowerCase()===String(email).toLowerCase())
    if(!found) found = { id:'u'+Date.now(), name: email.split('@')[0]||'User', email, role: roleHint||'customer' }
    setUser(found); setSession(found); try{ localStorage.setItem(SESSION, JSON.stringify(found)) }catch{}
    UserAPI.touchActivity?.(found.id)?.catch?.(()=>{})
    return found
  },[])

  const register = useCallback((data)=>{
    const u = { id:'u'+Date.now(), role:'customer', ...data }
    setUser(u); setSession(u); try{ localStorage.setItem(SESSION, JSON.stringify(u)) }catch{}; return u
  },[])

  const logout = useCallback(()=>{ setUser(null); clearSession(); try{ localStorage.removeItem(SESSION) }catch{} },[])

  const updateProfile = useCallback((patch)=>{
    setUser(prev=>{ const next = { ...prev, ...patch }; setSession(next); try{ localStorage.setItem(SESSION, JSON.stringify(next)) }catch{}; return next })
  },[])

  const value = { user, role:user?.role||null, isAuthed:!!user, login, register, logout, updateProfile,
    hasRole:(...r)=>user&&r.includes(user.role) }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuthContext = ()=>useContext(AuthContext)
