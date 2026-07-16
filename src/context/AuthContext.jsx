import { createContext, useContext, useState, useCallback } from 'react'
import { USERS } from '@/data/users.js'
import { UserAPI } from '@/services/api.js'

const AuthContext = createContext(null)
const SESSION = 'vt_session'

export function AuthProvider({ children }){
  const [user, setUser] = useState(()=>{ try{ const s=localStorage.getItem(SESSION); return s?JSON.parse(s):null }catch{ return null } })

  const login = useCallback((email, _password, roleHint)=>{
    // Mock auth: match a demo user by email, else create one with the chosen role.
    let found = USERS.find(u=>u.email.toLowerCase()===String(email).toLowerCase())
    if(!found) found = { id:'u'+Date.now(), name: email.split('@')[0]||'User', email, role: roleHint||'customer' }
    setUser(found); try{ localStorage.setItem(SESSION, JSON.stringify(found)) }catch{}
    UserAPI.touchActivity?.(found.id)?.catch?.(()=>{})
    return found
  },[])

  const register = useCallback((data)=>{
    const u = { id:'u'+Date.now(), role:'customer', ...data }
    setUser(u); try{ localStorage.setItem(SESSION, JSON.stringify(u)) }catch{}; return u
  },[])

  const logout = useCallback(()=>{ setUser(null); try{ localStorage.removeItem(SESSION) }catch{} },[])

  const updateProfile = useCallback((patch)=>{
    setUser(prev=>{ const next = { ...prev, ...patch }; try{ localStorage.setItem(SESSION, JSON.stringify(next)) }catch{}; return next })
  },[])

  const value = { user, role:user?.role||null, isAuthed:!!user, login, register, logout, updateProfile,
    hasRole:(...r)=>user&&r.includes(user.role) }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuthContext = ()=>useContext(AuthContext)
