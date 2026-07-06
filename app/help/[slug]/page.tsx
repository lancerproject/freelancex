import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { HELP_ARTICLES, HELP_CATEGORIES } from "@/lib/help-center";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let slug = "";
  try {
    ({ slug } = await params);
  } catch {
    notFound();
  }
  const article = HELP_ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  const category = HELP_CATEGORIES.find((c) => c.key === article.category);
  const related = HELP_ARTICLES.filter(
    (a) => a.category === article.category && a.slug !== article.slug
  ).slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <p className="text-sm text-neutral-500 mb-6">
          <Link href="/help" className="hover:underline">
            Help
          </Link>
          {category && (
            <>
              {" / "}
              <Link
                href={`/help/category/${category.key}`}
                className="hover:underline"
              >
                {category.title}
              </Link>
            </>
          )}
        </p>

        <article>
          <h1 className="text-3xl font-bold">{article.title}</h1>
          <div className="mt-6 space-y-4">
            {article.body.map((p, i) => (
              <p key={i} className="text-neutral-700 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </article>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-semibold text-neutral-900 mb-3">
              Related articles
            </h2>
            <ul className="space-y-2">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/help/${a.slug}`}
                    className="text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 rounded-2xl bg-neutral-100 p-6 text-center">
          <p className="text-neutral-700">Was this helpful, or still stuck?</p>
          <Link
            href="/contact"
            className="inline-block mt-3 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
          >
            Contact us
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
