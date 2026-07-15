"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useTransition, useEffect } from "react"
import { useTheme } from "next-themes"
import { logout, setOnlineForMessages, markNotificationsRead } from "@/app/actions"
import { getBrowserSupabase } from "@/lib/supabase-browser"

interface MenuItem {
  label: string
  href: string
}
interface MenuGroup {
  heading?: string
  items: MenuItem[]
}
interface Menu {
  label: string
  groups: MenuGroup[]
}
interface Notif {
  id: string
  title?: string
  message?: string
  link?: string
  is_read?: boolean
  created_at?: string
}

const CLIENT_MENUS: Menu[] = [
  {
    label: "Hire talent",
    groups: [
      {
        heading: "Manage jobs and offers",
        items: [
          { label: "Job posts and proposals", href: "/my-jobs" },
        ],
      },
      {
        heading: "Find freelancers",
        items: [
          { label: "Post a job", href: "/jobs/new" },
          { label: "Search for talent", href: "/freelancers" },
          { label: "Talent you've hired", href: "/talent/hires" },
          { label: "Talent you've saved", href: "/saved-talent" },
        ],
      },
    ],
  },
  {
    label: "Manage work",
    groups: [
      {
        heading: "Active and past work",
        items: [
          { label: "Completed contracts", href: "/contracts?status=completed" },
        ],
      },
    ],
  },
  {
    label: "Reports",
    groups: [
      {
        items: [
          { label: "Active contracts", href: "/contracts?status=active" },
        ],
      },
    ],
  },
]

const FREELANCER_MENUS: Menu[] = [
  {
    label: "Find work",
    groups: [
      {
        items: [
          { label: "Find work", href: "/dashboard" },
          { label: "Saved jobs", href: "/jobs?saved=1" },
          { label: "Proposals and offers", href: "/freelancer" },
        ],
      },
    ],
  },
  {
    label: "Deliver work",
    groups: [
      {
        heading: "Your contracts",
        items: [
          { label: "Your active contracts", href: "/contracts?status=active" },
          { label: "Contract history", href: "/contracts" },
        ],
      },
    ],
  },
  {
    label: "Overview",
    groups: [
      {
        heading: "Earnings",
        items: [
          { label: "Financial overview", href: "/finances" },
          { label: "Your reports", href: "/reports" },
          { label: "Billings and earnings", href: "/finances" },
          { label: "Transactions", href: "/transactions" },
          { label: "Certificate of earnings", href: "/certificate" },
        ],
      },
      {
        heading: "Payments",
        items: [{ label: "Withdraw", href: "/withdraw" }],
      },
      {
        heading: "Taxes",
        items: [{ label: "Tax information", href: "/settings/tax" }],
      },
    ],
  },
]

const SEARCH_CONTEXTS = [
  { label: "Jobs", sub: "View jobs posted by clients", base: "/jobs" },
  { label: "Talent", sub: "Search freelancer profiles by name or skill", base: "/freelancers" },
]

