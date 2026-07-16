import { HeroSection } from '@/components/sections/HeroSection.jsx'
import { StatStrip } from '@/components/sections/StatStrip.jsx'
import { ServicesBento } from '@/components/sections/ServicesBento.jsx'
import { HowItWorks } from '@/components/sections/HowItWorks.jsx'
import { DiagnosticsSpotlight } from '@/components/sections/DiagnosticsSpotlight.jsx'
import { BranchNetwork } from '@/components/sections/BranchNetwork.jsx'
import { TradeInSection } from '@/components/sections/TradeInSection.jsx'
import { RefurbishedSpotlight } from '@/components/sections/RefurbishedSpotlight.jsx'
import { FeaturedProducts } from '@/components/sections/FeaturedProducts.jsx'
import { WarrantyTrust } from '@/components/sections/WarrantyTrust.jsx'
import { Testimonials } from '@/components/sections/Testimonials.jsx'
import { StatsBand } from '@/components/sections/StatsBand.jsx'
import { FaqSection } from '@/components/sections/FaqSection.jsx'
import { CTASection } from '@/components/sections/CTASection.jsx'

export default function Home(){
  return (<>
    <HeroSection/>
    <StatStrip/>
    <ServicesBento/>
    <HowItWorks/>
    <DiagnosticsSpotlight/>
    <BranchNetwork/>
    <TradeInSection/>
    <RefurbishedSpotlight/>
    <FeaturedProducts/>
    <WarrantyTrust/>
    <Testimonials/>
    <StatsBand/>
    <FaqSection/>
    <CTASection/>
  </>)
}
