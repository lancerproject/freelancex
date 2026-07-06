import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { CONTENT_PAGES } from "@/lib/content-pages";
import { OperatorNote } from "@/components/operator-note";
import { createClient } from "@/lib/supabase-server";

// Legal/policy content pages render with the same compact typography as the
// standalone legal pages (Terms, Privacy, etc.) — main header 20px, section
// headings 14px, body 10px — so every policy page looks consistent. All other
// content pages keep the larger marketing layout.
const LEGAL_SLUGS = new Set([
  "acceptable-use",
  "cookie-policy",
  "ca-notice",
  "your-privacy-choices",
]);

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  let slug: string[] = [];
  try {
    ({ slug } = await params);
  } catch {
    // Malformed URL (e.g. a stray % that can't be decoded) — just 404.
    notFound();
  }
  const key = (slug?.[0] ?? "").toLowerCase();
  const page = CONTENT_PAGES[key];

  if (!page || slug.length > 1) notFound();

  // ---- Legal / policy layout (matches the standalone legal pages) ----
  if (LEGAL_SLUGS.has(key)) {
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
          <h1 className="text-[20px] font-bold leading-tight">{page.title}</h1>
          {page.subtitle && (
            <p className="text-[10px] text-neutral-700 leading-relaxed mt-4">
              {page.subtitle}
            </p>
          )}

          <OperatorNote />

          <div className="mt-8 space-y-7">
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-[14px] font-semibold text-neutral-900">
                  {s.heading}
                </h2>
                <div className="mt-1.5 space-y-2">
                  {s.body.map((p, i) => (
                    <p
                      key={i}
                      className="text-[10px] leading-relaxed text-neutral-700"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---- Standard marketing/info layout ----
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      <article className="max-w-3xl mx-auto px-6 lg:px-8 py-14">
        <h1 className="text-4xl font-bold">{page.title}</h1>
        {page.subtitle && (
          <p className="text-neutral-600 mt-3 text-lg">{page.subtitle}</p>
        )}

        <div className="mt-10 space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold text-neutral-900">
                {s.heading}
              </h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-neutral-700 mt-3 leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
