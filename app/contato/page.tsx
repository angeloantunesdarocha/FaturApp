import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contato | FaturApp",
  description: "Canais oficiais para falar com o FaturApp e encontrar ajuda sobre acesso, uso da plataforma e conteúdo.",
  alternates: { canonical: "https://fatur-app.vercel.app/contato" },
};

export default function ContactPage() {
  return (
    <main className="bg-slate-50 text-[#123B63]">
      <section className="bg-[#071c31] px-4 py-14 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-300">Contato</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Fale com o FaturApp pelos canais oficiais.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">Use nossas redes oficiais para dúvidas sobre acesso, funcionamento, conteúdo ou sugestões para a plataforma.</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          <a href="https://www.instagram.com/faturappbrasil/" target="_blank" rel="noopener noreferrer" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">Instagram</p>
            <h2 className="mt-3 text-2xl font-black">@faturappbrasil</h2>
            <p className="mt-3 leading-7 text-slate-600">Acompanhe conteúdos e envie uma mensagem pela conta oficial.</p>
            <span className="mt-5 inline-flex font-extrabold text-emerald-700">Abrir Instagram →</span>
          </a>

          <a href="https://www.facebook.com/share/1DCMkxEp7E/" target="_blank" rel="noopener noreferrer" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">Facebook</p>
            <h2 className="mt-3 text-2xl font-black">FaturApp Brasil</h2>
            <p className="mt-3 leading-7 text-slate-600">Consulte a página oficial e entre em contato pelos recursos disponíveis na plataforma.</p>
            <span className="mt-5 inline-flex font-extrabold text-emerald-700">Abrir Facebook →</span>
          </a>
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-black">Antes de falar com a gente</h2>
          <p className="mt-3 leading-7 text-slate-600">Para dúvidas sobre lucro, combustível, custos e organização, a central de guias pode ter a resposta imediatamente.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/guias" className="rounded-xl bg-emerald-500 px-4 py-2.5 font-extrabold text-white hover:bg-emerald-600">Ver guias</Link>
            <Link href="/comece#faq" className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold hover:border-emerald-300 hover:text-emerald-700">Ver dúvidas frequentes</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
