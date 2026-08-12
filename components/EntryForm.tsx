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

type Mode = "withFee" | "net";
type Props = { initialDate?: string; initialMonthProfit?: number };
type SavedCard = {
  profit: number; km: number; hours: number;
  profitPerKm: number | null; costPerKm: number | null;
};

const fmtKm = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtLitros = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const fmtPerKm = (v: number | null) => v === null ? "—" : `${formatBRL(v)} / km`;

type StickyProps = {
  profit: number;
  costs: number;
  fareNet: number;
  monthProfit: number;
  hasData: boolean;
  gross: number;
  feeAmount: number;
  feePercent: number;
  kmDriven: number;
  profitPerKm: number | null;
  hours: number;
  profitPerHour: number | null;
  fuelCost: number;
  maintenanceAmt: number;
  extrasAmt: number;
};

function StickyIntelligenceCard({
  profit, costs, fareNet, monthProfit, hasData,
  gross, feeAmount, feePercent,
  kmDriven, profitPerKm,
  hours, profitPerHour,
  fuelCost, maintenanceAmt, extrasAmt,
}: StickyProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hasData) return null;

  const margin = fareNet > 0 ? (profit / fareNet) * 100 : null;
  const isLoss = profit < 0;
  const isLow = !isLoss && margin !== null && margin < 20;
  const tone = isLoss ? "red" : isLow ? "amber" : "green";

  const themes = {
    green: {
      wrap: "bg-[#031a0d]/95 border-emerald-600/25",
      div: "border-emerald-400/10",
      dot: "bg-emerald-400",
      sep: "bg-emerald-400/20",
      lbl: "text-emerald-400/55",
      val: "text-emerald-100",
      neg: "text-emerald-300/65",
      badge: "border-emerald-600/30 bg-emerald-500/15 text-emerald-300",
      chev: "text-emerald-400/50",
      icon: "🟢",
      status: "Lucrando",
    },
    amber: {
      wrap: "bg-[#1a1000]/95 border-amber-600/25",
      div: "border-amber-400/10",
      dot: "bg-amber-400",
      sep: "bg-amber-400/20",
      lbl: "text-amber-400/55",
      val: "text-amber-100",
      neg: "text-amber-300/65",
      badge: "border-amber-600/30 bg-amber-500/15 text-amber-300",
      chev: "text-amber-400/50",
      icon: "🟡",
      status: "Atenção",
    },
    red: {
      wrap: "bg-[#1a0303]/95 border-rose-600/25",
      div: "border-rose-400/10",
      dot: "bg-rose-400",
      sep: "bg-rose-400/20",
      lbl: "text-rose-400/55",
      val: "text-rose-100",
      neg: "text-rose-300/65",
      badge: "border-rose-600/30 bg-rose-500/15 text-rose-300",
      chev: "text-rose-400/50",
      icon: "🔴",
      status: "Prejuízo",
    },
  } as const;

  const T = themes[tone];

  const Item = ({ label, value, isNeg = false, strong = false }: { label: string; value: string; isNeg?: boolean; strong?: boolean }) => (
    <div className="min-w-0 px-2 py-1.5 sm:px-3 sm:py-2">
      <p className={`truncate text-[9px] font-bold uppercase leading-none tracking-wide sm:text-[10px] ${T.lbl}`}>
        {label}
      </p>
      <p className={`mt-0.5 truncate tabular-nums leading-tight ${strong ? "text-sm font-black sm:text-base" : "text-xs font-bold sm:text-sm"} ${isNeg ? T.neg : T.val}`}>
        {value}
      </p>
    </div>
  );

  return (
    <div
      className={`fixed inset-x-0 top-14 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${T.wrap}`}
      role="status"
      aria-live="polite"
      aria-label="Resumo financeiro em tempo real"
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center px-2 sm:h-14 sm:px-6">
        <div className="flex shrink-0 items-center gap-1.5 pr-2 sm:gap-2 sm:pr-3">
          <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${T.dot}`} />
          <span className={`hidden text-[9px] font-black uppercase tracking-[0.22em] sm:block ${T.lbl}`}>
            Tempo real
          </span>
        </div>

        <div className={`hidden h-5 w-px shrink-0 sm:block ${T.sep}`} />

        <div className="px-2 sm:px-2.5">
          <p className={`text-[8px] font-bold uppercase leading-none sm:text-[9px] ${T.lbl}`}>Lucro</p>
          <p className={`text-sm font-black leading-tight tabular-nums sm:text-base ${T.val}`}>{formatBRL(profit)}</p>
        </div>

        <div className={`h-5 w-px shrink-0 ${T.sep}`} />

        <div className="px-2 sm:px-2.5">
          <p className={`text-[8px] font-bold uppercase leading-none sm:text-[9px] ${T.lbl}`}>Custos</p>
          <p className={`text-sm font-black leading-tight tabular-nums sm:text-base ${T.val}`}>{formatBRL(costs)}</p>
        </div>

        {margin !== null && (
          <>
            <div className={`h-5 w-px shrink-0 ${T.sep}`} />
            <div className="px-2 sm:px-2.5">
              <p className={`text-[8px] font-bold uppercase leading-none sm:text-[9px] ${T.lbl}`}>Margem</p>
              <p className={`text-sm font-black leading-tight tabular-nums sm:text-base ${T.val}`}>{margin.toFixed(0)}%</p>
            </div>
          </>
        )}

        {monthProfit !== 0 && (
          <div className="hidden px-2.5 sm:block">
            <p className={`text-[9px] font-bold uppercase leading-none ${T.lbl}`}>Este mês</p>
            <p className={`text-sm font-black leading-tight tabular-nums ${T.val}`}>{formatBRL(monthProfit)}</p>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${T.badge}`}>
            {T.icon} {T.status}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Recolher detalhes" : "Ver todos os detalhes"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 ${T.chev}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`absolute left-0 right-0 top-full max-h-[55vh] overflow-y-auto border-t shadow-2xl ${T.wrap} ${T.div}`}>
          <div className="mx-auto max-w-6xl px-2 pb-2 sm:px-6 sm:pb-3">
            <div className="overflow-hidden rounded-b-2xl border-x border-b border-white/5">
              <div className="grid grid-cols-3">
                <div className={`border-r ${T.div}`}><Item label="Valor bruto" value={gross > 0 ? formatBRL(gross) : "—"} /></div>
                <div className={`border-r ${T.div}`}><Item label={`Taxa do app (${feePercent.toFixed(1)}%)`} value={feeAmount > 0 ? `− ${formatBRL(feeAmount)}` : "—"} isNeg={feeAmount > 0} /></div>
                <Item label="Valor por KM" value={profitPerKm !== null ? formatBRL(profitPerKm) : "—"} />
              </div>

              <div className={`grid grid-cols-3 border-t ${T.div}`}>
                <div className={`border-r ${T.div}`}><Item label="Valor por hora" value={profitPerHour !== null ? formatBRL(profitPerHour) : "—"} /></div>
                <div className={`border-r ${T.div}`}><Item label="Combustível gasto" value={fuelCost > 0 ? `− ${formatBRL(fuelCost)}` : "—"} isNeg={fuelCost > 0} /></div>
                <Item label="Saldo no tanque" value="N/D" />
              </div>

              <div className={`grid grid-cols-3 border-t ${T.div}`}>
                <div className={`border-r ${T.div}`}><Item label="Manutenção" value={maintenanceAmt > 0 ? formatBRL(maintenanceAmt) : "—"} /></div>
                <div className={`border-r ${T.div}`}><Item label="Gastos extras" value={extrasAmt > 0 ? formatBRL(extrasAmt) : "—"} /></div>
                <Item label="Lucro líquido / margem" value={`${formatBRL(profit)}${margin !== null ? ` · ${margin.toFixed(1)}%` : ""}`} strong />
              </div>
            </div>
            <div className="px-2 pt-1.5 text-[9px] text-white/40 sm:text-[10px]">
              {fmtKm(kmDriven)} km · {hours > 0 ? `${hours.toFixed(1)} h` : "—"} · atualizado em tempo real
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntryForm({ initialDate = todayISO(), initialMonthProfit = 0 }: Props) {
  const [mode, setMode] = useState<Mode>("withFee");
  const [date, setDate] = useState(initialDate);
  const [gross, setGross] = useState(0);
  const [fee, setFee] = useState(0);
  const [netFare, setNetFare] = useState(0);
  const [gas, setGas] = useState(0);
  const [alcohol, setAlcohol] = useState(0);
  const [gasPrice, setGasPrice] = useState(0);
  const [alcoholPrice, setAlcoholPrice] = useState(0);
  const [kmInitial, setKmInitial] = useState(0);
  const [kmFinal, setKmFinal] = useState(0);
  const [hours, setHours] = useState(0);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [extras, setExtras] = useState<ExtraExpense[]>([]);
  const [monthProfit, setMonthProfit] = useState(initialMonthProfit);
  const [status, setStatus] = useState("");
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);

  const fareNet = mode === "withFee" ? gross * (1 - fee / 100) : netFare;
  const feeAmount = mode === "withFee" ? computeFeeAmount({ gross_amount: gross, fee_percent: fee }) : 0;
  const extrasSum = extras.reduce((a, e) => a + toNumber(e.value), 0);
  const maintenanceTotal = maintenanceItems.reduce((a, m) => a + toNumber(m.value), 0);
  const totalExpenses = gas + alcohol + maintenanceTotal + extrasSum;
  const dayProfit = fareNet - totalExpenses;
  const kmDriven = Math.max(0, kmFinal - kmInitial);
  const gasLiters = computeLitersFromPurchase(gas, gasPrice);
  const alcoholLiters = computeLitersFromPurchase(alcohol, alcoholPrice);
  const gasCostPerKm = computeFuelCostPerKm(gas, kmDriven);
  const alcoholCostPerKm = computeFuelCostPerKm(alcohol, kmDriven);
  const totalFuelCost = computeFuelCost({ gas_expense: gas, alcohol_expense: alcohol });
  const totalFuelCostPerKm = computeFuelCostPerKm(totalFuelCost, kmDriven);
  const totalCostPerKm = kmDriven > 0 ? totalExpenses / kmDriven : null;
  const profitPerKm = kmDriven > 0 ? dayProfit / kmDriven : null;

  const hasCurrentLaunch = fareNet !== 0 || totalExpenses !== 0 || kmDriven > 0;
  const stickyHasData = hasCurrentLaunch || Boolean(savedCard);
  const visibleProfit = savedCard && !hasCurrentLaunch ? savedCard.profit : dayProfit;
  const visibleCosts = savedCard && !hasCurrentLaunch ? (savedCard.profit < 0 ? Math.abs(savedCard.profit) : savedCard.profit) : totalExpenses;
  const visibleFareNet = savedCard && !hasCurrentLaunch ? 0 : fareNet;
  const stickyKm = savedCard && !hasCurrentLaunch ? savedCard.km : kmDriven;
  const stickyProfitPerKm = savedCard && !hasCurrentLaunch ? savedCard.profitPerKm : profitPerKm;
  const stickyHours = savedCard && !hasCurrentLaunch ? savedCard.hours : hours;

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
      gross_amount: mode === "withFee" ? gross : null,
      fee_percent: mode === "withFee" ? fee : null,
      net_fare: mode === "net" ? netFare : null,
      gas_expense: gas,
      alcohol_expense: alcohol,
      gasoline_price_per_liter: gasPrice,
      alcohol_price_per_liter: alcoholPrice,
      gasoline_liters: gasLiters,
      alcohol_liters: alcoholLiters,
      km_initial: kmInitial,
      km_final: kmFinal,
      km_driven: kmDriven,
      hours_worked: hours,
      maintenance_expense: maintenanceTotal,
      maintenance_details: maintenanceItems.filter(m => m.description.trim() !== ""),
      extra_expenses: extras.filter(e => e.name.trim() !== ""),
    };
    const res = await saveEntry(payload);
    if (res.success) {
      setStatus("✅ Lançamento salvo com sucesso!");
      if (typeof res.monthProfit === "number") setMonthProfit(res.monthProfit);
      setSavedCard({ profit: dayProfit, km: kmDriven, hours, profitPerKm, costPerKm: totalCostPerKm });
      setGross(0); setFee(0); setNetFare(0);
      setGas(0); setAlcohol(0); setGasPrice(0); setAlcoholPrice(0);
      setKmInitial(0); setKmFinal(0); setHours(0);
      setMaintenanceItems([]); setExtras([]);
    } else {
      setStatus(`❌ Erro: ${res.error}`);
    }
  }

  return (
    <div className="space-y-5">
      <StickyIntelligenceCard
        profit={visibleProfit}
        costs={hasCurrentLaunch ? totalExpenses : 0}
        fareNet={visibleFareNet}
        monthProfit={monthProfit}
        hasData={stickyHasData}
        gross={gross}
        feeAmount={feeAmount}
        feePercent={fee}
        kmDriven={kmDriven}
        profitPerKm={profitPerKm}
        hours={hours}
        profitPerHour={hours > 0 ? dayProfit / hours : null}
        fuelCost={totalFuelCost}
        maintenanceAmt={maintenanceTotal}
        extrasAmt={extrasSum}
      />
      {stickyHasData && <div className="h-10" aria-hidden="true" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="label">Data do lançamento</label>
          <input type="date" className="input max-w-xs" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Receita</h3>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={mode === "withFee"} onChange={() => setMode("withFee")} />Valor com taxa</label>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={mode === "net"} onChange={() => setMode("net")} />Valor já líquido</label>
          </div>
          {mode === "withFee" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Valor bruto (R$)</label><input type="number" step="0.01" min="0" className="input" value={gross || ""} onChange={e => setGross(toNumber(e.target.value))} /></div>
                <div><label className="label">Taxa do app (%)</label><input type="number" step="0.01" min="0" max="100" className="input" value={fee || ""} onChange={e => setFee(toNumber(e.target.value))} /></div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Valor bruto</span><strong>{formatBRL(gross)}</strong></div>
                <div className="flex justify-between text-red-600"><span>Desconto da taxa ({fee.toFixed(2)}%)</span><strong>− {formatBRL(feeAmount)}</strong></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Receita líquida</span><strong>{formatBRL(fareNet)}</strong></div>
              </div>
            </>
          ) : (
            <div><label className="label">Valor líquido recebido (R$)</label><input type="number" step="0.01" min="0" className="input max-w-sm" value={netFare || ""} onChange={e => setNetFare(toNumber(e.target.value))} /></div>
          )}
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
            <label className="label">Horas trabalhadas (opcional)</label>
            <input type="number" inputMode="decimal" step="0.1" min="0" className="input max-w-sm" placeholder="Ex: 9" value={hours || ""} onChange={e => setHours(toNumber(e.target.value))} />
            <p className="mt-1 text-xs text-slate-500">Use para descobrir quanto sobrou por hora.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div><h3 className="text-base font-bold text-slate-800">Quilometragem e combustível</h3><p className="mt-1 text-xs text-slate-500">Informe o hodômetro e o valor abastecido. O sistema calcula automaticamente os km rodados e o custo por km.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Km inicial</label><input type="number" step="0.1" min="0" className="input" placeholder="Ex.: 52.340" value={kmInitial || ""} onChange={e => setKmInitial(toNumber(e.target.value))} /></div>
            <div><label className="label">Km final</label><input type="number" step="0.1" min="0" className="input" placeholder="Ex.: 52.520" value={kmFinal || ""} onChange={e => setKmFinal(toNumber(e.target.value))} /></div>
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-3"><div><p className="text-xs text-slate-500">Quilômetros rodados</p><p className="text-2xl font-bold text-slate-800">{fmtKm(kmDriven)} km</p></div></div>
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-700">Gasolina</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">Preço por litro (R$)</label><input type="number" step="0.001" min="0" className="input" placeholder="Ex.: 6,19" value={gasPrice || ""} onChange={e => setGasPrice(toNumber(e.target.value))} /></div>
              <div><label className="label">Valor abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" placeholder="Ex.: 100,00" value={gas || ""} onChange={e => setGas(toNumber(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Litros calculados</p><p className="text-lg font-bold text-slate-800">{fmtLitros(gasLiters)} L</p></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Custo por km</p><p className="text-lg font-bold text-slate-800">{fmtPerKm(gasCostPerKm)}</p></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{kmDriven > 0 ? `Total para ${fmtKm(kmDriven)} km` : "Gasto total"}</p><p className="text-lg font-bold text-slate-800">{formatBRL(gas)}</p></div>
            </div>
          </div>
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-700">Álcool</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">Preço por litro (R$)</label><input type="number" step="0.001" min="0" className="input" placeholder="Ex.: 4,39" value={alcoholPrice || ""} onChange={e => setAlcoholPrice(toNumber(e.target.value))} /></div>
              <div><label className="label">Valor abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" placeholder="Ex.: 80,00" value={alcohol || ""} onChange={e => setAlcohol(toNumber(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Litros calculados</p><p className="text-lg font-bold text-slate-800">{fmtLitros(alcoholLiters)} L</p></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Custo por km</p><p className="text-lg font-bold text-slate-800">{fmtPerKm(alcoholCostPerKm)}</p></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{kmDriven > 0 ? `Total para ${fmtKm(kmDriven)} km` : "Gasto total"}</p><p className="text-lg font-bold text-slate-800">{formatBRL(alcohol)}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Total de combustível</p><p className="text-xl font-bold text-slate-800">{formatBRL(totalFuelCost)}</p></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Custo total de combustível por km</p><p className="text-xl font-bold text-slate-800">{fmtPerKm(totalFuelCostPerKm)}</p></div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems} /></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><ExtraExpenses extras={extras} onChange={setExtras} /></div>

        <button type="submit" className="btn btn-primary w-full">Salvar e ver meu lucro</button>
        {status && <p className="text-center text-sm text-slate-600" role="status">{status}</p>}
      </form>

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
