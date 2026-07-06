import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-foreground">Coming soon</h1>
        <p className="text-muted-foreground mt-2">
          This feature is on the roadmap and isn&apos;t built yet. We&apos;ll
          add it in an upcoming phase.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:opacity-90 transition"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
