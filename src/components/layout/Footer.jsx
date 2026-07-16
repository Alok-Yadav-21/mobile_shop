import { Link } from 'react-router-dom'
import { BRAND } from '@/constants/brand.js'
import { BRANCHES } from '@/data/branches.js'
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, ArrowUpRight } from 'lucide-react'

export function Footer(){
  return (
    <footer className="bg-ink-900 text-slate-300">
      <div className="container-x grid lg:grid-cols-12 gap-10 py-16">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand to-violet grid place-items-center text-white font-extrabold text-[17px]">V</span>
            <div><div className="text-white font-extrabold text-lg leading-none">{BRAND.name}</div>
              <div className="text-[9.5px] uppercase tracking-[.12em] text-slate-500 mt-1 font-semibold">{BRAND.tagline}</div></div>
          </div>
          <p className="text-sm text-slate-400 mt-5 max-w-xs leading-relaxed">Repairs, buying and selling for phones, laptops, MacBooks, audio and smart devices — one connected network across 8 branches.</p>
          <p className="text-[11.5px] text-slate-500 mt-3 mono-data">{BRAND.recognition}.</p>
          <div className="flex gap-2 mt-5">
            {[Instagram,Facebook,Youtube].map((I,i)=><a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/[.06] border border-white/10 grid place-items-center hover:border-brand hover:text-brand transition-colors"><I size={15}/></a>)}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h5 className="kicker text-slate-500 mb-4">Shop</h5>
          <ul className="space-y-2.5 text-[13.5px] text-slate-400">
            <li><Link to="/products" className="hover:text-white transition-colors">All products</Link></li>
            <li><Link to="/refurbished" className="hover:text-white transition-colors">Refurbished</Link></li>
            <li><Link to="/branches" className="hover:text-white transition-colors">Branches</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h5 className="kicker text-slate-500 mb-4">Repairs & sell</h5>
          <ul className="space-y-2.5 text-[13.5px] text-slate-400">
            <li><Link to="/app/book" className="hover:text-white transition-colors">Book a repair</Link></li>
            <li><Link to="/repair-services" className="hover:text-white transition-colors">Repair services</Link></li>
            <li><Link to="/buy-sell" className="hover:text-white transition-colors">Sell / trade-in</Link></li>
            <li><Link to="/app/repairs" className="hover:text-white transition-colors">Track a repair</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-4">
          <h5 className="kicker text-slate-500 mb-4">Branches</h5>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] text-slate-400 mono-data">
            {BRANCHES.map(b=><span key={b.id}>{b.area.split('—')[0]}</span>)}
          </div>
          <ul className="space-y-2.5 text-[13.5px] text-slate-400 mt-5 pt-5 border-t border-white/10">
            <li className="flex gap-2.5 items-center"><Phone size={14} className="text-brand"/> {BRAND.phone}</li>
            <li className="flex gap-2.5 items-center"><Mail size={14} className="text-brand"/> {BRAND.email}</li>
            <li className="flex gap-2.5 items-center"><MapPin size={14} className="text-brand"/> 8 branches · London & Kent</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x py-5 text-[12px] text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Virk Tech · {BRAND.recognition}</span>
          <span className="flex items-center gap-4">
            <Link to="/warranty" className="hover:text-white transition-colors">Warranty</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href={`mailto:${BRAND.email}`} className="hidden sm:inline-flex items-center gap-1 hover:text-white transition-colors">Contact <ArrowUpRight size={12}/></a>
          </span>
        </div>
      </div>
    </footer>
  )
}
