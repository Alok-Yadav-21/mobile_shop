import { Card } from '@/components/custom-ui/card.jsx'
import { Construction } from 'lucide-react'
// Styled placeholder so every route renders inside its layout while the module is built out.
export function PageStub({ title, desc, points=[] }){
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {desc && <p className="text-slate-500 mt-1.5 max-w-2xl">{desc}</p>}
      <Card className="p-8 mt-6 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand grid place-items-center flex-none"><Construction size={20}/></div>
        <div>
          <div className="font-bold">Module scaffolded — ready to build out</div>
          <p className="text-sm text-slate-500 mt-1">This page is wired into routing, the correct layout and role guard. The data model and API hooks are ready; the detailed UI plugs in here next.</p>
          {points.length>0 && <ul className="mt-3 grid gap-1.5 text-sm text-slate-600">{points.map(p=><li key={p} className="flex gap-2"><span className="text-brand">•</span>{p}</li>)}</ul>}
        </div>
      </Card>
    </div>
  )
}
