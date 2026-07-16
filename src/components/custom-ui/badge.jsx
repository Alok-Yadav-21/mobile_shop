import { cn } from '@/lib/cn.js'
export function Badge({ className, ...p }){
  return <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full', className)} {...p} />
}
