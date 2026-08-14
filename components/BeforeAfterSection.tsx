import RevealOnScroll from "@/components/RevealOnScroll";

type Item = {
  title: string;
  body: string;
};

const beforeItems: Item[] = [
  {
    title: "Não sabe quanto lucrou",
    body: "O valor que entrou parece bom, mas os custos ficam espalhados.",
  },
  {
    title: "Contas difíceis de acompanhar",
    body: "Taxas, combustível e despesas acabam dependendo da memória.",
  },
  {
    title: "Surpresas no fim do mês",
    body: "Sem comparar os dias, fica difícil entender o que realmente compensou.",
  },
];

const afterItems: Item[] = [
  {
    title: "Lucro real do dia",
    body: "Veja quanto sobrou depois de taxas, combustível e outros custos registrados.",
  },
  {
    title: "Custos organizados",
    body: "Reúna aplicativos, km, horas, combustível, manutenção e despesas em um só lançamento.",
  },
  {
    title: "Decisões mais claras",
    body: "Compare seu resultado por dia, por quilômetro e por hora.",
  },
];

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4 21 20H3L12 4Z" />
      <path strokeLinecap="round" d="M12 9v5M12 17h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.2 4.2L19 6.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  items,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: Item[];
  tone: "before" | "after";
}) {
  const isAfter = tone === "after";
  const panelClass = "relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 " + (isAfter ? "border-emerald-200 bg-[#effbf5]" : "border-slate-200 bg-slate-100");
  const glowClass = "absolute -right-16 -top-20 h-44 w-44 rounded-full blur-3xl " + (isAfter ? "bg-emerald-300/35" : "bg-slate-300/45");

  return (
    <div className={panelClass}>
      <div className={glowClass} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className={"flex h-10 w-10 items-center justify-center rounded-xl " + (isAfter ? "bg-emerald-500 text-white" : "bg-slate-500 text-white")}>
            {isAfter ? <CheckIcon /> : <AlertIcon />}
          </span>
          <div>
            <p className={"text-xs font-extrabold uppercase tracking-[.16em] " + (isAfter ? "text-emerald-700" : "text-slate-500")}>{eyebrow}</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-[#123B63]">{title}</h3>
          </div>
        </div>

        <p className="mt-5 max-w-lg text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-7 space-y-3">
          {items.map((item) => (
            <div key={item.title} className={"rounded-2xl border bg-white/80 p-4 " + (isAfter ? "border-emerald-200/80" : "border-slate-200")}>
              <div className="flex items-start gap-3">
                <span className={"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full " + (isAfter ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>
                  {isAfter ? <CheckIcon /> : <AlertIcon />}
                </span>
                <div>
                  <p className="font-extrabold text-[#123B63]">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BeforeAfterSection() {
  return (
    <section id="transformacao" className="bg-slate-50 px-4 py-14 text-[#123B63] sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-blue-700 shadow-sm">
              Uma mudança de perspectiva
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Pare de olhar só para o faturamento.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              O que importa para o motorista é saber o que realmente ficou depois de trabalhar.
            </p>
          </div>
        </RevealOnScroll>

        <div className="relative mt-10 grid gap-4 lg:grid-cols-2">
          <RevealOnScroll direction="left">
            <Panel
              eyebrow="Antes"
              title="No escuro sobre o dia"
              description="Quando os custos não estão organizados, o faturamento bruto pode esconder o resultado real."
              items={beforeItems}
              tone="before"
            />
          </RevealOnScroll>

          <RevealOnScroll direction="right" delay={120}>
            <Panel
              eyebrow="Depois"
              title="Mais clareza para decidir"
              description="Com os dados do seu lançamento reunidos, você entende melhor o resultado do seu trabalho."
              items={afterItems}
              tone="after"
            />
          </RevealOnScroll>

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" aria-hidden="true">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-50 bg-[#123B63] text-white shadow-lg">
              <ArrowIcon />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
