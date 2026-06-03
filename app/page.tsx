import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { CategoriesSection } from "@/components/categories-section"
import { FreelancersSection } from "@/components/freelancers-section"
import { FeaturesSection } from "@/components/features-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { CTASection, NewsletterSection } from "@/components/cta-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <CategoriesSection />
        <FreelancersSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
        <NewsletterSection />
      </main>
    </div>
  )
}