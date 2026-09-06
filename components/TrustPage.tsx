import Link from "next/link";

export default function TrustPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
}) {
  return (
    <main className="bg-slate-50 text-[#123B63]">
      <section className="bg-[#071c31] px-4 py-14 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-300">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">{intro}</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {sections.map((section) => (
            <section key={section.heading} className="mb-9 border-b border-slate-100 pb-9 last:mb-0 last:border-0 last:pb-0">
              <h2 className="text-2xl font-black">{section.heading}</h2>
              <div className="mt-4 space-y-4 leading-8 text-slate-700">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.bullets && <ul className="mt-4 space-y-2 text-slate-700">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-3"><span className="font-black text-emerald-700">✓</span><span>{bullet}</span></li>)}</ul>}
            </section>
          ))}

          <div className="mt-10 flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-5">
            <Link href="/comece" className="rounded-xl bg-emerald-500 px-4 py-2.5 font-extrabold text-white hover:bg-emerald-600">Conhecer o FaturApp</Link>
            <Link href="/guias" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold hover:border-emerald-300 hover:text-emerald-700">Ver guias</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
