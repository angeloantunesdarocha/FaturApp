"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRL } from "@/lib/utils";

type Props = {
  profit: number;
  costs: number;
  revenue: number;
  gross?: number;
  km?: number;
  hours?: number;
  feeAmount?: number;
  profitPerKm?: number;
  profitPerHour?: number;
  fuelSpent?: number;
  maintenance?: number;
  extras?: number;
  fuelRemainingValue?: number;
  className?: string;
  active?: boolean;
};

type Tone = "neutral" | "profit" | "tight" | "loss";

const brl = (value: number, dashWhenZero = false) => {
  if (dashWhenZero && (!Number.isFinite(value) || value === 0)) return "—";
  return formatBRL(Number.isFinite(value) ? value : 0);
};

const decimal = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

export default function StickyLaunchIntelligence({
  profit,
  costs: _costs,
  revenue,
  gross = 0,
  km = 0,
  hours = 0,
  feeAmount = 0,
  profitPerKm,
  profitPerHour,
  fuelSpent = 0,
  maintenance = 0,
  extras = 0,
  fuelRemainingValue = 0,
  className = "",
  active = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasInput =
    gross > 0 || revenue > 0 || km > 0 || hours > 0 || feeAmount > 0 ||
    fuelSpent > 0 || maintenance > 0 || extras > 0 || fuelRemainingValue > 0;

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const tone: Tone = !hasInput
    ? "neutral"
    : profit > 0 && margin >= 40
      ? "profit"
      : profit > 0
        ? "tight"
        : "loss";

  const kmValue = profitPerKm ?? (km > 0 ? profit / km : 0);
  const hourValue = profitPerHour ?? (hours > 0 ? profit / hours : 0);

  const copy = useMemo(
    () =>
      ({
        neutral: {
          emoji: "🧮",
          label: "SEU LUCRO AO VIVO",
          message: "Comece pelo Valor bruto e veja a mágica acontecer ✨",
          shell: "border-slate-200 bg-white/95",
          accent: "text-slate-700",
          line: "bg-slate-300",
        },
        profit: {
          emoji: "😊",
          label: "RESULTADO POSITIVO",
          message: "Dia lucrativo! 👍",
          shell: "border-green-200 bg-white/95",
          accent: "text-[#16a34a]",
          line: "bg-[#16a34a]",
        },
        tight: {
          emoji: "😐",
          label: "RESULTADO NO LIMITE",
          message: "Dia apertado — atenção nos custos",
          shell: "border-amber-200 bg-white/95",
          accent: "text-[#f59e0b]",
          line: "bg-[#f59e0b]",
        },
        loss: {
          emoji: "😞",
          label: "PREJUÍZO",
          message: "Você está pagando pra trabalhar",
          shell: "border-red-200 bg-white/95",
          accent: "text-[#dc2626]",
          line: "bg-[#dc2626]",
        },
      })[tone],
    [tone],
  );

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  if (!active) return null;

  const metrics = [
    ["Valor bruto", brl(gross, true), gross > 0],
    ["Taxa do app", brl(feeAmount, true), feeAmount > 0],
    ["Km rodados", km > 0 ? `${decimal(km)} km` : "—", km > 0],
    ["Valor por KM", brl(kmValue, true), km > 0 && kmValue !== 0],
    ["Horas trabalhadas", hours > 0 ? `${decimal(hours)} h` : "—", hours > 0],
    ["Valor por hora", brl(hourValue, true), hours > 0 && hourValue !== 0],
    ["Combustível", brl(fuelSpent, true), fuelSpent > 0],
    ["Manutenção", brl(maintenance, true), maintenance > 0],
    ["Gastos extras", brl(extras, true), extras > 0],
    ["Saldo no tanque", brl(fuelRemainingValue, true), fuelRemainingValue > 0],
  ].filter(([, , visible]) => visible) as [string, string, boolean][];

  return (
    <div
      ref={rootRef}
      className={`sticky top-0 z-40 w-full ${className}`}
    >
      <div className="relative w-full">
        <div
          className={`overflow-hidden border-x border-b shadow-md shadow-slate-900/10 backdrop-blur-xl transition-colors duration-300 ${copy.shell}`}
        >
          <div className={`h-0.5 w-full transition-colors duration-300 ${copy.line}`} />

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="live-launch-summary"
            className="flex min-h-[58px] w-full items-center gap-2 px-2.5 py-1.5 text-left sm:px-4"
          >
            <span className="shrink-0 text-lg" aria-hidden="true">
              {copy.emoji}
            </span>

            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[8px] font-bold uppercase tracking-wide ${copy.accent}`}>
                {copy.label}
              </span>
              <span
                aria-live="polite"
                className={`mt-0.5 block truncate text-base font-black leading-none transition-all duration-200 ${copy.accent}`}
              >
                {hasInput ? brl(profit) : "—"}
                <span className="ml-1 text-[9px] font-semibold text-slate-400">
                  líquido
                </span>
              </span>
            </span>

            <span className="hidden min-w-0 max-w-[38%] truncate text-[9px] text-slate-500 sm:block">
              {copy.message}
            </span>

            <span className="shrink-0 text-right">
              <span className="block text-[7px] uppercase tracking-wide text-slate-400">
                Margem
              </span>
              <strong className={`text-[11px] ${copy.accent}`}>
                {hasInput ? `${decimal(margin)}%` : "—"}
              </strong>
            </span>

            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>
        </div>

        {expanded && (
          <div
            id="live-launch-summary"
            className={`absolute left-0 right-0 top-full z-50 max-h-[60vh] overflow-y-auto rounded-b-2xl border-x border-b px-2 pb-2.5 pt-2 shadow-xl shadow-slate-900/15 backdrop-blur-xl ${copy.shell}`}
          >
            {!hasInput ? (
              <p className="px-2 py-3 text-center text-xs font-medium text-slate-600">
                Comece pelo Valor bruto e veja a mágica acontecer ✨
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {metrics.map(([label, value]) => (
                    <Metric key={label} label={label} value={value} />
                  ))}
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/80" aria-hidden="true">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${copy.line}`}
                    style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/90 bg-slate-50/80 px-1.5 py-1">
      <span className="block truncate text-[9px] font-medium leading-tight text-slate-500">
        {label}
      </span>
      <strong className="block truncate text-[11px] font-semibold leading-tight text-slate-700">
        {value}
      </strong>
    </div>
  );
}
