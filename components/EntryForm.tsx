"use client";

import { useState } from "react";
import { computeFeeAmount, computeFuelCost, computeFuelLiters, computeKmPerLiter, formatBRL, toNumber, todayISO, type ExtraExpense } from "@/lib/utils";
import ExtraExpenses from "./ExtraExpenses";
import MaintenanceExpenses, { type MaintenanceItem } from "./MaintenanceExpenses";
import { saveEntry } from "@/app/actions";

type Mode = "withFee" | "net";

type Props = {
  initialDate?: string;
  initialMonthProfit?: number;
};

function formatKm(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatKmPerLiter(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`;
}

export default function EntryForm({
  initialDate = todayISO(),
  initialMonthProfit = 0,
}: Props) {
  const [mode, setMode] = useState<Mode>("withFee");
  const [date, setDate] = useState<string>(initialDate);
  const [gross, setGross] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [netFare, setNetFare] = useState<number>(0);
  const [gas, setGas] = useState<number>(0);
  const [alcohol, setAlcohol] = useState<number>(0);
  const [gasolineLiters, setGasolineLiters] = useState<number>(0);
  const [alcoholLiters, setAlcoholLiters] = useState<number>(0);
  const [kmInitial, setKmInitial] = useState<number>(0);
  const [kmFinal, setKmFinal] = useState<number>(0);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [extras, setExtras] = useState<ExtraExpense[]>([]);
  const [monthProfit, setMonthProfit] = useState<number>(initialMonthProfit);
  const [status, setStatus] = useState<string>("");

  const fareNet = mode === "withFee" ? gross * (1 - fee / 100) : netFare;
  const feeAmount = mode === "withFee" ? computeFeeAmount({ gross_amount: gross, fee_percent: fee }) : 0;
  const extrasSum = extras.reduce((acc, e) => acc + toNumber(e.value), 0);
  const maintenanceTotal = maintenanceItems.reduce((acc, m) => acc + toNumber(m.value), 0);
  const totalExpenses = gas + alcohol + maintenanceTotal + extrasSum;
  const dayProfit = fareNet - totalExpenses;
  const fuelCost = computeFuelCost({ gas_expense: gas, alcohol_expense: alcohol });
  const fuelLiters = computeFuelLiters({ gasoline_liters: gasolineLiters, alcohol_liters: alcoholLiters });
  const kmDriven = Math.max(0, kmFinal - kmInitial);
  const kmPerLiter = computeKmPerLiter({ km_driven: kmDriven, gasoline_liters: gasolineLiters, alcohol_liters: alcoholLiters });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (kmInitial < 0 || kmFinal < 0 || kmFinal < kmInitial || gasolineLiters < 0 || alcoholLiters < 0) {
      setStatus("❌ O km final deve ser maior ou igual ao km inicial, e os valores não podem ser negativos.");
      return;
    }
    setStatus("Salvando...");

    const payload = {
      date,
      gross_amount: mode === "withFee" ? gross : null,
      fee_percent: mode === "withFee" ? fee : null,
      net_fare: mode === "net" ? netFare : null,
      gas_expense: gas,
      alcohol_expense: alcohol,
      gasoline_liters: gasolineLiters,
      alcohol_liters: alcoholLiters,
      km_driven: kmDriven,
      maintenance_expense: maintenanceTotal,
      maintenance_details: maintenanceItems.filter((m) => m.description.trim() !== ""),
      extra_expenses: extras.filter((e) => e.name.trim() !== ""),
    };

    const res = await saveEntry(payload);
    if (res.success) {
      setStatus("✅ Lançamento salvo com sucesso!");
      if (typeof res.monthProfit === "number") setMonthProfit(res.monthProfit);
      setGross(0); setFee(0); setNetFare(0);
      setGas(0); setAlcohol(0); setGasolineLiters(0); setAlcoholLiters(0); setKmInitial(0); setKmFinal(0);
      setMaintenanceItems([]); setExtras([]);
    } else {
      setStatus(`❌ Erro: ${res.error}`);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <label className="label">Data do lançamento</label>
          <input type="date" className="input max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Receita</h3>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={mode === "withFee"} onChange={() => setMode("withFee")} />Valor com taxa</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={mode === "net"} onChange={() => setMode("net")} />Valor já líquido</label>
          </div>
          {mode === "withFee" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Valor bruto (R$)</label><input type="number" step="0.01" min="0" className="input" value={gross || ""} onChange={(e) => setGross(toNumber(e.target.value))} /></div>
                <div><label className="label">Taxa do app (%)</label><input type="number" step="0.01" min="0" max="100" className="input" value={fee || ""} onChange={(e) => setFee(toNumber(e.target.value))} /></div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Valor bruto</span><strong>{formatBRL(gross)}</strong></div>
                <div className="flex justify-between text-red-600"><span>Desconto da taxa ({fee.toFixed(2)}%)</span><strong>− {formatBRL(feeAmount)}</strong></div>
                <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold"><span>Receita líquida</span><strong>{formatBRL(fareNet)}</strong></div>
              </div>
            </>
          ) : (
            <div><label className="label">Valor líquido recebido (R$)</label><input type="number" step="0.01" min="0" className="input max-w-sm" value={netFare || ""} onChange={(e) => setNetFare(toNumber(e.target.value))} /></div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Quilometragem e combustível</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Km inicial</label><input type="number" step="0.1" min="0" className="input" value={kmInitial || ""} onChange={(e) => setKmInitial(toNumber(e.target.value))} placeholder="Ex.: 52.340" /></div>
            <div><label className="label">Km final</label><input type="number" step="0.1" min="0" className="input" value={kmFinal || ""} onChange={(e) => setKmFinal(toNumber(e.target.value))} placeholder="Ex.: 52.520" /></div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
            <div><p className="text-xs text-slate-500">Km rodados no dia</p><p className="text-2xl font-bold text-slate-800">{formatKm(kmDriven)} km</p></div>
            <p className="text-xs text-slate-500 text-right">Km final − km inicial</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Gasolina (R$)</label><input type="number" step="0.01" min="0" className="input" value={gas || ""} onChange={(e) => setGas(toNumber(e.target.value))} /></div>
            <div><label className="label">Gasolina (litros)</label><input type="number" step="0.01" min="0" className="input" value={gasolineLiters || ""} onChange={(e) => setGasolineLiters(toNumber(e.target.value))} placeholder="Ex.: 15,5" /></div>
            <div><label className="label">Álcool (R$)</label><input type="number" step="0.01" min="0" className="input" value={alcohol || ""} onChange={(e) => setAlcohol(toNumber(e.target.value))} /></div>
            <div><label className="label">Álcool (litros)</label><input type="number" step="0.01" min="0" className="input" value={alcoholLiters || ""} onChange={(e) => setAlcoholLiters(toNumber(e.target.value))} placeholder="Ex.: 0" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Combustível gasto</p><p className="text-xl font-bold text-slate-800">{formatBRL(fuelCost)}</p></div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Combustível abastecido</p><p className="text-xl font-bold text-slate-800">{fuelLiters.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L</p></div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Consumo</p><p className="text-xl font-bold text-slate-800">{formatKmPerLiter(kmPerLiter)}</p></div>
          </div>
          <p className="text-xs text-slate-500">A quilometragem diária é calculada automaticamente por km final − km inicial. No relatório mensal, o total será a soma dos km rodados em cada lançamento. O km/L usa km totais ÷ litros totais.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems} /></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><ExtraExpenses extras={extras} onChange={setExtras} /></div>
        <button type="submit" className="btn btn-primary w-full">Salvar lançamento</button>
        {status && <p className="text-sm text-center text-slate-600">{status}</p>}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-xl p-5 shadow-md">
          <p className="text-xs uppercase tracking-wide opacity-80">Lucro líquido do dia</p>
          <p className="text-3xl font-bold mt-1">{formatBRL(dayProfit)}</p>
          <div className="text-xs opacity-90 mt-2 space-y-1">
            <p>Receita líquida: <strong>{formatBRL(fareNet)}</strong></p>
            {mode === "withFee" && <p>Taxa descontada: <strong>{formatBRL(feeAmount)}</strong> ({fee.toFixed(2)}%)</p>}
            <p>Despesas: <strong>{formatBRL(totalExpenses)}</strong></p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Lucro líquido do mês</p>
          <p className="text-3xl font-bold mt-1 text-slate-800">{formatBRL(monthProfit)}</p>
          <p className="text-xs text-slate-500 mt-2">Soma dos lançamentos do mês selecionado</p>
        </div>
      </div>
    </div>
  );
}
