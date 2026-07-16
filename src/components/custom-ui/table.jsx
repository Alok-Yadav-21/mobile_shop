import { cn } from '@/lib/cn.js'
export function Table({ className, ...p }){ return <table className={cn('w-full border-collapse', className)} {...p} /> }
export function Th({ className, ...p }){ return <th className={cn('text-left text-[11px] uppercase tracking-wide text-slate-400 font-bold px-4 py-3 border-b border-slate-100', className)} {...p} /> }
export function Td({ className, ...p }){ return <td className={cn('px-4 py-3 border-b border-slate-100 text-[13.5px]', className)} {...p} /> }
