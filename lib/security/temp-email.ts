// Disposable / temp-email domain blocklist. Registration is refused for these.
// A compact list of the most common throwaway providers; extend as needed.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "dispostable.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mohmal.com",
  "mailnesia.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mytemp.email",
  "moakt.com",
  "tmail.ws",
  "burnermail.io",
  "mail.tm",
  "preparmy.com",
]);

export function emailDomain(email: string): string {
  return (email.split("@")[1] || "").trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
}
