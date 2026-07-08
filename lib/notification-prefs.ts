// Notification preferences shared by the settings UI and the notify() helper.
// Plain module (no "use server") so both client and server can import it.

export type Channel = "inapp" | "email";
export type CategoryPref = { inapp: boolean; email: boolean };
export type NotificationPrefs = Record<string, CategoryPref>;

export const NOTIFICATION_CATEGORIES: {
  key: string;
  label: string;
  desc: string;
  types: string[];
  pro?: boolean; // Pro-only category — toggles are locked for Basic users
}[] = [
  {
    key: "account",
    label: "Account & security",
    desc: "Password changes, sign-in alerts, identity, tax and other account activity.",
    types: ["account", "security", "warning"],
  },
  {
    key: "jobs",
    label: "Proposals & job activity",
    desc: "Updates on your proposals, client invites, job offers, and job activity.",
    types: ["proposal", "system", "invite", "offer"],
  },
  {
    key: "payments",
    label: "Contracts & payments",
    desc: "Milestones, escrow funding, releases and other payment activity.",
    types: ["payment", "contract", "payments"],
  },
  {
    key: "reviews",
    label: "Reviews & feedback",
    desc: "When a client or freelancer leaves you a review.",
    types: ["review"],
  },
  {
    key: "messages",
    label: "Messages",
    desc: "New direct messages from clients and freelancers.",
    types: ["message"],
  },
  {
    key: "job_alerts",
    label: "Personalized job alerts (Pro)",
    desc: "Get notified when new verified-client jobs match your skills.",
    types: ["job_alert"],
    pro: true,
  },
  {
    key: "marketing",
    label: "Tips & product updates",
    desc: "Occasional tips, news and product announcements from Xwork.",
    types: ["marketing"],
  },
];

// Map each notify() `type` to a user-facing category.
export const TYPE_TO_CATEGORY: Record<string, string> = {};
for (const c of NOTIFICATION_CATEGORIES) {
  for (const t of c.types) TYPE_TO_CATEGORY[t] = c.key;
}

// Everything on by default, except marketing.
export const DEFAULT_PREFS: NotificationPrefs = {
  account: { inapp: true, email: true },
  jobs: { inapp: true, email: true },
  payments: { inapp: true, email: true },
  reviews: { inapp: true, email: true },
  messages: { inapp: true, email: true },
  job_alerts: { inapp: true, email: true },
  marketing: { inapp: false, email: false },
};

// Merge stored prefs over the defaults (so new categories are handled safely).
export function withDefaults(
  prefs: NotificationPrefs | null | undefined
): NotificationPrefs {
  const merged: NotificationPrefs = {};
  for (const c of NOTIFICATION_CATEGORIES) {
    merged[c.key] = {
      ...DEFAULT_PREFS[c.key],
      ...(prefs?.[c.key] ?? {}),
    };
  }
  return merged;
}

// Whether a notification of `type` should be delivered on `channel`.
// Unknown types fail OPEN (always delivered) so we never silently drop
// something important that hasn't been categorized yet.
export function isAllowed(
  prefs: NotificationPrefs | null | undefined,
  type: string,
  channel: Channel
): boolean {
  const cat = TYPE_TO_CATEGORY[type];
  if (!cat) return true;
  const merged = withDefaults(prefs);
  const c = merged[cat];
  if (!c) return true;
  return channel === "email" ? c.email !== false : c.inapp !== false;
}
