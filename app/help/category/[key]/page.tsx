import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { HELP_ARTICLES, HELP_CATEGORIES } from "@/lib/help-center";

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  let key = "";
  try {
    ({ key } = await params);
  } catch {
    notFound();
  }
  const category = HELP_CATEGORIES.find((c) => c.key === key);
  if (!category) notFound();

  const articles = HELP_ARTICLES.filter((a) => a.category === key);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <p className="text-sm text-neutral-500 mb-6">
          <Link href="/help" className="hover:underline">
            Help
          </Link>
          {" / "}
          {category.title}
        </p>

        <h1 className="text-3xl font-bold">{category.title}</h1>
        <p className="text-neutral-600 mt-2">{category.desc}</p>

        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="flex items-center justify-between py-4 group"
            >
              <span className="text-neutral-800 group-hover:text-primary">
                {a.title}
              </span>
              <span className="text-neutral-400 group-hover:text-primary">›</span>
            </Link>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
