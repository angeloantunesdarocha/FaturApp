import Link from "next/link";

const scenarios = [
  { name: "Carlos", initials: "CA", city: "São Paulo · SP", apps: "Uber e 99", title: "R$ 30 por hora… antes dos custos", story: "Em um dia ilustrativo de 10 horas, Carlos recebe R$ 300 após taxas. Com R$ 180 de custos, sobram R$ 120: R$ 12 por hora. Registrar as despesas muda a leitura do resultado.", result: "R$ 120 ÷ 10 h = R$ 12/h" },
  { name: "Mariana", initials: "MA", city: "Belo Horizonte · MG", apps: "iFood", title: "O valor das entregas não é tudo", story: "Mariana recebe R$ 180 após taxas em 6 horas. Ao registrar R$ 30 de combustível, R$ 10 de manutenção e R$ 20 de extras, identifica R$ 120 de lucro estimado no período.", result: "R$ 120 ÷ 6 h = R$ 20/h" },
  { name: "Rafael", initials: "RA", city: "Janaúba · MG", apps: "inDrive e entregas", title: "Mais quilômetros, mais atenção aos custos", story: "Rafael recebe R$ 240 após taxas e percorre 100 km. Com R$ 90 de custos registrados, sobram R$ 150. Olhar o resultado por quilômetro ajuda a comparar os dias.", result: "R$ 150 ÷ 100 km = R$ 1,50/km" },
];

export default function DriverScenarios() {
  return (
    <section aria-labelledby="driver-scenarios-title" className="bg-slate-50 px-4 py-14 text-[#123B63] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Situações ilustrativas</p>
        <h2 id="driver-scenarios-title" className="mt-3 text-3xl font-black">Três rotinas. Uma pergunta: quanto sobrou?</h2>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">Personagens, cidades e cenários fictícios para demonstrar os cálculos. Não são depoimentos de clientes nem resultados garantidos.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {scenarios.map(scenario => (
            <article key={scenario.name} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#123B63] text-lg font-bold text-emerald-300">{scenario.initials}</span>
                <div><p className="font-bold">{scenario.name} · personagem fictício</p><p className="text-sm text-slate-600">{scenario.city}</p><p className="text-sm text-slate-600">{scenario.apps}</p></div>
              </div>
              <h3 className="mt-6 text-xl font-bold">{scenario.title}</h3>
              <p className="mb-6 mt-3 leading-7 text-slate-600">{scenario.story}</p>
              <p className="mt-auto rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">{scenario.result}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#123B63] p-6 text-white sm:flex-row sm:items-center">
          <p className="text-lg font-bold">Seu próximo turno com mais clareza.</p>
          <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-300 px-5 font-bold text-[#071c31] transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Descobrir meu lucro real →</Link>
        </div>
      </div>
    </section>
  );
}
