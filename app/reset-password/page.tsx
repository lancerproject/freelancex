import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
