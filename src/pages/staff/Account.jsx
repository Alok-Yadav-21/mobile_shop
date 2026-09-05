import { useAuth } from '@/hooks/useAuth.js'
import { BRANCHES } from '@/data/branches.js'
import { SignInDetailsCard } from '@/components/common/SignInDetailsCard.jsx'
import { ShieldCheck, MapPin } from 'lucide-react'

// A staff member's own account. Deliberately thin: name, branch and sign-in, nothing else.
// A technician does not administer their own record — their branch, job title and pay are set
// by an admin, and the adapter strips pay rates from every non-admin read anyway, so there is
// nothing here for them to edit that would not be an authorization question.
export default function StaffAccount(){
  const { user } = useAuth()
  const branch = BRANCHES.find(b=>b.id===user?.branch)

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-5">My account</h1>

      <div className="surface p-6 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand grid place-items-center flex-none"><ShieldCheck size={19}/></div>
        <div>
          <div className="font-bold text-[14px]">{user?.name}</div>
          <div className="text-[12.5px] text-graphite-400">{user?.jobTitle || 'Staff'} · {user?.email}</div>
        </div>
      </div>

      <div className="surface p-6 mt-4 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky grid place-items-center flex-none"><MapPin size={19}/></div>
        <div>
          <div className="font-bold text-[14px]">Home branch</div>
          <div className="text-[12.5px] text-graphite-400">{branch?.area || 'Not assigned'}</div>
        </div>
      </div>

      <div className="mt-4"><SignInDetailsCard/></div>

      <p className="text-[11.5px] text-graphite-400 mt-4">
        Your name, branch and job title are maintained by an admin. Ask your branch manager if
        any of it needs correcting.
      </p>
    </div>
  )
}
