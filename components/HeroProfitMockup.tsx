'use client';

import { useEffect, useRef, useState } from "react";

const exampleProfit = 129.5;
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function useViewportProfit() {
  const targetRef = useRef<HTMLDivElement>(null);
  const [profit, setProfit] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        setProfit(exampleProfit);
        return;
      }

      const startedAt = performance.now();
      const duration = 1200;
      let frame = 0;

      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setProfit(exampleProfit * eased);

        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        }
      };

      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    };

    if (!("IntersectionObserver" in window)) {
      return start();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return { targetRef, profit };
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[min(68vw,214px)] shrink-0 sm:w-[184px] lg:w-[204px]">
      <div className="rounded-[2.3rem] border-[7px] border-slate-950/90 bg-slate-950 p-1.5 shadow-[0_24px_55px_rgba(2,12,27,.42)]">
        <div className="overflow-hidden rounded-[1.8rem] bg-slate-50">
          <div className="flex h-7 items-center justify-center bg-slate-900">
            <span className="h-1 w-14 rounded-full bg-slate-600" />
          </div>

          <div className="space-y-3 px-3 pb-4 pt-4 text-slate-900">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                FaturApp
              </p>
              <div className="mt-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Lançar dia</p>
                  <p className="text-[10px] text-slate-500">Hoje</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                  Em andamento
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-700">
                  Receita dos apps
                </span>
                <span className="text-[10px] font-bold text-slate-900">
                  R$ 210,00
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 w-4/5 rounded-full bg-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <p className="text-[9px] text-slate-500">Km rodados</p>
                <p className="mt-1 text-sm font-bold">120 km</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <p className="text-[9px] text-slate-500">Horas</p>
                <p className="mt-1 text-sm font-bold">8h</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                Lucro real do dia
              </p>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-emerald-300">
                R$ 129,50
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Combustível + taxas + despesas
              </p>
            </div>

            <div className="h-9 rounded-lg bg-emerald-500 text-center text-[11px] font-bold leading-9 text-white shadow-lg shadow-emerald-500/20">
              Salvar lançamento
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 top-24 hidden rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-white shadow-xl backdrop-blur sm:block">
        <p className="text-[9px] uppercase tracking-[0.12em] text-emerald-300">
          Campo real do app
        </p>
        <p className="mt-0.5 text-xs font-semibold">Km, horas e combustível</p>
      </div>
    </div>
  );
}

export default function HeroProfitMockup() {
  const { targetRef, profit } = useViewportProfit();

  return (
    <div ref={targetRef} className="relative mx-auto w-full max-w-[560px]">
      <div className="mb-4 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
        <span>Uma visão mais clara do seu dia</span>
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[9px] tracking-[0.12em] text-white/80">
          Exemplo
        </span>
      </div>

      <div className="grid items-center gap-5 sm:grid-cols-[184px_minmax(0,1fr)] sm:gap-3 lg:grid-cols-[204px_minmax(0,1fr)] lg:gap-4">
        <PhoneMockup />

        <div className="relative overflow-hidden rounded-[1.65rem] border border-white/15 bg-slate-950/65 p-4 shadow-[0_28px_70px_rgba(1,10,25,.38)] backdrop-blur-xl sm:p-5">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Hoje</p>
                <p className="mt-1 text-[11px] text-slate-400">O que fica no seu bolso</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Simulação
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Valor bruto</span>
                <span className="font-semibold text-white">R$ 210,00</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Taxas dos apps</span>
                <span className="font-semibold text-rose-300">− R$ 52,50</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Combustível</span>
                <span className="font-semibold text-amber-200">− R$ 28,00</span>
              </div>
            </div>

            <div className="my-4 h-px bg-white/10" />

            <div className="flex items-end justify-between gap-3">
              <span className="text-sm font-bold text-white">Lucro real</span>
              <span
                className="text-right text-3xl font-extrabold tracking-tight text-emerald-300 sm:text-4xl"
                aria-label="Lucro real simulado de R$ 129,50"
              >
                {currency.format(profit)}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-300/10 bg-emerald-400/10 px-3 py-2 text-center text-[11px] font-semibold text-emerald-200">
              R$ 16,19 por hora&nbsp; · &nbsp;R$ 1,08 por km
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
