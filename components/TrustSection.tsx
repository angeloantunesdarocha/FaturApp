import RevealOnScroll from "@/components/RevealOnScroll";

type TrustItem = {
  title: string;
  body: string;
  icon: "costs" | "result" | "start";
};

const items: TrustItem[] = [
  {
    title: "Você vê cada custo",
    body: "Taxas, combustível, manutenção e despesas entram na leitura do seu resultado.",
    icon: "costs",
  },
  {
    title: "Você entende cada resultado",
    body: "O FaturApp mostra quanto sobra por dia, por quilômetro e por hora.",
    icon: "result",
  },
  {
    title: "Você começa sem barreira",
    body: "Grátis para começar, sem cartão e com um lançamento que leva menos de 1 minuto.",
    icon: "start",
  },
];

function TrustIcon({ icon }: { icon: TrustItem["icon"] }) {
  if (icon === "costs") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
        <path strokeLinecap="round" d="M8 8h8M8 12h5M8 16h3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m16 14 1.5 1.5L20 13" />
      </svg>
    );
  }

  if (icon === "result") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m7 15 3-3 2 2 5-6" />
        <path strokeLinecap="round" d="M17 8h2v2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 19 6v5.2c0 4.2-2.8 7.9-7 9.3-4.2-1.4-7-5.1-7-9.3V6l7-2.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.7 12 2.1 2.1 4.5-4.5" />
    </svg>
  );
}

export default function TrustSection() {
  return (
    <section id="confianca" className="border-y border-slate-200/80 bg-[#f3f8f7] px-4 py-14 text-[#123B63] sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Transparência sobre o produto
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Confiança começa com clareza.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              O FaturApp organiza os dados do seu dia para você entender o que entrou, o que saiu e quanto realmente sobrou.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 90}>
              <article className="group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-900/8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123B63] text-emerald-300 transition duration-300 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white">
                  <TrustIcon icon={item.icon} />
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={250}>
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-5 py-4 text-center sm:flex-row sm:text-left">
            <div>
              <p className="text-sm font-extrabold text-[#123B63]">Comece pelo seu próprio dia.</p>
              <p className="mt-1 text-sm text-slate-600">A melhor prova é enxergar seus números organizados.</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">Dados do seu lançamento</span>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
