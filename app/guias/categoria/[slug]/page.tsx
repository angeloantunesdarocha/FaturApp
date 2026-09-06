import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getGuidesByCategory, guideCategories } from "@/lib/guides";

export function generateStaticParams() {
  return guideCategories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: `${category.label} | Guias`,
    description: category.description,
    alternates: { canonical: `https://fatur-app.vercel.app/guias/categoria/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const categoryGuides = getGuidesByCategory(category.slug);

  return (
    <main className="bg-slate-50 text-[#123B63]">
      <section className="bg-[#071c31] px-4 py-14 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-300"><Link href="/guias" className="hover:text-white">Guias</Link><span className="mx-2">/</span><span>{category.label}</span></nav>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-emerald-300">Categoria</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{category.label}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">{category.description}</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-2">
            {categoryGuides.map((guide) => (
              <article key={guide.slug} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{guide.readingTime}</p>
                <h2 className="mt-3 text-2xl font-black leading-tight">{guide.title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{guide.description}</p>
                <Link href={`/guias/${guide.slug}`} className="mt-6 inline-flex font-extrabold text-emerald-700 hover:text-emerald-800">Ler guia completo →</Link>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {guideCategories.filter((item) => item.slug !== category.slug).map((item) => (
              <Link key={item.slug} href={`/guias/categoria/${item.slug}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition hover:border-emerald-300 hover:text-emerald-700">{item.label}</Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
