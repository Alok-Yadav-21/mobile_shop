import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.jsx'

const FAQS = [
  { q:'How long does a typical repair take?', a:'Most screen, battery and charging-port repairs are completed same-day — often within an hour. Diagnostics always come first and take around 15 minutes, so you know the exact cost before any work begins.' },
  { q:'Is there a warranty on repairs?', a:'Yes — every repair carries a 3-month warranty covering the parts fitted and the labour involved, at any of our 8 branches.' },
  { q:'How does the sell / trade-in payout work?', a:'Bring your device in or arrange collection, we run a free diagnostic and grading check, then you\'re paid the same day by cash, bank transfer or store credit — whichever you prefer.' },
  { q:'Do I need to book online, or can I walk in?', a:'Both work. Booking online lets you pick a time slot and get a quote estimate in advance; all 8 branches also accept walk-ins for diagnostics and most repairs.' },
  { q:'What changes with "Smart Phones Repair" becoming Virktech?', a:'Nothing changes about the service, staff or branches — Virktech is the same trusted team under a new, broader technology brand covering phones, laptops, audio and more.' },
]

export function FaqSection(){
  return (
    <section className="container-x section-pad max-w-3xl">
      <span className="kicker">Quick answers</span>
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-8">Frequently asked questions</h2>
      <Accordion type="single" collapsible className="border-t border-graphite-200">
        {FAQS.map((f,i)=>(
          <AccordionItem key={i} value={`item-${i}`} className="border-graphite-200">
            <AccordionTrigger className="text-[15px] font-semibold hover:no-underline py-5">{f.q}</AccordionTrigger>
            <AccordionContent className="text-[14px] text-graphite-500 leading-relaxed">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
