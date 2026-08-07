"use client";

import { useState } from "react";
import { computeFeeAmount, computeFuelCost, computeFuelCostPerKm, computeLitersFromPurchase, formatBRL, toNumber, todayISO, type ExtraExpense } from "@/lib/utils";
import ExtraExpenses from "./ExtraExpenses";
import MaintenanceExpenses, { type MaintenanceItem } from "./MaintenanceExpenses";
import { saveEntry } from "@/app/actions";

type Mode = "withFee" | "net";

type Props = { initialDate?: string; initialMonthProfit?: number };

function formatKm(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
function formatCostPerKm(value: number | null): string {
  return value === null ? "—" : `${formatBRL(value)} / km`;
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
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [extras, setExtras] = useState<ExtraExpense[]>([]);
  const [monthProfit, setMonthProfit] = useState(initialMonthProfit);
  const [status, setStatus] = useState("");

  const fareNet = mode === "withFee" ? gross * (1 - fee / 100) : netFare;
  const feeAmount = mode === "withFee" ? computeFeeAmount({ gross_amount: gross, fee_percent: fee }) : 0;
  const extrasSum = extras.reduce((acc, e) => acc + toNumber(e.value), 0);
  const maintenanceTotal = maintenanceItems.reduce((acc, m) => acc + toNumber(m.value), 0);
  const totalExpenses = gas + alcohol + maintenanceTotal + extrasSum;
  const dayProfit = fareNet - totalExpenses;
  const kmDriven = Math.max(0, kmFinal - kmInitial);
  const gasLiters = computeLitersFromPurchase(gas, gasPrice);
  const alcoholLiters = computeLitersFromPurchase(alcohol, alcoholPrice);
  const gasCostPerKm = computeFuelCostPerKm(gas, kmDriven);
  const alcoholCostPerKm = computeFuelCostPerKm(alcohol, kmDriven);
  const totalFuelCost = computeFuelCost({ gas_expense: gas, alcohol_expense: alcohol });
  const totalFuelLiters = gasLiters + alcoholLiters;
  const totalFuelCostPerKm = computeFuelCostPerKm(totalFuelCost, kmDriven);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (kmInitial < 0 || kmFinal < 0 || kmFinal < kmInitial || gas < 0 || alcohol < 0 || gasPrice < 0 || alcoholPrice < 0) {
      setStatus("❌ Confira os quilômetros e os valores de combustível. Nenhum valor pode ser negativo e o km final deve ser maior ou igual ao inicial.");
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
      maintenance_expense: maintenanceTotal,
      maintenance_details: maintenanceItems.filter((m) => m.description.trim() !== ""),
      extra_expenses: extras.filter((e) => e.name.trim() !== ""),
    };

    const res = await saveEntry(payload);
    if (res.success) {
      setStatus("✅ Lançamento salvo com sucesso!");
      if (typeof res.monthProfit === "number") setMonthProfit(res.monthProfit);
      setGross(0); setFee(0); setNetFare(0); setGas(0); setAlcohol(0); setGasPrice(0); setAlcoholPrice(0); setKmInitial(0); setKmFinal(0);
      setMaintenanceItems([]); setExtras([]);
    } else setStatus(`❌ Erro: ${res.error}`);
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
          {mode === "withFee" ? <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Valor bruto (R$)</label><input type="number" step="0.01" min="0" className="input" value={gross || ""} onChange={(e) => setGross(toNumber(e.target.value))} /></div>
              <div><label className="label">Taxa do app (%)</label><input type="number" step="0.01" min="0" max="100" className="input" value={fee || ""} onChange={(e) => setFee(toNumber(e.target.value))} /></div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Valor bruto</span><strong>{formatBRL(gross)}</strong></div>
              <div className="flex justify-between text-red-600"><span>Desconto da taxa ({fee.toFixed(2)}%)</span><strong>− {formatBRL(feeAmount)}</strong></div>
              <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold"><span>Receita líquida</span><strong>{formatBRL(fareNet)}</strong></div>
            </div>
          </> : <div><label className="label">Valor líquido recebido (R$)</label><input type="number" step="0.01" min="0" className="input max-w-sm" value={netFare || ""} onChange={(e) => setNetFare(toNumber(e.target.value))} /></div>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <div><h3 className="text-base font-bold text-slate-800">Quilometragem e combustível</h3><p className="text-xs text-slate-500 mt-1">Informe o hodômetro e o valor abastecido. O sistema calcula automaticamente os quilômetros e o custo do combustível por km.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Km inicial</label><input type="number" step="0.1" min="0" className="input" value={kmInitial || ""} onChange={(e) => setKmInitial(toNumber(e.target.value))} placeholder="Ex.: 52.340" /></div>
            <div><label className="label">Km final</label><input type="number" step="0.1" min="0" className="input" value={kmFinal || ""} onChange={(e) => setKmFinal(toNumber(e.target.value))} placeholder="Ex.: 52.520" /></div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between"><div><p className="text-xs text-slate-500">Quantidade de km rodados</p><p className="text-2xl font-bold text-slate-800">{formatKm(kmDriven)} km</p></div><p className="text-xs text-slate-500 text-right">Km final − km inicial</p></div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="font-semibold text-slate-700">Gasolina</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Preço da gasolina por litro (R$)</label><input type="number" step="0.001" min="0" className="input" value={gasPrice || ""} onChange={(e) => setGasPrice(toNumber(e.target.value))} placeholder="Ex.: 6,19" /></div>
              <div><label className="label">Quanto colocou de gasolina (R$)</label><input type="number" step="0.01" min="0" className="input" value={gas || ""} onChange={(e) => setGas(toNumber(e.target.value))} placeholder="Ex.: 100,00" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Litros calculados</p><p className="text-lg font-bold text-slate-800">{gasLiters.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} L</p></div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Gasto por km</p><p className="text-lg font-bold text-slate-800">{formatCostPerKm(gasCostPerKm)}</p></div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Total gasto</p><p className="text-lg font-bold text-slate-800">{formatBRL(gas)}</p></div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="font-semibold text-slate-700">Álcool</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Preço do álcool por litro (R$)</label><input type="number" step="0.001" min="0" className="input" value={alcoholPrice || ""} onChange={(e) => setAlcoholPrice(toNumber(e.target.value))} placeholder="Ex.: 4,39" /></div>
              <div><label className="label">Quanto colocou de álcool (R$)</label><input type="number" step="0.01" min="0" className="input" value={alcohol || ""} onChange={(e) => setAlcohol(toNumber(e.target.value))} placeholder="Ex.: 80,00" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Litros calculados</p><p className="text-lg font-bold text-slate-800">{alcoholLiters.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} L</p></div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Gasto por km</p><p className="text-lg font-bold text-slate-800">{formatCostPerKm(alcoholCostPerKm)}</p></div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Total gasto</p><p className="text-lg font-bold text-slate-800">{formatBRL(alcohol)}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Total de combustível</p><p className="text-xl font-bold text-slate-800">{formatBRL(totalFuelCost)}</p></div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Custo total de combustível por km</p><p className="text-xl font-bold text-slate-800">{formatCostPerKm(totalFuelCostPerKm)}</p></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems} /></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><ExtraExpenses extras={extras} onChange={setExtras} /></div>
        <button type="submit" className="btn btn-primary w-full">Salvar lançamento</button>
        {status && <p className="text-sm text-center text-slate-600">{status}</p>}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-xl p-5 shadow-md"><p className="text-xs uppercase tracking-wide opacity-80">Lucro líquido do dia</p><p className="text-3xl font-bold mt-1">{formatBRL(dayProfit)}</p><div className="text-xs opacity-90 mt-2 space-y-1"><p>Receita líquida: <strong>{formatBRL(fareNet)}</strong></p>{mode === "withFee" && <p>Taxa descontada: <strong>{formatBRL(feeAmount)}</strong> ({fee.toFixed(2)}%)</p>}<p>Despesas: <strong>{formatBRL(totalExpenses)}</strong></p></div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Lucro líquido do mês</p><p className="text-3xl font-bold mt-1 text-slate-800">{formatBRL(monthProfit)}</p><p className="text-xs text-slate-500 mt-2">Soma dos lançamentos do mês selecionado</p></div>
      </div>
    </div>
  );
}
