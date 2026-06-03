import Link from "next/link"
import { Globe } from "lucide-react"

const footerLinks = {
  "For Clients": [
    { name: "How to Hire", href: "/how-to-hire" },
    { name: "Talent Marketplace", href: "/freelancers" },
    { name: "Project Catalog", href: "/projects" },
    { name: "Enterprise", href: "/enterprise" },
    { name: "Payroll Services", href: "/payroll" },
  ],
  "For Freelancers": [
    { name: "How to Find Work", href: "/find-work" },
    { name: "Direct Contracts", href: "/contracts" },
    { name: "Find Jobs", href: "/jobs" },
    { name: "Freelancer Plus", href: "/plus" },
    { name: "Resources", href: "/resources" },
  ],
  Resources: [
    { name: "Help & Support", href: "/help" },
    { name: "Success Stories", href: "/stories" },
    { name: "Blog", href: "/blog" },
    { name: "Community", href: "/community" },
    { name: "Affiliate Program", href: "/affiliates" },
  ],
  Company: [
    { name: "About Us", href: "/about" },
    { name: "Leadership", href: "/leadership" },
    { name: "Careers", href: "/careers" },
    { name: "Press", href: "/press" },
    { name: "Contact", href: "/contact" },
  ],
}

const socialLinks = [
  { name: "Facebook", href: "#" },
  { name: "Twitter", href: "#" },
  { name: "LinkedIn", href: "#" },
  { name: "Instagram", href: "#" },
  { name: "YouTube", href: "#" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">T</span>
              </div>
              <span className="text-xl font-bold">TalentHub</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              The world&apos;s work marketplace connecting businesses with top freelance talent.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                
                  key={social.name}
                  href={social.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.name}
                >
                  <Globe className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm">{category}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TalentHub. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            <Link href="/accessibility" className="hover:text-foreground transition-colors">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}