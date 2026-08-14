"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const scenes = [
  {
    label: "1 · O que entrou",
    title: "Você faturou R$ 210",
    description: "O valor bruto parece ótimo. Mas ele ainda não mostra quanto ficou no seu bolso.",
    valueLabel: "Faturamento bruto",
    value: "R$ 210,00",
    valueClass: "text-white",
    accent: "from-sky-400 to-cyan-300",
    glow: "bg-sky-400/20",
  },
  {
    label: "2 · O que saiu",
    title: "Agora revele os custos",
    description: "Taxas, combustível, manutenção e despesas reduzem silenciosamente o resultado do dia.",
    valueLabel: "Custos do trabalho",
    value: "− R$ 80,50",
    valueClass: "text-rose-300",
    accent: "from-rose-400 to-amber-300",
    glow: "bg-rose-400/20",
  },
  {
    label: "3 · O que realmente sobrou",
    title: "Este é o seu lucro real",
    description: "O FaturApp transforma seus lançamentos em decisões melhores por dia, hora e quilômetro.",
    valueLabel: "Lucro no seu bolso",
    value: "R$ 129,50",
    valueClass: "text-emerald-300",
    accent: "from-emerald-400 to-lime-300",
    glow: "bg-emerald-400/20",
  },
];

export default function ProfitStoryShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
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
    if (!isVisible || !isPlaying || reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % scenes.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isPlaying, isVisible, reduceMotion]);

  const scene = scenes[activeScene];

  return (
    <section
      ref={sectionRef}
      aria-label="Demonstração automática do FaturApp"
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
            Demonstração automática
          </div>

          <h2 className="mt-5 max-w-xl text-3xl font-black leading-tight tracking-[-.035em] sm:text-5xl">
            Veja o dinheiro mudar de significado em segundos.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Não basta saber quanto entrou. O FaturApp revela quanto seu trabalho realmente colocou no seu bolso.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-500 px-7 font-extrabold text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Descobrir meu lucro grátis →
            </Link>
            <button
              type="button"
              onClick={() => setIsPlaying((current) => !current)}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 font-bold text-slate-200 transition hover:bg-white/10"
              aria-label={isPlaying ? "Pausar demonstração" : "Reproduzir demonstração"}
            >
              {isPlaying ? "❚❚ Pausar" : "▶ Reproduzir"}
            </button>
          </div>
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
              <span className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Seu dia no FaturApp</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">AO VIVO</span>
            </div>

            <div key={activeScene} className="animate-fade-up px-3 py-7 sm:px-7 sm:py-9">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-400">{scene.label}</span>
                <span className="text-xs text-slate-500">{activeScene + 1}/3</span>
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">{scene.title}</h3>
              <p className="mt-3 min-h-[4.5rem] max-w-lg text-sm leading-6 text-slate-300 sm:text-base">{scene.description}</p>

              <div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-5 sm:p-6">
                <span className="text-sm font-semibold text-slate-400">{scene.valueLabel}</span>
                <strong className={`mt-2 block text-4xl font-black tracking-[-.04em] sm:text-5xl ${scene.valueClass}`}>{scene.value}</strong>

                {activeScene === 1 && (
                  <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
                    {["Taxas", "Combustível", "Manutenção", "Despesas"].map((item) => (
                      <span key={item} className="rounded-lg bg-white/5 px-2 py-2 text-center">{item}</span>
                    ))}
                  </div>
                )}

                {activeScene === 2 && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-300/10 p-3"><span className="block text-xs text-emerald-200">Por hora</span><strong className="mt-1 block text-lg text-emerald-100">R$ 16,19</strong></div>
                    <div className="rounded-xl bg-emerald-300/10 p-3"><span className="block text-xs text-emerald-200">Por km</span><strong className="mt-1 block text-lg text-emerald-100">R$ 1,08</strong></div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 px-3 pb-3 sm:px-7 sm:pb-5">
              {scenes.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setActiveScene(index);
                    setIsPlaying(false);
                  }}
                  className="group py-2 text-left"
                  aria-label={`Mostrar etapa ${index + 1}`}
                  aria-current={activeScene === index ? "step" : undefined}
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span className={`block h-full rounded-full bg-gradient-to-r transition-all duration-500 ${item.accent} ${activeScene === index ? "w-full" : "w-0"}`} />
                  </span>
                  <span className={`mt-2 hidden text-[10px] font-bold uppercase tracking-wider sm:block ${activeScene === index ? "text-white" : "text-slate-500"}`}>
                    Etapa {index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">A animação inicia somente quando aparece na sua tela.</p>
        </div>
      </div>
    </section>
  );
}
