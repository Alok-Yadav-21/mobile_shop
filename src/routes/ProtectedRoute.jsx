import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
// Requires any authenticated user; otherwise -> /login
export function ProtectedRoute({ children }){
  const { isAuthed } = useAuth() || {}
  const loc = useLocation()
  if(!isAuthed) return <Navigate to="/login" state={{ from: loc.pathname }} replace/>
  return children
}
