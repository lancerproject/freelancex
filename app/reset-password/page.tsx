import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  let error: string | undefined;
  let done: string | undefined;
  try {
    ({ error, done } = await searchParams);
  } catch {
    /* ignore */
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
        <div className="w-full max-w-md">
          {done ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-2xl font-bold mb-2">Password updated</h1>
              <p className="text-neutral-500 mb-6">
                Your password has been changed. You can now use it to log in.
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90"
              >
                Continue to Xwork
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-center mb-1">
                Set a new password
              </h1>
              <p className="text-neutral-500 text-center mb-6">
                Choose a strong password for your Xwork account.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form action={updatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                    New password
                  </label>
                  <PasswordInput name="password" showStrength />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">
                    Confirm new password
                  </label>
                  <PasswordInput name="confirm" placeholder="Re-enter password" />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground rounded-full py-3 px-4 font-semibold hover:opacity-90 transition"
                >
                  Update password
                </button>
              </form>

              <p className="text-center text-neutral-600 text-sm mt-5">
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
