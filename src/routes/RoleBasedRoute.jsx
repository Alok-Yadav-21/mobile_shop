import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { ROLE_HOME } from '@/constants/roles.js'
// Requires auth AND a matching role; wrong role -> their own home; not signed in -> /login
export function RoleBasedRoute({ allow=[], children }){
  const { isAuthed, role } = useAuth() || {}
  if(!isAuthed) return <Navigate to="/login" replace/>
  if(!allow.includes(role)) return <Navigate to={ROLE_HOME[role] || '/'} replace/>
  return children
}
