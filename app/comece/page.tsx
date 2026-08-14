import Link from "next/link";
import ProfitStoryShowcase from "@/components/ProfitStoryShowcase";

const metrics = [
  ["Valor bruto", "R$ 210,00", "text-white"],
  ["Taxas dos apps", "− R$ 52,50", "text-rose-300"],
  ["Combustível", "− R$ 28,00", "text-amber-300"],
  ["Lucro real", "R$ 129,50", "text-emerald-300"],
];

export default function StartPage() {
  return (
    <main className="-mx-3 -mt-4 overflow-hidden bg-[#071c31] text-white sm:-mx-4 sm:-mt-6 lg:-mx-6">
      <section className="relative isolate px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-16 lg:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,.28),transparent_32%),linear-gradient(135deg,#071c31_0%,#123b63_58%,#087443_100%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div className="animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">FaturApp · feito para motoristas</div>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.03] tracking-[-.04em] sm:text-6xl">Você sabe quanto realmente sobra depois de trabalhar?</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200 sm:text-xl">Descubra seu lucro real descontando taxas, combustível, manutenção e despesas — por dia, por quilômetro e por hora.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-500 px-7 text-base font-extrabold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400">Calcular meu lucro agora <span className="ml-2">→</span></Link>
              <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 text-base font-bold text-white transition hover:bg-white/15">Já tenho acesso</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300"><span>✓ Grátis para começar</span><span>✓ Sem cartão</span><span>✓ Leva menos de 1 minuto</span></div>
          </div>

          <div className="animate-fade-up [animation-delay:150ms]">
            <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur sm:p-5">
              <div className="rounded-[1.4rem] bg-[#0d2f4f] p-5 sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white">Hoje</p><p className="mt-1 text-xs text-slate-400">Um exemplo do que fica no seu bolso</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">simulação</span></div>
                <div className="mt-7 space-y-4">{metrics.map(([label, value, color]) => <div key={label} className={`flex items-center justify-between gap-4 ${label === "Lucro real" ? "border-t border-white/10 pt-5" : ""}`}><span className={label === "Lucro real" ? "font-bold text-white" : "text-slate-300"}>{label}</span><strong className={`${color} ${label === "Lucro real" ? "text-3xl" : "text-lg"}`}>{value}</strong></div>)}</div>
                <div className="mt-6 rounded-xl bg-emerald-400/10 p-3 text-center text-sm font-semibold text-emerald-200">R$ 16,19 por hora · R$ 1,08 por km</div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-300">Faturar muito não significa lucrar muito.</p>
          </div>
        </div>
      </section>

      <ProfitStoryShowcase />

      <section className="bg-white px-4 py-14 text-[#123B63] sm:px-8 sm:py-20 lg:px-16">
        <div className="mx-auto max-w-6xl"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-600">O que o FaturApp revela</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Pare de confundir faturamento com lucro.</h2><p className="mt-4 text-lg leading-8 text-slate-600">O dinheiro que entra no aplicativo não é o dinheiro que fica com você. O FaturApp organiza os custos que normalmente passam despercebidos.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["⛽","Combustível","Veja quanto o carro realmente consome."],["📱","Taxas dos apps","Compare o bruto com o líquido."],["🔧","Manutenção","Reserve dinheiro para o desgaste do veículo."],["⏱️","Hora e km","Descubra se seu tempo está compensando."]].map(([icon,title,body])=><div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="text-2xl">{icon}</div><h3 className="mt-4 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}</div></div>
      </section>

      <section className="bg-slate-50 px-4 py-14 text-center sm:px-8 sm:py-16"><h2 className="text-3xl font-black tracking-tight text-[#123B63]">Seu próximo dia de trabalho começa com uma decisão melhor.</h2><p className="mx-auto mt-4 max-w-xl text-slate-600">Comece gratuitamente e descubra o número que realmente importa: quanto sobra no seu bolso.</p><Link href="/cadastro" className="mt-7 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#10B981] px-8 font-extrabold text-white shadow-lg shadow-emerald-700/20 hover:bg-[#059669]">Começar gratuitamente →</Link></section>
    </main>
  );
}
