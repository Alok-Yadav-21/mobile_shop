import { cn } from '@/lib/cn.js'
const variants = {
  brand:'btn btn-brand', ghost:'btn btn-ghost', ink:'btn btn-ink',
  outline:'btn bg-transparent border border-white/30 text-white hover:bg-white/10',
}
export function Button({ variant='brand', size, className, as:Comp='button', ...props }){
  return <Comp className={cn(variants[variant], size==='sm'&&'btn-sm', className)} {...props} />
}
