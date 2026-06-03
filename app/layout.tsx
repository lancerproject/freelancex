import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { createClient } from "../lib/supabase-server";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalentHub - Freelance Marketplace",
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

  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    unreadCount = count || 0;
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
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {user && (
            <nav className="bg-background border-b px-8 py-4 flex items-center justify-between z-50">
              <Link href="/" className="text-xl font-bold text-primary">
                TalentHub
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/jobs" className="text-muted-foreground hover:text-foreground">
                  Browse Jobs
                </Link>
                <Link href="/contracts" className="text-muted-foreground hover:text-foreground">
                  Contracts
                </Link>
                <Link href="/profile" className="text-muted-foreground hover:text-foreground">
                  Profile
                </Link>
                <Link
                  href="/notifications"
                  className="relative text-muted-foreground hover:text-foreground"
                >
                  🔔 Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </nav>
          )}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}