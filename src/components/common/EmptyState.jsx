export function EmptyState({ title='Nothing here yet', hint }){
  return <div className="text-center py-16 text-slate-400"><div className="font-semibold text-slate-500">{title}</div>{hint&&<div className="text-sm mt-1">{hint}</div>}</div>
}
