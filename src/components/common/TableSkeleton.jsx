import { Skeleton } from '@/components/ui/skeleton.jsx'

export function TableSkeleton({ rows=5, cols=5 }){
  return (
    <div className="surface overflow-hidden">
      <div className="divide-y divide-graphite-200">
        {Array.from({length:rows}).map((_,r)=>(
          <div key={r} className="flex items-center gap-4 px-5 py-3.5">
            {Array.from({length:cols}).map((_,c)=>(
              <Skeleton key={c} className={`h-4 ${c===0?'w-32':'w-16'}`}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
