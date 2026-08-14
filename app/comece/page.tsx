import Link from "next/link";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import FeatureGrid from "@/components/FeatureGrid";
import HeroProfitMockup from "@/components/HeroProfitMockup";
import ProfitStoryShowcase from "@/components/ProfitStoryShowcase";
import ProfitSimulator from "@/components/ProfitSimulator";
import RevealOnScroll from "@/components/RevealOnScroll";
import TrustSection from "@/components/TrustSection";

export default function StartPage() {
  return (
    <main className="-mx-3 -mt-4 overflow-hidden bg-[#071c31] text-white sm:-mx-4 sm:-mt-6 lg:-mx-6">
      <section id="visao" className="relative isolate px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-16 lg:pt-20">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute -right-24 top-12 -z-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="mx-auto grid min-w-0 max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <RevealOnScroll direction="left" className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">FaturApp · feito para motoristas</div>
            <h1 className="marquee-viewport w-full min-w-0 max-w-2xl text-4xl font-black leading-[1.03] tracking-[-.04em] sm:text-6xl" aria-label="Você sabe quanto realmente sobra depois de trabalhar?"><span className="marquee-track" aria-hidden="true"><span className="marquee-item">Você sabe quanto realmente sobra depois de trabalhar?</span><span className="marquee-item">Você sabe quanto realmente sobra depois de trabalhar?</span></span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200 sm:text-xl">Descubra seu lucro real descontando taxas, combustível, manutenção e despesas — por dia, por quilômetro e por hora.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-500 px-7 text-base font-extrabold text-white shadow-lg shadow-emerald-950/30 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-400">Calcular meu lucro agora <span className="ml-2">→</span></Link>
              <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 text-base font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">Já tenho acesso</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300"><span>✓ Grátis para começar</span><span>✓ Sem cartão</span><span>✓ Leva menos de 1 minuto</span></div>
          </RevealOnScroll>

          <RevealOnScroll direction="right" delay={120} className="min-w-0">
            <HeroProfitMockup />
          </RevealOnScroll>
        </div>
      </section>

      <TrustSection />

      <div id="como-funciona"><ProfitStoryShowcase /></div>

      <ProfitSimulator />

      <BeforeAfterSection />

      <FeatureGrid />

      <section className="relative overflow-hidden bg-slate-50/ px-4 py-14 text-center sm:px-8 sm:py-16"><div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" /><RevealOnScroll className="relative"><p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-600">Pronto para enxergar melhor?</p><h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#123B63]">Seu próximo dia de trabalho começa com uma decisão melhor.</h2><p className="mx-auto mt-4 max-w-xl text-slate-600">Comece gratuitamente e descubra o número que realmente importa: quanto sobra no seu bolso.</p><Link href="/cadastro" className="mt-7 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#10B981] px-8 font-extrabold text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#059669]">Começar gratuitamente →</Link></RevealOnScroll></section>
    </main>
  );
}
