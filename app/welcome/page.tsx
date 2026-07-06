"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeInner />
    </Suspense>
  );
}

function WelcomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const name = params.get("name") || "";
  const email = params.get("email") || "";
  const role = params.get("role") || "freelancer";
  // When email confirmation is OFF the user is already signed in, so we skip
  // the "verify your email" step and go straight to onboarding.
  const confirmed = params.get("confirmed") === "1";
  const [first] = useState(name.split(" ")[0] || name);

  useEffect(() => {
    const t = setTimeout(() => {
      if (confirmed) {
        // Freelancers go through profile onboarding; clients go straight to
        // their dashboard (no freelancer profile wizard).
        if (role === "client") {
          router.replace("/dashboard");
        } else {
          router.replace(`/get-started?name=${encodeURIComponent(name)}`);
        }
      } else {
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white text-neutral-900 px-4 text-center">
      <div className="text-6xl mb-5 animate-bounce">🎉</div>
      <h1 className="text-3xl sm:text-4xl font-bold">
        Welcome to Xwork{first ? `, ${first}` : ""}!
      </h1>
      <p className="text-neutral-500 mt-3 max-w-md">
        Your account is being set up. Just one quick step to go…
      </p>
      <div className="mt-6 flex items-center gap-2 text-sm text-neutral-400">
        <span className="w-4 h-4 border-2 border-neutral-300 border-t-primary rounded-full animate-spin" />
        {confirmed ? "Getting things ready…" : "Taking you to verify your email…"}
      </div>
    </main>
  );
}
