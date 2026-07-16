import { Link } from 'react-router-dom'
import { BRAND } from '@/constants/brand.js'
export function Logo({ light=false, sub=true }){
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand to-violet grid place-items-center text-white font-extrabold text-[17px] relative shadow-elevate transition-transform group-hover:scale-[1.04]">
        V<span className="absolute right-1.5 bottom-1.5 w-1 h-1 rounded-[1px] bg-white/90"/>
      </span>
      <span className="leading-tight">
        <span className={cnLight(light)}>{BRAND.name}</span>
        {sub && <span className={cnSub(light)}>{BRAND.tagline}</span>}
      </span>
    </Link>
  )
}
function cnLight(light){ return 'font-extrabold text-[18px] tracking-tight '+(light?'text-white':'text-ink') }
function cnSub(light){ return 'block text-[9.5px] tracking-[.12em] uppercase font-semibold '+(light?'text-white/45':'text-graphite-400') }
