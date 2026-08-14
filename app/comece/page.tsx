import Link from "next/link";
import ProfitStoryShowcase from "@/components/ProfitStoryShowcase";
import RevealOnScroll from "@/components/RevealOnScroll";

const metrics = [
  ["Valor bruto", "R$ 210,00", "text-white"],
  ["Taxas dos apps", "− R$ 52,50", "text-rose-300"],
  ["Combustível", "− R$ 28,00", "text-amber-300"],
  ["Lucro real", "R$ 129,50", "text-emerald-300"],
];

const steps = [
  ["Registre", "Anote o resultado do seu dia em poucos segundos."],
  ["Entenda", "Organize custos e transforme movimento em clareza."],
  ["Decida", "Trabalhe sabendo qual meta faz sentido para o seu bolso."],
];

export default function StartPage() {
  return (
    <main className="-mx-3 -mt-4 overflow-hidden bg-[#071c31] text-white sm:-mx-4 sm:-mt-6 lg:-mx-6">
      <section id="visao" className="relative isolate px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-16 lg:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,.3),transparent_32%),linear-gradient(135deg,#071c31_0%,#123b63_58%,#087443_100%)]" />
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
            <div className="relative">
              <div className="absolute -left-3 -top-4 z-10 rounded-2xl border border-emerald-200/20 bg-[#092943]/90 px-4 py-3 shadow-xl backdrop-blur sm:-left-8"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200">O número que importa</p><p className="mt-1 text-lg font-black text-white">R$ 129,50 <span className="text-xs font-semibold text-emerald-300">de lucro real</span></p></div>
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur sm:p-5">
                <div className="rounded-[1.4rem] bg-[#0d2f4f] p-5 sm:p-7">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white">Hoje</p><p className="mt-1 text-xs text-slate-400">Um exemplo do que fica no seu bolso</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">simulação</span></div>
                  <div className="mt-7 space-y-4">{metrics.map(([label, value, color]) => <div key={label} className={`flex items-center justify-between gap-4 ${label === "Lucro real" ? "border-t border-white/10 pt-5" : ""}`}><span className={label === "Lucro real" ? "font-bold text-white" : "text-slate-300"}>{label}</span><strong className={`${color} ${label === "Lucro real" ? "text-3xl" : "text-lg"}`}>{value}</strong></div>)}</div>
                  <div className="mt-6 rounded-xl bg-emerald-400/10 p-3 text-center text-sm font-semibold text-emerald-200">R$ 16,19 por hora · R$ 1,08 por km</div>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-slate-300">Faturar muito não significa lucrar muito.</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <ProfitStoryShowcase />

      <section id="como-funciona" className="relative overflow-hidden bg-[#081f35] px-4 py-16 sm:px-8 sm:py-24 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,.12),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(18,59,99,.7),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <RevealOnScroll direction="left">
            <p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-300">Como funciona</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Seu dia de trabalho, com mais clareza.</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Uma sequência simples para você deixar de dirigir no escuro e começar a enxergar o resultado.</p>
            <div className="mt-8 space-y-4">
              {steps.map(([title, body], index) => <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 transition duration-300 hover:border-emerald-300/40 hover:bg-white/[.07]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-sm font-black text-emerald-300">0{index + 1}</span><div><h3 className="font-extrabold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{body}</p></div></div>)}
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="right" delay={120}>
            <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-[#0d2f4f] p-3 shadow-2xl shadow-black/20 sm:p-5">
              <div className="rounded-[1.4rem] border border-white/10 bg-[#092943] p-5 sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div><span className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Seu dia no FaturApp</span><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">ATUALIZADO</span></div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Resultado do dia</p><h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">Você trabalhou com informação.</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-400">O painel reúne o que entrou, o que saiu e o que realmente sobrou.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/[.05] p-4"><p className="text-xs text-slate-400">Entrou</p><strong className="mt-2 block text-xl text-white">R$ 210</strong></div><div className="rounded-2xl bg-white/[.05] p-4"><p className="text-xs text-slate-400">Custos</p><strong className="mt-2 block text-xl text-rose-300">− R$ 80</strong></div><div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4"><p className="text-xs text-emerald-200">Sobrou</p><strong className="mt-2 block text-xl text-emerald-300">R$ 129</strong></div></div>
                <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-400/10 px-4 py-3 text-sm"><span className="text-slate-300">Leitura do seu dia</span><span className="font-bold text-emerald-300">positivo ↑</span></div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section id="beneficios" className="bg-white px-4 py-14 text-[#123B63] sm:px-8 sm:py-20 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll>
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-600">Tudo em um só lugar</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Uma visão mais inteligente do seu trabalho.</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">Do lançamento ao relatório, o FaturApp reúne as informações que ajudam você a trabalhar com mais clareza.</p>
            </div>
          </RevealOnScroll>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["✍️", "Lançamentos completos", "Registre aplicativos, combustível, quilômetros, horas e despesas."],
              ["📊", "Relatórios claros", "Acompanhe seus dias, períodos e evolução sem depender de memória."],
              ["📄", "Exportação prática", "Leve seus dados organizados para Excel e PDF quando precisar."],
              ["📲", "Resultados compartilháveis", "Transforme seus resultados em cards para enviar aos seus contatos."],
            ].map(([icon, title, body], index) => (
              <RevealOnScroll key={title} delay={index * 70}><div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-lg"><div className="text-2xl">{icon}</div><h3 className="mt-4 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div></RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-50 px-4 py-14 text-center sm:px-8 sm:py-16"><div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" /><RevealOnScroll className="relative"><p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-600">Pronto para enxergar melhor?</p><h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#123B63]">Seu próximo dia de trabalho começa com uma decisão melhor.</h2><p className="mx-auto mt-4 max-w-xl text-slate-600">Comece gratuitamente e descubra o número que realmente importa: quanto sobra no seu bolso.</p><Link href="/cadastro" className="mt-7 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#10B981] px-8 font-extrabold text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#059669]">Começar gratuitamente →</Link></RevealOnScroll></section>
    </main>
  );
}
