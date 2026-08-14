"use client";

import { useEffect, useRef, useState } from "react";

const scenes = [
  {
    label: "1 · Registre",
    title: "Comece pelo seu dia real",
    description: "Anote suas corridas, aplicativos, quilômetros, horas e abastecimentos em um só lugar.",
    metricTitle: "Lançamento organizado",
    metricValue: "Apps · km · horas",
    metricClass: "text-sky-200",
    items: ["Corridas", "Quilometragem", "Horas trabalhadas"],
    glow: "bg-sky-400/20",
  },
  {
    label: "2 · Organize",
    title: "Enxergue cada custo",
    description: "Combustível, taxas, manutenção e despesas deixam de ficar escondidos no fim do dia.",
    metricTitle: "Custos visíveis",
    metricValue: "Tudo separado",
    metricClass: "text-amber-200",
    items: ["Combustível", "Taxas dos apps", "Manutenção", "Despesas extras"],
    glow: "bg-amber-400/20",
  },
  {
    label: "3 · Decida",
    title: "Trabalhe com mais clareza",
    description: "Compare seus dias e entenda se seu tempo, seu carro e sua energia estão compensando.",
    metricTitle: "Indicadores úteis",
    metricValue: "Dia · km · hora",
    metricClass: "text-emerald-200",
    items: ["Relatórios", "Lucro por hora", "Lucro por km"],
    glow: "bg-emerald-400/20",
  },
];

export default function ProfitStoryShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.45 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      media.removeEventListener("change", updatePreference);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % scenes.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [isVisible, reduceMotion]);

  const scene = scenes[activeScene];

  return (
    <section
      ref={sectionRef}
      aria-label="Como o FaturApp funciona"
      className="relative isolate overflow-hidden bg-[#041524] px-4 py-16 text-white sm:px-8 sm:py-24 lg:px-16"
    >
      <div className={`absolute left-1/2 top-1/2 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700 ${scene.glow}`} />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.12),transparent_28%),linear-gradient(145deg,#041524_0%,#0b2944_54%,#05281f_100%)]" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Como funciona
          </div>

          <h2 className="mt-5 max-w-xl text-3xl font-black leading-tight tracking-[-.035em] sm:text-5xl">
            Do lançamento à decisão, sem adivinhação.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            O FaturApp transforma a rotina do motorista em uma visão simples para entender, comparar e melhorar.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-r from-emerald-400/20 via-sky-400/10 to-emerald-400/20 blur-xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#08243c]/95 p-3 shadow-2xl shadow-black/30 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 px-2 pb-4">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Fluxo do FaturApp</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">3 ETAPAS</span>
            </div>

            <div key={activeScene} className="animate-fade-up px-3 py-7 sm:px-7 sm:py-9">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-400">{scene.label}</span>
                <span className="text-xs text-slate-500">{activeScene + 1}/3</span>
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">{scene.title}</h3>
              <p className="mt-3 min-h-[4.5rem] max-w-lg text-sm leading-6 text-slate-300 sm:text-base">{scene.description}</p>

              <div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-5 sm:p-6">
                <span className="text-sm font-semibold text-slate-400">{scene.metricTitle}</span>
                <strong className={`mt-2 block text-3xl font-black tracking-[-.04em] sm:text-4xl ${scene.metricClass}`}>{scene.metricValue}</strong>
                <div className="mt-5 flex flex-wrap gap-2">
                  {scene.items.map((item) => (
                    <span key={item} className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-emerald-300 transition-all ease-linear ${activeScene === 0 ? "w-1/3" : activeScene === 1 ? "w-2/3" : "w-full"}`}
                style={{ transitionDuration: "8000ms" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
