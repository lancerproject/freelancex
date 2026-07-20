import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";
import Link from "next/link";

export const metadata = {
  title: "Contact us | Xwork",
  description:
    "Get in touch with the Xwork team. Email info@thexwork.com or send us a message.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <article className="max-w-3xl mx-auto px-6 lg:px-8 py-14">
        <h1 className="text-4xl font-bold">Contact us</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          We&apos;d love to hear from you — and a real person will reply.
        </p>

        {/* Direct email + quick links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Email us directly</p>
            <a
              href="mailto:info@thexwork.com"
              className="mt-1 inline-block text-lg font-semibold text-primary hover:underline break-all"
            >
              info@thexwork.com
            </a>
            <p className="text-sm text-muted-foreground mt-2">
              For partnerships, press, feedback, or general questions.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Need account help?</p>
            <Link
              href="/help"
              className="mt-1 inline-block text-lg font-semibold text-primary hover:underline"
            >
              Help &amp; support →
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              Most questions about jobs, proposals, contracts and payments are
              answered there with step-by-step guidance.
            </p>
          </div>
        </div>

        {/* Trust & safety note */}
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
          <h2 className="text-base font-semibold text-foreground">
            Reporting something urgent?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            To report a suspicious message, job or user, use the reporting
            options on the relevant page so we have the full context. Keep all
            communication and payments on Xwork so we can help if something goes
            wrong.
          </p>
        </div>

        {/* Contact form */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">
            Send us a message
          </h2>
          <p className="text-muted-foreground mt-1 mb-6">
            Fill in the form and we&apos;ll get back to you at the email you
            provide.
          </p>
          <ContactForm />
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
