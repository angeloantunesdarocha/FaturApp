import RevealOnScroll from "@/components/RevealOnScroll";

type Feature = {
  title: string;
  body: string;
  icon: "entry" | "report" | "export" | "share";
};

const features: Feature[] = [
  {
    title: "Lançamentos completos",
    body: "Registre aplicativos, receitas, taxas, combustível, km, horas, manutenção e despesas extras.",
    icon: "entry",
  },
  {
    title: "Relatórios claros",
    body: "Analise seus lançamentos por período e acompanhe receita, custos, lucro, km e horas trabalhadas.",
    icon: "report",
  },
  {
    title: "Exportação prática",
    body: "Gere relatórios em PDF, compartilhe o resumo pelo WhatsApp ou envie o PDF por e-mail.",
    icon: "export",
  },
  {
    title: "Resultados compartilháveis",
    body: "Escolha um lançamento, gere um card com seu resultado e compartilhe pelo celular.",
    icon: "share",
  },
];

function FeatureIcon({ icon }: { icon: Feature["icon"] }) {
  if (icon === "entry") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
        <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m16 15 1.5 1.5L20 14" />
      </svg>
    );
  }

  if (icon === "report") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 15v-3M11 15V8M15 15v-5M19 15v-8" />
      </svg>
    );
  }

  if (icon === "export") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0 4-4m-4 4-4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8.5a5 5 0 0 1 9.2-2.7M17 15.5a5 5 0 0 1-9.2 2.7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.5h2.8v2.8M7.5 19.5H4.7v-2.8" />
      <path strokeLinecap="round" d="M9 12h6M12 9v6" />
    </svg>
  );
}

export default function FeatureGrid() {
  return (
    <section id="beneficios" className="bg-white px-4 py-14 text-[#123B63] sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll>
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">
              Recursos reais do app
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Tudo o que você precisa para entender o seu resultado.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Do primeiro lançamento ao compartilhamento do resultado, o FaturApp organiza o que faz parte da rotina do motorista.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {features.map((feature, index) => (
            <RevealOnScroll key={feature.title} delay={index * 80}>
              <article className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:bg-white hover:shadow-xl hover:shadow-slate-900/8 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123B63] text-emerald-300 transition duration-300 group-hover:bg-emerald-500 group-hover:text-white">
                    <FeatureIcon icon={feature.icon} />
                  </span>
                  <span className="text-xs font-bold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-extrabold text-[#123B63]">{feature.title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{feature.body}</p>
                <div className="mt-6 h-1 w-12 rounded-full bg-emerald-400 transition-all duration-300 group-hover:w-20" />
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
