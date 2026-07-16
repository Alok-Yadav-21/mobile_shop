export function PageHero({ kicker, title, desc, children }){
  return (
    <section className="bg-ink-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid [background-size:26px_26px] opacity-[.3]" aria-hidden/>
      <div className="container-x relative py-14 sm:py-20">
        {kicker && <span className="kicker text-slate-500">{kicker}</span>}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-3 max-w-2xl leading-[1.08]">{title}</h1>
        {desc && <p className="text-slate-300 mt-4 max-w-xl text-[15.5px] leading-relaxed">{desc}</p>}
        {children}
      </div>
    </section>
  )
}
