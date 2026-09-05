import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { ROLE_HOME } from '@/constants/roles.js'
import { Logo } from '@/components/common/Logo.jsx'
import { SignInDetailsCard } from '@/components/common/SignInDetailsCard.jsx'

// Where a staff member lands the first time they sign in with a password an admin typed for
// them. An issued password is a shared secret — the admin knows it, and it may have been read
// off a slip of paper — so it is replaced before the account is used for anything.
//
// The forced state is not enforced by this page. RoleBasedRoute redirects here for as long as
// the account is flagged, and the flag is only cleared by AuthAPI.changeOwnPassword actually
// succeeding, so navigating away by hand comes straight back.
export default function SetPassword(){
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <div className="min-h-screen grid place-items-center bg-graphite-50 p-5">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo/></div>
        <div className="text-center mb-5">
          <h1 className="text-xl font-extrabold tracking-tight">Set your own password</h1>
          <p className="text-[13px] text-graphite-400 mt-1">Signed in as {user?.name}</p>
        </div>

        <SignInDetailsCard forced onChanged={()=>nav(ROLE_HOME[user?.role] || '/', { replace:true })}/>

        <p className="text-center text-[12px] text-graphite-400 mt-5">
          Not you? <button onClick={()=>{ logout(); nav('/login', { replace:true }) }} className="hover:text-brand underline">Sign out</button>
        </p>
      </div>
    </div>
  )
}
