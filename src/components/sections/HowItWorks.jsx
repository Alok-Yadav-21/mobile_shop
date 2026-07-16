const STEPS = [
  ['Book or walk in', 'Pick device, fault and branch — online or in store.'],
  ['Approve your quote', 'We confirm the price before any work begins.'],
  ['Track it live', 'Real-time status through to ready-for-collection.'],
  ['Collect or delivered', 'With a 3-month warranty on the repair.'],
]

export function HowItWorks(){
  return (
    <section className="bg-graphite-50 hairline-t border-b border-graphite-200">
      <div className="container-x section-pad">
        <div className="max-w-2xl">
          <span className="kicker">How it works</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">Repairs made simple</h2>
        </div>
        <div className="relative grid sm:grid-cols-4 gap-8 sm:gap-4 mt-12">
          <div className="hidden sm:block absolute top-[19px] left-[12.5%] right-[12.5%] h-px bg-graphite-200" aria-hidden/>
          {STEPS.map(([t,d],i)=>(
            <div key={t} className="relative">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-brand text-brand grid place-items-center font-bold text-[14px] mono-data relative z-10">{i+1}</div>
              <h3 className="font-bold text-[15.5px] mt-4">{t}</h3>
              <p className="text-[13px] text-graphite-400 mt-1.5 leading-relaxed max-w-[24ch]">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
