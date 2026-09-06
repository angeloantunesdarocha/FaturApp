/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

const scenarios = [
  {
    name: "Carlos",
    city: "São Paulo · SP",
    apps: "Uber e 99",
    photo: "https://images.pexels.com/photos/22661939/pexels-photo-22661939.jpeg?auto=compress&cs=tinysrgb&w=320&h=320&fit=crop",
    title: "R$ 30 por hora… antes dos custos",
    story: "Em um dia de 10 horas, Carlos recebe R$ 300 após taxas. Com R$ 180 de custos, sobram R$ 120: R$ 12 por hora. Registrar as despesas muda a leitura do resultado.",
    result: "R$ 120 ÷ 10 h = R$ 12/h",
  },
  {
    name: "Mariana",
    city: "Belo Horizonte · MG",
    apps: "iFood",
    photo: "https://images.pexels.com/photos/15237956/pexels-photo-15237956.jpeg?auto=compress&cs=tinysrgb&w=320&h=320&fit=crop",
    title: "O valor das entregas não é tudo",
    story: "Mariana recebe R$ 180 após taxas em 6 horas. Ao registrar R$ 30 de combustível, R$ 10 de manutenção e R$ 20 de extras, identifica R$ 120 de lucro no período.",
    result: "R$ 120 ÷ 6 h = R$ 20/h",
  },
  {
    name: "Rafael",
    city: "Janaúba · MG",
    apps: "inDrive e entregas",
    photo: "https://images.pexels.com/photos/4320869/pexels-photo-4320869.jpeg?auto=compress&cs=tinysrgb&w=320&h=320&fit=crop",
    title: "Mais quilômetros, mais atenção aos custos",
    story: "Rafael recebe R$ 240 após taxas e percorre 100 km. Com R$ 90 de custos registrados, sobram R$ 150. Olhar o resultado por quilômetro ajuda a comparar os dias.",
    result: "R$ 150 ÷ 100 km = R$ 1,50/km",
  },
];

export default function DriverScenarios() {
  return (
    <section aria-labelledby="driver-scenarios-title" className="bg-slate-50 px-4 py-14 text-[#123B63] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <h2 id="driver-scenarios-title" className="text-3xl font-black">Três rotinas. Uma pergunta: quanto sobrou?</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <article key={scenario.name} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <img
                  src={scenario.photo}
                  alt={`Foto de ${scenario.name}`}
                  width={72}
                  height={72}
                  loading="lazy"
                  className="h-[72px] w-[72px] shrink-0 rounded-2xl border border-slate-200 object-cover object-center shadow-sm"
                />
                <div>
                  <p className="text-lg font-bold">{scenario.name}</p>
                  <p className="text-sm text-slate-600">{scenario.city}</p>
                  <p className="text-sm font-medium text-emerald-700">{scenario.apps}</p>
                </div>
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
