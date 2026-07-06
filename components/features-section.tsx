import { Shield, Zap, Globe, CreditCard, Users, Award } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Your payment is held safely until you approve the work. Escrow protection for every project.",
  },
  {
    icon: Zap,
    title: "Quality Talent",
    description: "Access pre-vetted professionals with verified skills, portfolios, and work history.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Connect with talent from 180+ countries. Find the perfect match regardless of timezone.",
  },
  {
    icon: CreditCard,
    title: "Flexible Pricing",
    description: "Fixed-price contracts with milestone payments. Pay only for quality work delivered.",
  },
  {
    icon: Users,
    title: "Dedicated Support",
    description: "24/7 customer support to help you with any questions or disputes that may arise.",
  },
  {
    icon: Award,
    title: "Satisfaction Guarantee",
    description: "Not satisfied? Get a full refund within 14 days. Your success is our priority.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold lg:text-4xl text-balance">
            Why businesses choose TalentHub
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            We provide the tools and support you need to find, hire, and work with the best freelance talent.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="relative">
              <div className="inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
