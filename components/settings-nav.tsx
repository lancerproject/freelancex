"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Billing",
    items: [
      { label: "Membership", href: "/settings/membership" },
      { label: "Billing & Payments", href: "/settings/billing" },
    ],
  },
  {
    title: "User Settings",
    items: [
      { label: "Contact Info", href: "/settings/contact" },
      { label: "My Profile", href: "/profile" },
      { label: "Profile Settings", href: "/settings/profile" },
      { label: "Withdrawals", href: "/withdraw" },
      { label: "Connected Services", href: "/settings/connected" },
      { label: "Password & Security", href: "/settings/security" },
      { label: "Blocked Clients", href: "/settings/blocked-clients" },
      { label: "Identity Verification", href: "/settings/identity" },
      { label: "Tax Information", href: "/settings/tax" },
      { label: "Notification Settings", href: "/settings/notifications" },
    ],
  },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="text-base font-bold text-foreground mb-2">{g.title}</p>
          <div className="flex flex-col gap-1">
            {g.items.map((i) => {
              const active = pathname === i.href;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    active
                      ? "bg-secondary text-foreground font-medium border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {i.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
