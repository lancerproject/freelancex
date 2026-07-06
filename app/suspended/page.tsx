import Link from "next/link";
import { statusBlockMessage } from "@/lib/security/suspend";

export const metadata = { title: "Account suspended | Xwork" };

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const message =
    statusBlockMessage(s) ||
    "Your account is currently unavailable. Please contact support at support@xwork.com.";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center rounded-2xl border border-border bg-card p-8">
        <div className="text-5xl mb-4" aria-hidden>
          🔒
        </div>
        <h1 className="text-2xl font-bold text-foreground">Account suspended</h1>
        <p className="text-muted-foreground mt-3">{message}</p>
        <a
          href="mailto:support@xwork.com"
          className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
        >
          Contact support
        </a>
        <div className="mt-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    </main>
  );
}
