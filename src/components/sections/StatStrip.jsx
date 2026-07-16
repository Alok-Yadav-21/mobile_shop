const STATS = [
  ['8', 'Branches across London & Kent'],
  ['3mo', 'Warranty on every repair'],
  ['15m', 'Average diagnostic time'],
  ['4%', 'Loyalty back on every visit'],
]
export function StatStrip(){
  return (
    <div className="hairline-t border-b border-graphite-200 bg-paper">
      <div className="container-x grid grid-cols-2 lg:grid-cols-4 divide-x divide-graphite-200">
        {STATS.map(([n,l])=>(
          <div key={l} className="py-5 px-5 sm:px-6">
            <div className="text-[26px] sm:text-[30px] font-extrabold tracking-tight mono-data leading-none">{n}</div>
            <div className="text-[12px] text-graphite-400 mt-1.5 leading-snug max-w-[16ch]">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
