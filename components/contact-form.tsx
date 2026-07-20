"use client";

import { useState, useTransition } from "react";
import { submitContactMessage } from "@/app/contact/actions";

export function ContactForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    start(async () => {
      const res = await submitContactMessage(formData).catch(() => ({
        ok: false,
        error: "Something went wrong. Please try again.",
      }));
      if (res.ok) setSent(true);
      else setError(res.error || "Something went wrong. Please try again.");
    });
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-foreground">Message sent</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Thanks for reaching out — a real person will get back to you at the
          email you provided, usually within 1–2 business days.
        </p>
      </div>
    );
  }

  const field =
    "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const label = "block text-sm font-medium text-foreground mb-1";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot — hidden from humans, catches bots. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="c-name" className={label}>
            Your name
          </label>
          <input id="c-name" name="name" required className={field} placeholder="Jane Doe" />
        </div>
        <div>
          <label htmlFor="c-email" className={label}>
            Email address
          </label>
          <input
            id="c-email"
            name="email"
            type="email"
            required
            className={field}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="c-subject" className={label}>
          Subject <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="c-subject"
          name="subject"
          className={field}
          placeholder="What's this about?"
        />
      </div>

      <div>
        <label htmlFor="c-message" className={label}>
          Message
        </label>
        <textarea
          id="c-message"
          name="message"
          required
          rows={6}
          className={field}
          placeholder="Tell us how we can help…"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
