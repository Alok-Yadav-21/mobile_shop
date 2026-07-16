import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHero } from '@/components/common/PageHero.jsx'
import { BRAND } from '@/constants/brand.js'
import { BRANCHES } from '@/data/branches.js'
import { Phone, Mail, MapPin } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2,'Enter your name'),
  email: z.string().email('Enter a valid email'),
  message: z.string().min(10,'Tell us a little more (10+ characters)'),
})

export default function Contact(){
  const [sent,setSent]=useState(false)
  const { register, handleSubmit, formState:{ errors, isSubmitting }, reset } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ()=>{
    await new Promise(r=>setTimeout(r,500))
    setSent(true); reset(); toast.success('Message sent — we\'ll get back to you shortly.')
  }

  return (<>
    <PageHero kicker="Contact" title="Talk to Virktech" desc="Questions about a repair, an order, or a branch? Reach us directly, or send a message below."/>

    <section className="container-x section-pad">
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <a href={`tel:${BRAND.phone.replace(/\s+/g,'')}`} className="bento-tile flex items-center gap-3"><Phone className="text-brand" size={20}/><div><div className="font-bold text-[14px]">Call us</div><div className="text-[12.5px] text-graphite-400 mono-data">{BRAND.phone}</div></div></a>
        <a href={`mailto:${BRAND.email}`} className="bento-tile flex items-center gap-3"><Mail className="text-brand" size={20}/><div><div className="font-bold text-[14px]">Email</div><div className="text-[12.5px] text-graphite-400 mono-data">{BRAND.email}</div></div></a>
        <div className="bento-tile flex items-center gap-3"><MapPin className="text-brand" size={20}/><div><div className="font-bold text-[14px]">Branches</div><div className="text-[12.5px] text-graphite-400">8 · London & Kent</div></div></div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-4">Send a message</h2>
          {sent ? (
            <div className="surface p-6 text-[14px] text-graphite-600">Thanks — your message has been sent. We typically reply within one working day.</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="surface p-6 space-y-4">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Name</span>
                <input {...register('name')} className="input-field mt-1.5"/>
                {errors.name && <span className="text-[11.5px] text-red-500">{errors.name.message}</span>}</label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span>
                <input {...register('email')} className="input-field mt-1.5"/>
                {errors.email && <span className="text-[11.5px] text-red-500">{errors.email.message}</span>}</label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Message</span>
                <textarea {...register('message')} rows={4} className="input-field mt-1.5 h-auto py-2"/>
                {errors.message && <span className="text-[11.5px] text-red-500">{errors.message.message}</span>}</label>
              <button type="submit" disabled={isSubmitting} className="btn btn-brand w-full disabled:opacity-60">{isSubmitting?'Sending…':'Send message'}</button>
            </form>
          )}
        </div>

        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-4">Our branches</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {BRANCHES.map(b=>(
              <div key={b.id} className="bento-tile">
                <div className="font-bold text-[14px]">{b.area.split('—')[0].trim()}</div>
                <div className="text-[11.5px] text-graphite-400">{b.local}</div>
                <div className="text-[13px] text-graphite-500 mt-2">{b.addr} · <span className="mono-data">{b.pc}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  </>)
}
