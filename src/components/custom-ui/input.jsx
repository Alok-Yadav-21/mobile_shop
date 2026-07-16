import { cn } from '@/lib/cn.js'
export function Input({ className, ...p }){
  return <input className={cn('w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand transition', className)} {...p} />
}
export function Select({ className, children, ...p }){
  return <select className={cn('w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand bg-white', className)} {...p}>{children}</select>
}
export function Textarea({ className, ...p }){
  return <textarea className={cn('w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand transition', className)} {...p} />
}
export function Label({ className, ...p }){
  return <label className={cn('block text-[12.5px] font-semibold text-slate-600 mb-1.5', className)} {...p} />
}
