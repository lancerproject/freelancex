import Link from "next/link";
import { loginWithGoogle } from "../../login/actions";
import { signUpWithEmail } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { CountrySelect } from "@/components/country-select";

export default async function FreelancerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  let error: string | undefined;
  try {
    ({ error } = await searchParams);
  } catch {
    error = undefined;
  }

  return (
    <main className="min-h-screen flex flex-col bg-white text-neutral-900">
      <div className="px-8 py-5">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl font-bold text-center mb-1">
            Sign up to find work you love
          </h1>
          <p className="text-neutral-500 text-center mb-6">
            Apply to jobs and get paid for your skills on Xwork.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form action={loginWithGoogle}>
            <input type="hidden" name="role" value="freelancer" />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-neutral-300 rounded-full py-3 px-4 hover:bg-neutral-50 transition font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-neutral-400 text-sm">or</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          <form action={signUpWithEmail} className="space-y-5">
            <input type="hidden" name="role" value="freelancer" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  name="firstname"
                  required
                  className="w-full border border-neutral-300 rounded-lg py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  name="lastname"
                  required
                  className="w-full border border-neutral-300 rounded-lg py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="off"
                className="w-full border border-neutral-300 rounded-lg py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                Password
              </label>
              <PasswordInput name="password" showStrength />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                Country
              </label>
              <CountrySelect name="country" />
              <p className="text-xs text-neutral-500 mt-1.5">
                Auto-detected from your timezone — change it if it&apos;s wrong.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                name="emails_ok"
                className="mt-1 accent-primary"
              />
              Send me helpful emails to find rewarding work and job leads.
            </label>
            <label className="flex items-start gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                name="agree"
                required
                className="mt-1 accent-primary"
              />
              <span>
                Yes, I understand and agree to the Xwork{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
                , including the{" "}
                <Link href="/user-agreement" className="text-primary hover:underline">
                  User Agreement
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <SubmitButton
              pendingText="Creating your account…"
              className="w-full bg-primary text-primary-foreground rounded-full py-3 px-4 font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              Create my account
            </SubmitButton>
          </form>

          <p className="text-center text-neutral-600 text-sm mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
          <p className="text-center text-neutral-600 text-sm mt-2">
            Want to hire instead?{" "}
            <Link
              href="/register/client"
              className="text-primary hover:underline font-medium"
            >
              Join as a client
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
