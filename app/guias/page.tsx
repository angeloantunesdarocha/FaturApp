import type { Metadata } from "next";
import Link from "next/link";
import { guideCategories, guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guias para motoristas de aplicativo",
  description: "Guias práticos sobre lucro real, combustível, custos, produtividade e organização para motoristas de aplicativo.",
  alternates: { canonical: "https://fatur-app.vercel.app/guias" },
  openGraph: {
    title: "Guias FaturApp para motoristas de aplicativo",
    description: "Aprenda a medir lucro real, custos, horas e quilômetros com mais clareza.",
    url: "https://fatur-app.vercel.app/guias",
    type: "website",
  },
};

export default function GuidesPage() {
  return (
    <main className="bg-slate-50 text-[#123B63]">
      <section className="bg-[#071c31] px-4 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-300">Central de conhecimento</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">Guias para entender melhor o dinheiro do seu trabalho.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">Conteúdo direto para motoristas e entregadores que querem separar faturamento de lucro, controlar custos e comparar o resultado por dia, hora e quilômetro.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/comece" className="rounded-xl bg-emerald-400 px-5 py-3 font-extrabold text-[#07334a] transition hover:bg-emerald-300">Conhecer o FaturApp →</Link>
            <Link href="/guias/lucro-real-motorista-app" className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15">Começar pelo lucro real</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {guideCategories.map((category) => (
              <Link key={category.slug} href={`/guias/categoria/${category.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
                <p className="font-extrabold text-[#123B63] group-hover:text-emerald-700">{category.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
                <span className="mt-4 inline-block text-sm font-bold text-emerald-700">Ver categoria →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">10 guias principais</p>
              <h2 className="mt-2 text-3xl font-black">Conteúdo essencial para começar</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">Os guias usam exemplos didáticos e não substituem seus próprios registros. Use seus números reais para tomar decisões.</p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {guides.map((guide) => (
              <article key={guide.slug} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  <Link href={`/guias/categoria/${guide.category}`} className="rounded-full bg-emerald-50 px-3 py-1 hover:bg-emerald-100">{guide.categoryLabel}</Link>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{guide.readingTime}</span>
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight">{guide.title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{guide.description}</p>
                <Link href={`/guias/${guide.slug}`} className="mt-6 inline-flex font-extrabold text-emerald-700 hover:text-emerald-800">Ler guia completo →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
