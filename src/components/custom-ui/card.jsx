import { cn } from '@/lib/cn.js'
export function Card({ className, ...p }){ return <div className={cn('card', className)} {...p} /> }
export function CardBody({ className, ...p }){ return <div className={cn('p-5', className)} {...p} /> }
