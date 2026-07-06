import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { LEGAL_DOCS, OPERATOR } from "@/lib/legal";

export const metadata = {
  title: "Legal Center | Xwork",
};

export default async function LegalCenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {!user && (
        <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-200">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-primary">X</span>
            <span className="text-neutral-900">work</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-primary font-medium"
          >
            Back
          </Link>
        </header>
      )}

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-[20px] font-bold leading-tight">
          Xwork Legal Center
        </h1>
        <p className="text-[10px] text-neutral-700 leading-relaxed mt-4">
          Everything that governs your use of Xwork, in one place. Together these
          documents form your agreement with us. We recommend reading the Terms
          of Service and Privacy Policy first.
        </p>

        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {LEGAL_DOCS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="block py-4 group"
            >
              <span className="text-[14px] font-semibold text-neutral-900 group-hover:text-primary">
                {d.label}
              </span>
              <span className="block text-[10px] text-neutral-600 mt-0.5">
                {d.blurb}
              </span>
            </Link>
          ))}
        </div>

        {(OPERATOR.entity || OPERATOR.email) && (
          <p className="text-[10px] text-neutral-500 mt-8 leading-relaxed">
            {OPERATOR.entity ? `Xwork is operated by ${OPERATOR.entity}. ` : ""}
            {OPERATOR.email
              ? `For legal or privacy questions, contact ${OPERATOR.email}.`
              : ""}
          </p>
        )}
      </div>
    </main>
  );
}
