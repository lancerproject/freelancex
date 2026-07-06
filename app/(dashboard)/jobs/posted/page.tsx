"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function JobPostedPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">📌</div>
      <h1 className="text-4xl font-bold text-foreground">
        Congratulations! Your job post is now live.
      </h1>
      <p className="text-muted-foreground mt-3">
        Freelancers can now find and apply to your job.
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Link
          href="/my-jobs"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90"
        >
          View my job posts
        </Link>
        <Link
          href="/dashboard"
          className="border border-border text-foreground px-6 py-3 rounded-full font-semibold hover:bg-secondary"
        >
          Go to dashboard
        </Link>
      </div>
      <p className="text-muted-foreground text-xs mt-6">
        Redirecting you to your dashboard…
      </p>
    </main>
  );
}
