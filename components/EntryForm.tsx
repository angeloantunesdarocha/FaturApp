"use client";

import { useState } from "react";
import {
  computeFeeAmount,
  computeFuelCost,
  computeFuelCostPerKm,
  computeLitersFromPurchase,
  formatBRL,
  toNumber,
  todayISO,
  type ExtraExpense,
} from "@/lib/utils";
import ExtraExpenses from "./ExtraExpenses";
import MaintenanceExpenses, { type MaintenanceItem } from "./MaintenanceExpenses";
import CardDeLucro from "./CardDeLucro";
import { saveEntry } from "@/app/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type Mode      = "withFee" | "net";
type Props     = { initialDate?: string; initialMonthProfit?: number };
type SavedCard = {
  profit: number; km: number; hours: number;
  profitPerKm: number | null; costPerKm: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de formatação
// ─────────────────────────────────────────────────────────────────────────────

const fmtKm       = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtLitros   = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const fmtPerKm    = (v: number | null) => v === null ? "—" : `${formatBRL(v)} / km`;

// ─────────────────────────────────────────────────────────────────────────────
// StickyIntelligenceCard — mini-card fixo no topo com Emotional UI
//
// Fica fixo abaixo do Header (top-14 ≈ 56px, altura padrão do Header).
// Muda de tema dinamicamente:
//   green  → lucro positivo com margem ≥ 20%
//   amber  → lucro positivo mas margem < 20%, ou breakeven
//   red    → prejuízo (lucro < 0)
// ─────────────────────────────────────────────────────────────────────────────

type StickyProps = {
  profit:      number;
  costs:       number;
  fareNet:     number;
  monthProfit: number;
  hasData:     boolean;
};

function StickyIntelligenceCard({ profit, costs, fareNet, monthProfit, hasData }: StickyProps) {
  if (!hasData) return null;

  const margin    = fareNet > 0 ? (profit / fareNet) * 100 : null;
  const isLoss    = profit < 0;
  const isLow     = !isLoss && margin !== null && margin < 20;
  const tone      = isLoss ? "red" : isLow ? "amber" : "green";

  const themes = {
    green: {
      wrap:   "bg-[#031a0d]/95 border-emerald-600/25",
      dot:    "bg-emerald-400",
      sep:    "bg-emerald-400/20",
      lbl:    "text-emerald-400/60",
      val:    "text-emerald-100",
      badge:  "border-emerald-600/30 bg-emerald-500/15 text-emerald-300",
      icon:   "🟢",
      status: "Lucrando",
    },
    amber: {
      wrap:   "bg-[#1a1000]/95 border-amber-600/25",
      dot:    "bg-amber-400",
      sep:    "bg-amber-400/20",
      lbl:    "text-amber-400/60",
      val:    "text-amber-100",
      badge:  "border-amber-600/30 bg-amber-500/15 text-amber-300",
      icon:   "🟡",
      status: "Atenção",
    },
    red: {
      wrap:   "bg-[#1a0303]/95 border-rose-600/25",
      dot:    "bg-rose-400",
      sep:    "bg-rose-400/20",
      lbl:    "text-rose-400/60",
      val:    "text-rose-100",
      badge:  "border-rose-600/30 bg-rose-500/15 text-rose-300",
      icon:   "🔴",
      status: "Prejuízo",
    },
  } as const;

  const T = themes[tone];

  return (
    <div
      className={`fixed inset-x-0 top-14 z-40 border-b backdrop-blur-xl transition-all duration-500 ${T.wrap}`}
      role="status"
      aria-live="polite"
      aria-label="Resumo financeiro em tempo real"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-0 px-3 py-2 sm:gap-1 sm:px-6">

        {/* Dot + label TEMPO REAL */}
        <div className="flex shrink-0 items-center gap-2 pr-3">
          <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${T.dot}`} />
          <span className={`hidden text-[9px] font-black uppercase tracking-[0.22em] sm:block ${T.lbl}`}>
            Tempo real
          </span>
        </div>

        <div className={`hidden h-6 w-px shrink-0 sm:block ${T.sep}`} />

        {/* Lucro */}
        <div className="px-3">
          <p className={`text-[9px] font-bold uppercase leading-none ${T.lbl}`}>Lucro</p>
          <p className={`text-sm font-black leading-tight tabular-nums ${T.val}`}>
            {formatBRL(profit)}
          </p>
        </div>

        <div className={`h-6 w-px shrink-0 ${T.sep}`} />

        {/* Custos */}
        <div className="px-3">
          <p className={`text-[9px] font-bold uppercase leading-none ${T.lbl}`}>Custos</p>
          <p className={`text-sm font-black leading-tight tabular-nums ${T.val}`}>
            {formatBRL(costs)}
          </p>
        </div>

        {/* Margem — exibe apenas quando há receita */}
        {margin !== null && (
          <>
            <div className={`h-6 w-px shrink-0 ${T.sep}`} />
            <div className="px-3">
              <p className={`text-[9px] font-bold uppercase leading-none ${T.lbl}`}>Margem</p>
              <p className={`text-sm font-black leading-tight tabular-nums ${T.val}`}>
                {margin.toFixed(0)}%
              </p>
            </div>
          </>
        )}

        {/* Lucro do mês — apenas desktop */}
        {monthProfit !== 0 && (
          <>
            <div className={`hidden h-6 w-px shrink-0 sm:block ${T.sep}`} />
            <div className="hidden px-3 sm:block">
              <p className={`text-[9px] font-bold uppercase leading-none ${T.lbl}`}>Este mês</p>
              <p className={`text-sm font-black leading-tight tabular-nums ${T.val}`}>
                {formatBRL(monthProfit)}
              </p>
            </div>
          </>
        )}

        {/* Badge de status — empurrado para a direita */}
        <div className="ml-auto shrink-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${T.badge}`}>
            {T.icon}
            <span className="hidden sm:inline">{T.status}</span>
          </span>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal — EntryForm
// ─────────────────────────────────────────────────────────────────────────────

export default function EntryForm({ initialDate = todayISO(), initialMonthProfit = 0 }: Props) {

  // ── Estado ────────────────────────────────────────────────────────────────
  const [mode,             setMode]             = useState<Mode>("withFee");
  const [date,             setDate]             = useState(initialDate);
  const [gross,            setGross]            = useState(0);
  const [fee,              setFee]              = useState(0);
  const [netFare,          setNetFare]          = useState(0);
  const [gas,              setGas]              = useState(0);
  const [alcohol,          setAlcohol]          = useState(0);
  const [gasPrice,         setGasPrice]         = useState(0);
  const [alcoholPrice,     setAlcoholPrice]     = useState(0);
  const [kmInitial,        setKmInitial]        = useState(0);
  const [kmFinal,          setKmFinal]          = useState(0);
  const [hours,            setHours]            = useState(0);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [extras,           setExtras]           = useState<ExtraExpense[]>([]);
  const [monthProfit,      setMonthProfit]      = useState(initialMonthProfit);
  const [status,           setStatus]           = useState("");
  const [savedCard,        setSavedCard]        = useState<SavedCard | null>(null);

  // ── Cálculos derivados ────────────────────────────────────────────────────
  const fareNet         = mode === "withFee" ? gross * (1 - fee / 100) : netFare;
  const feeAmount       = mode === "withFee" ? computeFeeAmount({ gross_amount: gross, fee_percent: fee }) : 0;
  const extrasSum       = extras.reduce((a, e) => a + toNumber(e.value), 0);
  const maintenanceTotal= maintenanceItems.reduce((a, m) => a + toNumber(m.value), 0);
  const totalExpenses   = gas + alcohol + maintenanceTotal + extrasSum;
  const dayProfit       = fareNet - totalExpenses;
  const kmDriven        = Math.max(0, kmFinal - kmInitial);
  const gasLiters       = computeLitersFromPurchase(gas, gasPrice);
  const alcoholLiters   = computeLitersFromPurchase(alcohol, alcoholPrice);
  const gasCostPerKm    = computeFuelCostPerKm(gas, kmDriven);
  const alcoholCostPerKm= computeFuelCostPerKm(alcohol, kmDriven);
  const totalFuelCost   = computeFuelCost({ gas_expense: gas, alcohol_expense: alcohol });
  const totalFuelCostPerKm = computeFuelCostPerKm(totalFuelCost, kmDriven);
  const totalCostPerKm  = kmDriven > 0 ? totalExpenses / kmDriven : null;
  const profitPerKm     = kmDriven > 0 ? dayProfit / kmDriven : null;

  // ── Valores visíveis (pós-save usa savedCard se não há input ativo) ───────
  const hasCurrentLaunch = fareNet !== 0 || totalExpenses !== 0 || kmDriven > 0;
  const stickyHasData    = hasCurrentLaunch || Boolean(savedCard);

  const visibleProfit    = savedCard && !hasCurrentLaunch ? savedCard.profit  : dayProfit;
  const visibleCosts     = savedCard && !hasCurrentLaunch ? (savedCard.profit < 0 ? Math.abs(savedCard.profit) : savedCard.profit) : totalExpenses;
  const visibleFareNet   = savedCard && !hasCurrentLaunch ? 0 : fareNet;
  const stickyKm         = savedCard && !hasCurrentLaunch ? savedCard.km      : kmDriven;
  const stickyProfitPerKm= savedCard && !hasCurrentLaunch ? savedCard.profitPerKm : profitPerKm;
  const stickyHours      = savedCard && !hasCurrentLaunch ? savedCard.hours   : hours;

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (kmInitial < 0 || kmFinal < 0 || kmFinal < kmInitial || gas < 0 || alcohol < 0 || gasPrice < 0 || alcoholPrice < 0 || hours < 0) {
      setStatus("❌ Confira os quilômetros, as horas e os valores de combustível. Nenhum valor pode ser negativo e o km final deve ser ≥ ao inicial.");
      return;
    }
    if (gas > 0 && gasPrice <= 0) { setStatus("❌ Informe o preço por litro da gasolina."); return; }
    if (alcohol > 0 && alcoholPrice <= 0) { setStatus("❌ Informe o preço por litro do álcool."); return; }

    setStatus("Salvando...");

    const payload = {
      date,
      gross_amount:            mode === "withFee" ? gross    : null,
      fee_percent:             mode === "withFee" ? fee      : null,
      net_fare:                mode === "net"     ? netFare  : null,
      gas_expense:             gas,
      alcohol_expense:         alcohol,
      gasoline_price_per_liter: gasPrice,
      alcohol_price_per_liter:  alcoholPrice,
      gasoline_liters:          gasLiters,
      alcohol_liters:           alcoholLiters,
      km_initial:              kmInitial,
      km_final:                kmFinal,
      km_driven:               kmDriven,
      hours_worked:            hours,
      maintenance_expense:     maintenanceTotal,
      maintenance_details:     maintenanceItems.filter(m => m.description.trim() !== ""),
      extra_expenses:          extras.filter(e => e.name.trim() !== ""),
    };

    const res = await saveEntry(payload);

    if (res.success) {
      setStatus("✅ Lançamento salvo com sucesso!");
      if (typeof res.monthProfit === "number") setMonthProfit(res.monthProfit);
      setSavedCard({ profit: dayProfit, km: kmDriven, hours, profitPerKm, costPerKm: totalCostPerKm });
      // Resetar campos
      setGross(0); setFee(0); setNetFare(0);
      setGas(0); setAlcohol(0); setGasPrice(0); setAlcoholPrice(0);
      setKmInitial(0); setKmFinal(0); setHours(0);
      setMaintenanceItems([]); setExtras([]);
    } else {
      setStatus(`❌ Erro: ${res.error}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Mini-card fixo de inteligência em tempo real ────────────────────
          Posicionado abaixo do Header (top-14).
          Quando visível, adiciona padding-top ao conteúdo para não sobrepor. */}
      <StickyIntelligenceCard
        profit={visibleProfit}
        costs={hasCurrentLaunch ? totalExpenses : savedCard ? Math.abs(savedCard.profit - (savedCard.profitPerKm ?? 0)) : 0}
        fareNet={visibleFareNet}
        monthProfit={monthProfit}
        hasData={stickyHasData}
      />

      {/* Espaço compensatório quando o sticky card está visível */}
      {stickyHasData && <div className="h-10" aria-hidden="true" />}

      {/* ── FORMULÁRIO ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Data */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="label">Data do lançamento</label>
          <input
            type="date"
            className="input max-w-xs"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* ── Receita ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Receita</h3>

          {/* Selector de modo */}
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" checked={mode === "withFee"} onChange={() => setMode("withFee")} />
              Valor com taxa
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" checked={mode === "net"} onChange={() => setMode("net")} />
              Valor já líquido
            </label>
          </div>

          {mode === "withFee" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor bruto (R$)</label>
                  <input type="number" step="0.01" min="0" className="input"
                    value={gross || ""} onChange={e => setGross(toNumber(e.target.value))} />
                </div>
                <div>
                  <label className="label">Taxa do app (%)</label>
                  <input type="number" step="0.01" min="0" max="100" className="input"
                    value={fee || ""} onChange={e => setFee(toNumber(e.target.value))} />
                </div>
              </div>

              {/* Preview receita */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Valor bruto</span>
                  <strong>{formatBRL(gross)}</strong>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Desconto da taxa ({fee.toFixed(2)}%)</span>
                  <strong>− {formatBRL(feeAmount)}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                  <span>Receita líquida</span>
                  <strong>{formatBRL(fareNet)}</strong>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Valor líquido recebido (R$)</label>
              <input type="number" step="0.01" min="0" className="input max-w-sm"
                value={netFare || ""} onChange={e => setNetFare(toNumber(e.target.value))} />
            </div>
          )}

          {/* Horas trabalhadas */}
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
            <label className="label">Horas trabalhadas (opcional)</label>
            <input type="number" inputMode="decimal" step="0.1" min="0"
              className="input max-w-sm" placeholder="Ex: 9"
              value={hours || ""} onChange={e => setHours(toNumber(e.target.value))} />
            <p className="mt-1 text-xs text-slate-500">
              Use para descobrir quanto sobrou por hora.
            </p>
          </div>
        </div>

        {/* ── Quilometragem e combustível ────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Quilometragem e combustível</h3>
            <p className="mt-1 text-xs text-slate-500">
              Informe o hodômetro e o valor abastecido. O sistema calcula automaticamente os km rodados e o custo por km.
            </p>
          </div>

          {/* Hodômetro */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Km inicial</label>
              <input type="number" step="0.1" min="0" className="input" placeholder="Ex.: 52.340"
                value={kmInitial || ""} onChange={e => setKmInitial(toNumber(e.target.value))} />
            </div>
            <div>
              <label className="label">Km final</label>
              <input type="number" step="0.1" min="0" className="input" placeholder="Ex.: 52.520"
                value={kmFinal || ""} onChange={e => setKmFinal(toNumber(e.target.value))} />
            </div>
          </div>

          {/* KM rodados */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-xs text-slate-500">Quilômetros rodados</p>
              <p className="text-2xl font-bold text-slate-800">{fmtKm(kmDriven)} km</p>
            </div>
          </div>

          {/* Gasolina */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-700">Gasolina</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Preço por litro (R$)</label>
                <input type="number" step="0.001" min="0" className="input" placeholder="Ex.: 6,19"
                  value={gasPrice || ""} onChange={e => setGasPrice(toNumber(e.target.value))} />
              </div>
              <div>
                <label className="label">Valor abastecido (R$)</label>
                <input type="number" step="0.01" min="0" className="input" placeholder="Ex.: 100,00"
                  value={gas || ""} onChange={e => setGas(toNumber(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Litros calculados</p>
                <p className="text-lg font-bold text-slate-800">{fmtLitros(gasLiters)} L</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Custo por km</p>
                <p className="text-lg font-bold text-slate-800">{fmtPerKm(gasCostPerKm)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">
                  {kmDriven > 0 ? `Total para ${fmtKm(kmDriven)} km` : "Gasto total"}
                </p>
                <p className="text-lg font-bold text-slate-800">{formatBRL(gas)}</p>
              </div>
            </div>
          </div>

          {/* Álcool */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-700">Álcool</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Preço por litro (R$)</label>
                <input type="number" step="0.001" min="0" className="input" placeholder="Ex.: 4,39"
                  value={alcoholPrice || ""} onChange={e => setAlcoholPrice(toNumber(e.target.value))} />
              </div>
              <div>
                <label className="label">Valor abastecido (R$)</label>
                <input type="number" step="0.01" min="0" className="input" placeholder="Ex.: 80,00"
                  value={alcohol || ""} onChange={e => setAlcohol(toNumber(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Litros calculados</p>
                <p className="text-lg font-bold text-slate-800">{fmtLitros(alcoholLiters)} L</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Custo por km</p>
                <p className="text-lg font-bold text-slate-800">{fmtPerKm(alcoholCostPerKm)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">
                  {kmDriven > 0 ? `Total para ${fmtKm(kmDriven)} km` : "Gasto total"}
                </p>
                <p className="text-lg font-bold text-slate-800">{formatBRL(alcohol)}</p>
              </div>
            </div>
          </div>

          {/* Totais de combustível */}
          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total de combustível</p>
              <p className="text-xl font-bold text-slate-800">{formatBRL(totalFuelCost)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Custo total de combustível por km</p>
              <p className="text-xl font-bold text-slate-800">{fmtPerKm(totalFuelCostPerKm)}</p>
            </div>
          </div>
        </div>

        {/* ── Manutenção ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems} />
        </div>

        {/* ── Gastos extras ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ExtraExpenses extras={extras} onChange={setExtras} />
        </div>

        {/* Botão salvar */}
        <button type="submit" className="btn btn-primary w-full">
          Salvar e ver meu lucro
        </button>

        {status && (
          <p className="text-center text-sm text-slate-600" role="status">
            {status}
          </p>
        )}
      </form>

      {/* ── CardDeLucro — aparece apenas após salvar ─────────────────────
          O card de compartilhamento com veredito completo e opções de
          partilhar permanece aqui, exibido somente pós-save.             */}
      {savedCard && (
        <CardDeLucro
          profit={savedCard.profit}
          km={savedCard.km}
          profitPerHour={savedCard.hours > 0 ? savedCard.profit / savedCard.hours : null}
          profitPerKm={savedCard.profitPerKm}
          costPerKm={savedCard.costPerKm}
          onClose={() => setSavedCard(null)}
        />
      )}

    </div>
  );
}
