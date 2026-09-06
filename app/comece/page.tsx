import Link from "next/link";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import FeatureGrid from "@/components/FeatureGrid";
import FaqSection from "@/components/FaqSection";
import HeroLiveSimulator from "@/components/HeroLiveSimulator";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function StartPage() {
  return (
    <main className="-mx-3 -mt-4 overflow-hidden bg-[#071c31] text-white sm:-mx-4 sm:-mt-6 lg:-mx-6">
      <section id="visao" className="relative isolate px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-16 lg:pt-20">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute -right-24 top-12 -z-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="mx-auto grid min-w-0 max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <RevealOnScroll direction="left" className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">FaturApp · feito para motoristas</div>
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">Você ganhou R$ 280 hoje.<span className="mt-3 block text-emerald-300">Mas quanto realmente sobrou no seu bolso?</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200 sm:text-xl">Taxas dos apps, combustível, manutenção e despesas reduzem o que fica para você. O FaturApp mostra seu lucro real por dia, por km e por hora — comece em 1 minuto.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-400 px-7 text-base font-extrabold text-[#07334a] shadow-lg shadow-emerald-950/30 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-400">Descobrir meu lucro real <span className="ml-2">→</span></Link>
              <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 text-base font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">Já tenho acesso</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300"><span>✓ Grátis</span><span>✓ Sem pedir cartão</span><span>✓ Leva 1 minuto</span></div>
          </RevealOnScroll>

          <RevealOnScroll direction="right" delay={120} className="min-w-0">
            <HeroLiveSimulator />
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-white px-4 py-14 text-[#123B63] sm:px-8 lg:px-16" aria-labelledby="example-title">
        <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Veja o resultado na prática</p><h2 id="example-title" className="mt-3 text-3xl font-black">Seu faturamento é só o começo da conta.</h2><p className="mt-4 leading-7 text-slate-600">Neste exemplo, R$ 280 viram R$ 135 depois dos custos. Em 10 horas de trabalho, isso representa R$ 13,50 por hora. Você sabia quanto estava sobrando?</p><p className="mt-3 text-sm text-slate-500">Valores ilustrativos. Ajuste a simulação acima para o seu dia.</p></div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Exemplo de balanço diário</p>
            <dl className="mt-5 space-y-3 text-sm">
              {[['Receita bruta', 'R$ 280,00'], ['Taxas dos apps (25%)', '− R$ 70,00'], ['Receita após taxas', 'R$ 210,00'], ['Combustível', '− R$ 45,00'], ['Manutenção e extras', '− R$ 30,00']].map(([label, amount]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-bold">{amount}</dd></div>)}
            </dl>
            <div className="mt-5 border-t border-emerald-200 pt-5"><p className="text-sm font-semibold">Lucro estimado do dia</p><p className="mt-1 text-4xl font-black text-emerald-700">R$ 135,00</p><p className="mt-2 font-bold">10 h de trabalho · R$ 13,50/h</p></div>
          </div>
        </div>
      </section>
      <BeforeAfterSection />
      <section id="como-funciona" className="px-4 py-14 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-6xl"><h2 className="text-3xl font-black">Do seu primeiro lançamento à clareza.</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{[
          {icon: "＋", title: "Registre seu dia", text: "Adicione ganhos, km, horas e despesas ao longo do turno."},
          {icon: "−", title: "Enxergue os custos", text: "Confira taxas, combustível, manutenção e extras juntos."},
          {icon: "↗", title: "Veja quanto sobrou", text: "Compare seu lucro por dia, por quilômetro e por hora."},
        ].map((step, index) => <article key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-6"><span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400 text-4xl font-bold text-[#071c31]">{step.icon}</span><h3 className="mt-5 text-xl font-bold">{index + 1}. {step.title}</h3><p className="mt-3 leading-7 text-slate-300">{step.text}</p></article>)}</div></div>
      </section>

      <FeatureGrid />

      <FaqSection />

      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#0b2d4f] via-[#123b63] to-[#087f69] px-4 py-16 text-center sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />

        <RevealOnScroll className="relative mx-auto max-w-3xl">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-emerald-100">
            Seu próximo passo
          </div>
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">
            Seu próximo turno merece uma conta mais clara.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            Cadastre agora e comece o próximo dia com seus ganhos e custos organizados.
          </p>
          <Link
            href="/cadastro"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-400 px-8 text-base font-extrabold text-[#07334a] shadow-[0_14px_35px_rgba(4,20,35,0.28)] transition duration-300 hover:-translate-y-1 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#123b63]"
          >
            Descobrir meu lucro real <span className="ml-2 text-lg">→</span>
          </Link>
          <p className="mt-5 text-sm text-emerald-100">Teste por 7 dias. Reembolso? Não precisa: é grátis e sem pedir cartão.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-200">
            <span>✓ Sem pedir cartão</span>
            <span>✓ Dados do seu trabalho organizados</span>
            <span>✓ Acesso pelo navegador</span>
          </div>
        </RevealOnScroll>
      </section>
    </main>
  );
}
