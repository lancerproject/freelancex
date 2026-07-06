"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VerifiedPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/get-started"), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white text-neutral-900 px-4 text-center">
      <div className="relative">
        <div className="text-7xl">✉️</div>
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-lg shadow">
          ✓
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold mt-8">
        Congratulations! Your account is verified.
      </h1>
      <p className="text-xl text-neutral-700 mt-1">Redirecting…</p>
    </main>
  );
}
