import { loginWithGoogle } from "./actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <form action={loginWithGoogle}>
        <div className="border rounded-xl p-8 shadow-md">
          <h1 className="text-2xl font-bold mb-4">
            Login
          </h1>

          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Continue with Google
          </button>
        </div>
      </form>
    </main>
  );
}