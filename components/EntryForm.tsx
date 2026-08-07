"use client";

import { useState } from "react";
import { toNumber, todayISO, type ExtraExpense } from "@/lib/utils";
import ExtraExpenses from "./ExtraExpenses";
import MaintenanceExpenses, { type MaintenanceItem } from "./MaintenanceExpenses";
import { saveEntry } from "@/app/actions";

type Mode = "withFee" | "net";

type Props = {
  initialDate?: string;
  initialMonthProfit?: number;
};

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
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [extras, setExtras] = useState<ExtraExpense[]>([]);

  const [monthProfit, setMonthProfit] = useState<number>(initialMonthProfit);
  const [status, setStatus] = useState<string>("");

  // Recalcula lucro líquido da corrida
  const fareNet =
    mode === "withFee" ? gross * (1 - fee / 100) : netFare;

  const extrasSum = extras.reduce((acc, e) => acc + toNumber(e.value), 0);
  const maintenanceTotal = maintenanceItems.reduce((acc, m) => acc + toNumber(m.value), 0);
  const totalExpenses = gas + alcohol + maintenanceTotal + extrasSum;
  const dayProfit = fareNet - totalExpenses;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Salvando...");

    const payload = {
      date,
      gross_amount: mode === "withFee" ? gross : null,
      fee_percent: mode === "withFee" ? fee : null,
      net_fare: mode === "net" ? netFare : null,
      gas_expense: gas,
      alcohol_expense: alcohol,
      maintenance_expense: maintenanceTotal,
      maintenance_details: maintenanceItems.filter((m) => m.description.trim() !== ""),
      extra_expenses: extras.filter((e) => e.name.trim() !== ""),
    };

    const res = await saveEntry(payload);
    if (res.success) {
      setStatus("✅ Lançamento salvo com sucesso!");
      // Recarrega o lucro do mês retornado pelo server
      if (typeof res.monthProfit === "number") {
        setMonthProfit(res.monthProfit);
      }
      // Reseta alguns campos mantendo a data
      setGross(0); setFee(0); setNetFare(0);
      setGas(0); setAlcohol(0); setMaintenanceItems([]);
      setExtras([]);
    } else {
      setStatus(`❌ Erro: ${res.error}`);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Data */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <label className="label">Data do lançamento</label>
          <input
            type="date"
            className="input max-w-xs"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Receita */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Receita</h3>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={mode === "withFee"}
                onChange={() => setMode("withFee")}
              />
              Valor com taxa
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={mode === "net"}
                onChange={() => setMode("net")}
              />
              Valor já líquido
            </label>
          </div>

          {mode === "withFee" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valor bruto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={gross || ""}
                  onChange={(e) => setGross(toNumber(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Taxa do app (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input"
                  value={fee || ""}
                  onChange={(e) => setFee(toNumber(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Valor líquido recebido (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input max-w-sm"
                value={netFare || ""}
                onChange={(e) => setNetFare(toNumber(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Despesas fixas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Despesas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Gasolina (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={gas || ""}
                onChange={(e) => setGas(toNumber(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Álcool (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={alcohol || ""}
                onChange={(e) => setAlcohol(toNumber(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Manutenções */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems} />
        </div>

        {/* Gastos extras */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <ExtraExpenses extras={extras} onChange={setExtras} />
        </div>

        {/* Botão salvar */}
        <button type="submit" className="btn btn-primary w-full">
          Salvar lançamento
        </button>
        {status && (
          <p className="text-sm text-center text-slate-600">{status}</p>
        )}
      </form>

      {/* Resumo do dia + mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-xl p-5 shadow-md">
          <p className="text-xs uppercase tracking-wide opacity-80">
            Lucro líquido do dia
          </p>
          <p className="text-3xl font-bold mt-1">
            {dayProfit.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <p className="text-xs opacity-80 mt-2">
            Receita {fareNet.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            {" − "}
            Despesas {totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Lucro líquido do mês
          </p>
          <p className="text-3xl font-bold mt-1 text-slate-800">
            {monthProfit.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Soma dos lançamentos do mês selecionado
          </p>
        </div>
      </div>
    </div>
  );
}