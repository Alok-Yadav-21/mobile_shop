import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import heroImg from '@/assets/img/headphones.jpg'
import { BRAND } from '@/constants/brand.js'

// Light retail hero, following the reference design: a soft grey slab, an oversized ghost
// word set behind the product, and a single red call to action.
//
// The ghost word is the structural device — it is decoration, not content, so it is
// aria-hidden and the real heading sits above it in the DOM for both screen readers and SEO.
export function HeroSection() {
  const reduce = useReducedMotion()

  return (
    <section className="container-x pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-graphite-100 px-8 sm:px-14 py-14 sm:py-20 min-h-[420px] flex items-center">
        {/* Sized in viewport width so it stays proportionally huge on any screen — the effect
            depends on it being visibly larger than the layout can comfortably hold. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 bottom-8 text-center font-extrabold tracking-tighter text-white/70 select-none leading-none"
          style={{ fontSize: 'clamp(4rem, 15vw, 11rem)' }}
        >
          REPAIRED
        </span>

        <div className="relative grid lg:grid-cols-[1fr_1fr] gap-8 items-center w-full">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span className="text-[13px] font-semibold text-graphite-600">{BRAND.recognition}</span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mt-2 leading-[1.02]">
              Diagnosed<br />properly.
            </h1>
            <p className="text-graphite-600 text-[15px] mt-5 max-w-sm leading-relaxed">
              Phones, laptops, MacBooks and audio — repaired, bought and sold across 8 branches,
              every job warranty-backed and tracked end to end.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/app/book" className="btn btn-brand rounded-full">
                Book a repair <ArrowRight size={16} />
              </Link>
              <Link to="/products" className="btn rounded-full bg-white text-ink border border-graphite-200 hover:border-ink">
                Shop devices
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="relative hidden lg:block"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={reduce ? false : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
          >
            <img
              src={heroImg}
              alt="Headphones on the Virktech repair bench"
              className="w-full aspect-[4/3] object-cover rounded-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
