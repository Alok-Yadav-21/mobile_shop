import { HeroSection } from '@/components/sections/HeroSection.jsx'
import { CategoryBlocks } from '@/components/sections/CategoryBlocks.jsx'
import { PromiseStrip, PromoBanner, PromoBannerSecondary } from '@/components/sections/PromoBanner.jsx'
import { FeaturedProducts } from '@/components/sections/FeaturedProducts.jsx'
import { HowItWorks } from '@/components/sections/HowItWorks.jsx'
import { BranchFinder } from '@/components/sections/BranchFinder.jsx'
import { Testimonials } from '@/components/sections/Testimonials.jsx'
import { FaqSection } from '@/components/sections/FaqSection.jsx'

// Rebuilt to the reference layout: light throughout, colour blocks carrying the categories,
// and promo slabs breaking up the product runs.
//
// The old page stacked fourteen sections of the same shape — hero, then card grid, then card
// grid — which is what made it read as a template. This alternates block types instead, and
// drops the sections that were repeating something already said (StatStrip, StatsBand,
// ServicesBento, DiagnosticsSpotlight, RefurbishedSpotlight, TradeInSection, WarrantyTrust,
// CTASection). Those components still exist and are used by the pages they belong to.
export default function Home() {
  return (
    <>
      <HeroSection />
      <CategoryBlocks />
      <PromiseStrip />
      <PromoBanner />
      <FeaturedProducts />
      <PromoBannerSecondary />
      <HowItWorks />
      <BranchFinder />
      <Testimonials />
      <FaqSection />
    </>
  )
}
