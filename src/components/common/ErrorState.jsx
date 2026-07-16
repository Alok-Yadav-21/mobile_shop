import { AlertTriangle, RotateCw } from 'lucide-react'

export function ErrorState({ error, onRetry }){
  return (
    <div className="surface p-8 text-center">
      <AlertTriangle size={22} className="mx-auto text-rose-500"/>
      <div className="font-semibold text-[14px] mt-3">Couldn't load this data</div>
      <p className="text-[12.5px] text-graphite-400 mt-1">{error?.message || 'Something went wrong. Please try again.'}</p>
      {onRetry && <button onClick={onRetry} className="btn btn-ghost btn-sm mt-4 mx-auto"><RotateCw size={13}/> Retry</button>}
    </div>
  )
}
