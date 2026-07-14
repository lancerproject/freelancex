"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  loginWithGoogle,
  loginWithEmail,
  forgotPassword,
} from "./actions"

function LoginInner() {
  const params = useSearchParams()
  // Seed the one-time banners from the URL, then strip the query string so a
  // refresh (or a fresh attempt) doesn't keep re-showing a stale message.
  const [error, setError] = useState<string | null>(params.get("error"))
  const [reset] = useState<string | null>(params.get("reset"))
  const [verified] = useState<string | null>(params.get("verified"))
  const [closed] = useState<string | null>(params.get("closed"))
  const [passwordChanged] = useState<string | null>(
    params.get("password_changed")
  )

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Brand */}
      <div className="px-8 py-5">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-foreground">work</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-8 w-full max-w-md">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-sm">
              {error}
            </div>
          )}
          {verified && (
            <div className="mb-4 p-3 bg-green-500/10 text-green-600 border border-green-500/30 rounded-lg text-sm">
              ✅ Your email has been verified. Please log in.
            </div>
          )}
          {reset && (
            <div className="mb-4 p-3 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm">
              If an account exists for that email, we&apos;ve sent a password
              reset link.
            </div>
          )}
          {closed && (
            <div className="mb-4 p-3 bg-secondary text-foreground border border-border rounded-lg text-sm">
              This account has been closed. If you&apos;d like to reopen it,
              please contact support.
            </div>
          )}
          {passwordChanged && (
            <div className="mb-4 p-3 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm">
              Your password has been changed. Please log in again with your new
              password.
            </div>
          )}

          {step === 1 ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-6 text-center">
                Log in to Xwork
              </h1>

              <div className="flex items-center border border-border rounded-lg bg-background px-3">
                <span className="text-muted-foreground">👤</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Username or Email"
                  className="flex-1 bg-transparent py-3 px-2 text-foreground outline-none"
                />
              </div>

              <button
                onClick={() => email.trim() && setStep(2)}
                disabled={!email.trim()}
                className="w-full mt-4 bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:opacity-90 disabled:opacity-40 transition"
              >
                Continue
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-sm">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form action={loginWithGoogle}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-3 hover:bg-secondary transition"
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

              <div className="mt-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Don&apos;t have an Xwork account?
                </p>
                <Link
                  href="/register"
                  className="inline-block mt-3 border border-primary text-primary px-10 py-2.5 rounded-lg font-semibold hover:bg-primary/10 transition"
                >
                  Sign Up
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
                Welcome
              </h1>
              <p className="text-center text-muted-foreground mb-5">{email}</p>

              <form action={loginWithEmail} className="space-y-4">
                <input type="hidden" name="email" value={email} />

                <div className="flex items-center border border-border rounded-lg bg-background px-3">
                  <span className="text-muted-foreground">🔒</span>
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    required
                    onChange={() => error && setError(null)}
                    className="flex-1 bg-transparent py-3 px-2 text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-muted-foreground text-sm"
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" name="keep" className="accent-primary" />
                    Keep me logged in
                  </label>
                  <button
                    type="submit"
                    formAction={forgotPassword}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:opacity-90 transition"
                >
                  Log in
                </button>
              </form>

              <button
                onClick={() => {
                  setEmail("")
                  setError(null)
                  setStep(1)
                }}
                className="block mx-auto mt-5 text-primary font-medium hover:underline"
              >
                Not you?
              </button>
            </>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2026 Xwork. All rights reserved.</p>
          <div className="flex gap-4 justify-center mt-2">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
