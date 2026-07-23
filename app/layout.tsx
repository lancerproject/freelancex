import type { Metadata } from "next";
import { after } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "../lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import ConditionalNavbar from "@/components/conditional-navbar";
import { SupportWidget } from "@/components/support-widget";
import { AppFooter } from "@/components/app-footer";
import { IdentityBanner } from "@/components/identity-banner";
import { RecoveryRedirect } from "@/components/recovery-redirect";
import { computeIdentityRequired } from "@/lib/identity";
import { notify } from "@/lib/notify";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thexwork.com"),
  title: "Xwork — Hire Freelancers & Find Freelance Jobs",
  description:
    "Xwork is a freelance marketplace to hire skilled freelancers or find freelance work — development, design, writing, marketing and more. Post a job for free and pay safely with escrow-protected milestones.",
  applicationName: "Xwork",
  keywords: [
    "freelance marketplace",
    "hire freelancers",
    "freelance jobs",
    "find freelance work",
    "remote work",
    "post a job",
    "freelancers",
    "freelance platform",
  ],
  // NOTE: no site-wide `alternates.canonical` here — a global canonical made
  // every page point at the homepage, telling Google the sub-pages were
  // duplicates and blocking their indexing. Each page self-canonicalizes to the
  // URL Google crawls; content pages set their own canonical in generateMetadata.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: "Xwork",
    url: "https://thexwork.com",
    title: "Xwork — Hire Freelancers & Find Freelance Jobs",
    description:
      "Hire skilled freelancers or find freelance work on Xwork. Post a job for free; pay safely with escrow-protected milestones.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xwork — Hire Freelancers & Find Freelance Jobs",
    description:
      "Hire skilled freelancers or find freelance work on Xwork. Post a job for free; pay safely with escrow-protected milestones.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadCount = 0;
  let unreadMessages = 0;
  let showIdentityBanner = false;
  let role: string | undefined = undefined;
  let navName: string | undefined = undefined;
  let avatarUrl: string | undefined = undefined;
  let onlineForMessages = true;
  let isAdminUser = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentNotifications: any[] = [];

  if (user) {
    const userId = user.id;

    // This block runs on EVERY page. Firing the independent reads together
    // (instead of one-after-another) is the single biggest site-wide speedup —
    // total time is now the slowest query, not the sum of all of them.
    const [
      { count: notifCount },
      { data: convos },
      { data: profile },
      { data: notifs },
    ] = await Promise.all([
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
      supabase
        .from("conversations")
        .select("id")
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`),
      loadOwnProfile(userId).then((p) => ({ data: p })),
      supabase
        .from("notifications")
        .select("id, title, message, link, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    unreadCount = notifCount || 0;
    recentNotifications = notifs ?? [];
    role = profile?.role ?? undefined;
    navName =
      profile?.full_name || profile?.username || user.email?.split("@")[0];
    avatarUrl = profile?.avatar_url ?? undefined;
    onlineForMessages = profile?.online_for_messages ?? true;
    isAdminUser = !!profile?.is_admin;

    // Second wave — these two depend on the batch above (conversation ids /
    // the profile row), so run them together once it resolves.
    const convoIds = (convos ?? []).map((c) => c.id);
    const [msgCount, identityRequired] = await Promise.all([
      convoIds.length > 0
        ? supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convoIds)
            .neq("sender_id", userId)
            .eq("read", false)
            .then((r) => r.count || 0)
        : Promise.resolve(0),
      // Identity banner: only once the freelancer's profile is complete AND
      // they've applied to a job / waited 1+ day / started a contract.
      computeIdentityRequired(supabase, userId, profile),
    ]);
    unreadMessages = msgCount;
    showIdentityBanner = identityRequired;

    // The first time verification becomes required, drop a bell notification —
    // deferred with after() so it never delays the page render.
    if (showIdentityBanner) {
      after(async () => {
        const { count: existing } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("link", "/settings/identity");
        if ((existing ?? 0) === 0) {
          await notify(
            supabase,
            userId,
            "system",
            "Verify your identity",
            "Your profile is ready! Verify your identity to start applying and getting paid on Xwork.",
            "/settings/identity"
          );
        }
      });
    }
  }

  // Structured data (JSON-LD) — helps Google understand the site's identity and
  // primary sections. It's a prerequisite for (never a guarantee of) sitelinks;
  // Google still generates those automatically once the site has enough
  // authority/traffic. The SearchAction also makes the site eligible for the
  // Google search box under the brand result.
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Xwork",
    url: "https://thexwork.com",
    logo: "https://thexwork.com/icon.svg",
    description:
      "Xwork is a freelance marketplace connecting clients with skilled freelancers for design, development, writing, marketing and more.",
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Xwork",
    url: "https://thexwork.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://thexwork.com/jobs?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <RecoveryRedirect />
          {user && (
            <ConditionalNavbar
              userId={user.id}
              unreadCount={unreadCount}
              unreadMessages={unreadMessages}
              role={role}
              isAdmin={isAdminUser}
              name={navName}
              avatarUrl={avatarUrl}
              notifications={recentNotifications}
              initialOnline={onlineForMessages}
            />
          )}
          {showIdentityBanner && <IdentityBanner />}
          {children}
          <AppFooter />
          {user && <SupportWidget />}
        </ThemeProvider>
      </body>
    </html>
  );
}