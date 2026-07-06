import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white text-neutral-900">
      <div className="px-8 py-5">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <h1 className="text-4xl lg:text-5xl font-bold text-center">
          Welcome to Xwork
        </h1>
        <p className="text-neutral-500 mt-4 mb-10">Which describes you best?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link
            href="/register/client"
            className="rounded-2xl border border-neutral-200 p-5 hover:border-primary hover:shadow-md transition group"
          >
            <div className="h-44 rounded-xl bg-gradient-to-br from-purple-200 to-fuchsia-200 flex items-center justify-center">
              <svg
                className="h-16 w-16 text-neutral-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
                <rect
                  x="14"
                  y="13"
                  width="7"
                  height="6"
                  rx="1"
                  strokeWidth={1.5}
                />
              </svg>
            </div>
            <p className="text-lg font-semibold mt-4">Client →</p>
            <p className="text-neutral-500 text-sm mt-1">Post jobs and hire</p>
          </Link>

          <Link
            href="/register/freelancer"
            className="rounded-2xl border border-neutral-200 p-5 hover:border-primary hover:shadow-md transition group"
          >
            <div className="h-44 rounded-xl bg-gradient-to-br from-purple-200 to-fuchsia-200 flex items-center justify-center">
              <svg
                className="h-16 w-16 text-neutral-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
                <rect
                  x="4"
                  y="13"
                  width="16"
                  height="7"
                  rx="1"
                  strokeWidth={1.5}
                />
              </svg>
            </div>
            <p className="text-lg font-semibold mt-4">Freelancer →</p>
            <p className="text-neutral-500 text-sm mt-1">Work and get paid</p>
          </Link>
        </div>

        <p className="mt-10 text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
