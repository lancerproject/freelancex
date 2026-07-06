import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "../lib/supabase-server";
import ConditionalNavbar from "@/components/conditional-navbar";
import { SupportWidget } from "@/components/support-widget";
import { AppFooter } from "@/components/app-footer";
import { IdentityBanner } from "@/components/identity-banner";
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
  title: "Xwork - Freelance Marketplace",
  description: "Connect clients and freelancers",
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
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    unreadCount = count || 0;

    // Unread messages = messages in my conversations, not sent by me, not read.
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
    const convoIds = (convos ?? []).map((c) => c.id);
    if (convoIds.length > 0) {
      const { count: mc } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .neq("sender_id", user.id)
        .eq("read", false);
      unreadMessages = mc || 0;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? undefined;
    navName =
      profile?.full_name || profile?.username || user.email?.split("@")[0];
    avatarUrl = profile?.avatar_url ?? undefined;
    onlineForMessages = profile?.online_for_messages ?? true;
    isAdminUser = !!profile?.is_admin;

    // Identity banner: only once the freelancer's profile is complete AND
    // they've applied to a job / waited 1+ day / started a contract.
    showIdentityBanner = await computeIdentityRequired(
      supabase,
      user.id,
      profile
    );

    // The first time verification becomes required, drop a notification so the
    // user sees it in the bell — but only once (deduped by the link).
    if (showIdentityBanner) {
      const { count: existing } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("link", "/settings/identity");
      if ((existing ?? 0) === 0) {
        await notify(
          supabase,
          user.id,
          "system",
          "Verify your identity",
          "Your profile is ready! Verify your identity to start applying and getting paid on Xwork.",
          "/settings/identity"
        );
      }
    }

    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6);
    recentNotifications = notifs ?? [];
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
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