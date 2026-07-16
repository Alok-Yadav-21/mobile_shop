const STATS = [
  ['12,000+', 'Repairs completed'],
  ['4.9', 'Average customer rating'],
  ['8', 'Branches, one network'],
  ['3mo', 'Warranty as standard'],
]

export function StatsBand(){
  return (
    <section className="bg-ink-900 text-white">
      <div className="container-x py-14 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map(([n,l])=>(
          <div key={l} className="text-center lg:text-left">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight mono-data grad-text">{n}</div>
            <div className="text-[12.5px] text-slate-400 mt-2">{l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
