import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, guides } from "@/lib/guides";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `https://fatur-app.vercel.app/guias/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://fatur-app.vercel.app/guias/${guide.slug}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const relatedGuides = guide.related.map((relatedSlug) => getGuide(relatedSlug)).filter(Boolean);

  return (
    <main className="bg-white text-[#123B63]">
      <article>
        <header className="bg-[#071c31] px-4 py-14 text-white sm:px-8 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-300">
              <Link href="/guias" className="hover:text-white">Guias</Link>
              <span className="mx-2">/</span>
              <Link href={`/guias/categoria/${guide.category}`} className="hover:text-white">{guide.categoryLabel}</Link>
            </nav>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-emerald-300">{guide.categoryLabel} · {guide.readingTime}</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{guide.title}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-200">{guide.intro}</p>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1fr_280px] lg:py-16">
          <div className="max-w-3xl">
            {guide.sections.map((section) => (
              <section key={section.heading} className="mb-10 last:mb-0">
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                {section.bullets && (
                  <ul className="mt-5 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-slate-700">
                    {section.bullets.map((bullet) => <li key={bullet} className="flex gap-3"><span className="font-black text-emerald-700">✓</span><span>{bullet}</span></li>)}
                  </ul>
                )}
              </section>
            ))}

            <section className="mt-12 rounded-3xl bg-[#123B63] p-6 text-white sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-300">Leve o cálculo para a sua rotina</p>
              <h2 className="mt-3 text-2xl font-black">Use seus próprios números no FaturApp.</h2>
              <p className="mt-3 leading-7 text-slate-200">Registre ganhos, taxas, combustível, manutenção, despesas, quilômetros e horas para acompanhar seu resultado real.</p>
              <Link href="/comece" className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-extrabold text-[#07334a] transition hover:bg-emerald-300">Conhecer o FaturApp →</Link>
            </section>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:sticky lg:top-24">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-500">Continue aprendendo</p>
            <div className="mt-4 space-y-4">
              {relatedGuides.map((related) => related && (
                <Link key={related.slug} href={`/guias/${related.slug}`} className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-300">
                  <p className="font-extrabold leading-5">{related.title}</p>
                  <p className="mt-2 text-xs font-bold text-emerald-700">{related.readingTime} →</p>
                </Link>
              ))}
            </div>
            <Link href="/guias" className="mt-5 inline-flex text-sm font-extrabold text-emerald-700">Ver todos os guias →</Link>
          </aside>
        </div>
      </article>
    </main>
  );
}
