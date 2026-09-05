import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { ROLE_HOME } from '@/constants/roles.js'
// Requires auth AND a matching role; wrong role -> their own home; not signed in -> /login.
//
// An account still carrying an admin-issued password is held at /set-password: it is flagged
// until AuthAPI.changeOwnPassword succeeds, so typing a URL cannot skip past it.
export function RoleBasedRoute({ allow=[], children }){
  const { isAuthed, role, mustChangePassword } = useAuth() || {}
  if(!isAuthed) return <Navigate to="/login" replace/>
  if(mustChangePassword) return <Navigate to="/set-password" replace/>
  if(!allow.includes(role)) return <Navigate to={ROLE_HOME[role] || '/'} replace/>
  return children
}
