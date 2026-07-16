const TONES = { brand:'bg-brand-50 text-brand', green:'bg-emerald-50 text-emerald-600', amber:'bg-amber-50 text-amber-600', violet:'bg-violet-50 text-violet-600' }
export function DashboardCard({ icon:Icon, label, value, tone='brand' }){
  return (
    <div className="bento-tile">
      {Icon && <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${TONES[tone]}`}><Icon size={19}/></div>}
      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mono-data">{value}</div>
      <div className="text-[12px] text-graphite-400 font-semibold mt-0.5">{label}</div>
    </div>
  )
}
