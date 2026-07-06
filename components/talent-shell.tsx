"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Discover", href: "/freelancers", icon: "✳️" },
  { label: "Your hires", href: "/talent/hires", icon: "💼" },
  { label: "Saved talent", href: "/saved-talent", icon: "❤️" },
  { label: "Recently viewed", href: "/freelancers", icon: "🕘" },
];

export function TalentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main className="min-h-screen px-4 lg:px-8 py-10 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <aside>
          <nav className="space-y-1">
            {NAV.map((i) => {
              const active = pathname === i.href;
              return (
                <Link
                  key={i.label}
                  href={i.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <span>{i.icon}</span>
                  {i.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-2">
              Your lists
            </p>
            <Link
              href="/saved-talent"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              ❤️ Saved talent
            </Link>
          </div>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