export default function ConditionalNavbar({
  userId,
  unreadCount,
  unreadMessages = 0,
  role,
  isAdmin = false,
  name,
  avatarUrl,
  notifications = [],
  initialOnline = true,
}: {
  userId?: string
  unreadCount: number
  unreadMessages?: number
  role?: string
  isAdmin?: boolean
  name?: string
  avatarUrl?: string
  notifications?: Notif[]
  initialOnline?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [hoverMenu, setHoverMenu] = useState<string | null>(null)
  const [panel, setPanel] = useState<string | null>(null) // search | help | notifs | profile
  const [themeOpen, setThemeOpen] = useState(false)
  const [online, setOnline] = useState(initialOnline)
  const [, startTransition] = useTransition()

  // Live notifications — count + list update instantly when a new one arrives.
  const [unread, setUnread] = useState(unreadCount)
  const [notifs, setNotifs] = useState<Notif[]>(notifications)

  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Notif }) => {
          const n = payload.new
          setNotifs((prev) =>
            prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 6)
          )
          setUnread((c) => c + 1)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const toggleOnline = () => {
    const next = !online
    setOnline(next) // optimistic
    startTransition(() => {
      setOnlineForMessages(next)
    })
  }
  const [ctx, setCtx] = useState(SEARCH_CONTEXTS[0])
  const [query, setQuery] = useState("")

  const shouldHide =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/create-profile") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/verified") ||
    pathname.startsWith("/get-started") ||
    pathname.startsWith("/reset-password")

  if (shouldHide) return null

  const menus = role === "freelancer" ? FREELANCER_MENUS : CLIENT_MENUS

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `${ctx.base}?q=${encodeURIComponent(q)}` : ctx.base)
    setPanel(null)
  }

  const togglePanel = (p: string) => setPanel((cur) => (cur === p ? null : p))

  return (
    <>
      <nav className="bg-background border-b border-border px-4 lg:px-8 py-3 flex items-center gap-4 z-50 sticky top-0">
        {/* Brand + menus */}
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              <span className="text-primary">X</span>
              <span className="text-foreground">work</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {menus.map((menu) => (
              <div
                key={menu.label}
                className="relative"
                onMouseEnter={() => setHoverMenu(menu.label)}
                onMouseLeave={() => setHoverMenu(null)}
              >
                <button className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {menu.label}
                  <span className="text-xs">▾</span>
                </button>
                {hoverMenu === menu.label && (
                  <div className="absolute left-0 top-full pt-1 w-64">
                    <div className="rounded-xl border border-border bg-card shadow-lg p-3 space-y-3">
                      {menu.groups.map((group, gi) => (
                        <div key={gi}>
                          {group.heading && (
                            <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 mb-1">
                              {group.heading}
                            </p>
                          )}
                          {group.items.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              className="block px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-secondary transition"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/messages"
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              Messages
              {unreadMessages > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search */}
        <form
          onSubmit={submitSearch}
          className="hidden lg:flex items-center flex-1 max-w-xl mx-auto"
        >
          <div className="flex items-center w-full border border-border rounded-full bg-card overflow-visible">
            <span className="pl-4 text-muted-foreground">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none"
            />
            <div className="relative border-l border-border">
              <button
                type="button"
                onClick={() => togglePanel("search")}
                className="px-4 py-2 text-sm text-foreground flex items-center gap-1"
              >
                {ctx.label} <span className="text-xs">▾</span>
              </button>
              {panel === "search" && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-lg p-2 z-50">
                  {SEARCH_CONTEXTS.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        setCtx(c)
                        setPanel(null)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition"
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {c.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {c.sub}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Right icons */}
        <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
          {/* Help */}
          <div className="relative">
            <button
              onClick={() => togglePanel("help")}
              className="w-9 h-9 rounded-full text-muted-foreground hover:bg-secondary flex items-center justify-center"
              aria-label="Help"
            >
              ?
            </button>
            {panel === "help" && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-2 z-50">
                <Link
                  href="/help"
                  onClick={() => setPanel(null)}
                  className="block px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary"
                >
                  Help center
                </Link>
                <Link
                  href="/support"
                  onClick={() => setPanel(null)}
                  className="block px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary"
                >
                  Your support requests
                </Link>
                <Link
                  href="/release-notes"
                  onClick={() => setPanel(null)}
                  className="block px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary"
                >
                  Xwork Updates
                </Link>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                if (panel !== "notifs" && unread > 0) {
                  setUnread(0)
                  // mark them read in the UI and persist so a refresh keeps it
                  setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
                  markNotificationsRead()
                }
                togglePanel("notifs")
              }}
              className="relative w-9 h-9 rounded-full text-muted-foreground hover:bg-secondary flex items-center justify-center"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            {panel === "notifs" && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
                <div className="max-h-96 overflow-y-auto divide-y divide-border">
                  {notifs.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">
                      No notifications yet.
                    </p>
                  ) : (
                    notifs.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "/notifications"}
                        onClick={() => setPanel(null)}
                        className={`block p-3 hover:bg-secondary transition ${
                          n.is_read ? "" : "bg-secondary/50"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/notifications"
                  onClick={() => setPanel(null)}
                  className="block text-center text-sm text-primary font-medium py-3 border-t border-border hover:bg-secondary"
                >
                  See all notifications
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => togglePanel("profile")}
              className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-foreground"
              aria-label="Account menu"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                "👤"
              )}
            </button>
            {panel === "profile" && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
                <Link
                  href="/settings"
                  onClick={() => setPanel(null)}
                  className="flex items-center gap-3 p-4 hover:bg-secondary border-b border-border"
                >
                  <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      "👤"
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground truncate">
                      {name || "My account"}
                    </span>
                    <span className="block text-xs text-muted-foreground capitalize">
                      {role || "Member"}
                    </span>
                  </span>
                </Link>

                {/* Online for messages toggle */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm text-foreground">
                    Online for messages
                  </span>
                  <button
                    type="button"
                    onClick={toggleOnline}
                    aria-label="Toggle online for messages"
                    className={`relative w-10 h-6 rounded-full transition ${
                      online ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        online ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="py-1">
                  {(role === "freelancer"
                    ? [
                        { icon: "👤", label: "Your profile", href: "/profile" },
                        { icon: "📈", label: "Stats and trends", href: "/stats" },
                        {
                          icon: "🕐",
                          label: "Account health",
                          href: "/freelancer/health",
                        },
                        {
                          icon: "🪪",
                          label: "Membership plan",
                          href: "/settings/membership",
                        },
                        { icon: "⚙️", label: "Account settings", href: "/settings" },
                      ]
                    : // Client menu — only client-relevant items (no freelancer
                      // profile / stats / health / membership).
                      [
                        {
                          icon: "🧾",
                          label: "Billing & payments",
                          href: "/settings/billing",
                        },
                        { icon: "⚙️", label: "Account settings", href: "/settings" },
                      ]
                  ).map((i) => (
                    <Link
                      key={i.label}
                      href={i.href}
                      onClick={() => setPanel(null)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary"
                    >
                      <span className="w-5 text-center">{i.icon}</span>
                      {i.label}
                    </Link>
                  ))}

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setPanel(null)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-primary hover:bg-secondary"
                    >
                      <span className="w-5 text-center">🛡️</span>
                      Trust &amp; Safety
                    </Link>
                  )}

                  {/* Theme submenu */}
                  <button
                    onClick={() => setThemeOpen((o) => !o)}
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center justify-between"
                  >
                    <span>
                      Theme:{" "}
                      {theme === "light"
                        ? "Light"
                        : theme === "dark"
                        ? "Dark"
                        : "Auto"}
                    </span>
                    <span className="text-xs">{themeOpen ? "▲" : "▼"}</span>
                  </button>

                  {themeOpen && (
                    <div className="px-2 pb-1">
                      {[
                        {
                          value: "system",
                          label: "Auto",
                          desc: "Use the same theme as your device",
                        },
                        {
                          value: "light",
                          label: "Light",
                          desc: "Light background with dark text",
                        },
                        {
                          value: "dark",
                          label: "Dark",
                          desc: "Dark background with light text",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary flex items-start gap-2"
                        >
                          <span className="w-4 text-primary">
                            {theme === opt.value ? "✓" : ""}
                          </span>
                          <span>
                            <span className="block text-sm text-foreground">
                              {opt.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {opt.desc}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <form action={logout} className="border-t border-border">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-3 text-sm font-medium text-destructive hover:bg-secondary"
                  >
                    Log out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Click-away backdrop for the click dropdowns */}
      {panel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPanel(null)}
          aria-hidden
        />
      )}
    </>
  )
}
