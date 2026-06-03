import Link from "next/link"

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="mb-12">
        <Link href="/" className="text-2xl font-bold text-gray-900">
          FreelanceX
        </Link>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 mb-3">
        Join as a client or freelancer
      </h1>

      <p className="text-gray-500 mb-10">
        Which describes you best?
      </p>

      <div className="flex gap-6">
        <Link href="/register/client">
          <div className="border-2 border-gray-200 rounded-xl p-8 w-64 cursor-pointer hover:border-blue-500 transition-all group">
            <div className="w-full h-40 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">Client →</p>
            <p className="text-gray-500 text-sm mt-1">Post jobs and hire</p>
          </div>
        </Link>

        <Link href="/register/freelancer">
          <div className="border-2 border-gray-200 rounded-xl p-8 w-64 cursor-pointer hover:border-blue-500 transition-all group">
            <div className="w-full h-40 rounded-lg bg-gradient-to-br from-yellow-100 to-green-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">Freelancer →</p>
            <p className="text-gray-500 text-sm mt-1">Work and get paid</p>
          </div>
        </Link>
      </div>

      <p className="mt-10 text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Log in
        </Link>
      </p>
    </main>
  )
}