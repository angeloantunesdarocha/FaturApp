"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFuelRecords,
  saveFuelRecord,
  type FuelRecord,
  type FuelRecordMode,
} from "@/app/actions";

type FuelCalculatorProps = {
  initialAmount?: number;
  initialPricePerLiter?: number;
  initialKilometers?: number;
  initialEfficiency?: number;
  onUseEfficiency?: (efficiency: number) => void;
};

type FuelResults = {
  purchasedLiters: number;
  efficiency: number;
  costPerKilometer: number;
  costPerHundredKilometers: number;
  consumedLiters: number;
  consumedCost: number;
  remainingLiters: number;
  remainingValue: number;
  remainingRange: number;
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function numberFromInput(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number, digits = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function kilometers(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function displayInput(value?: number): string {
  return value && value > 0 ? String(Number(value.toFixed(3))) : "";
}

function ResultCard({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string;
  value: string;
  detail?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-3 " +
        (emphasis
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white/80")
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          "mt-1 text-base font-black " +
          (emphasis ? "text-emerald-700" : "text-slate-800")
        }
      >
        {value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export default function FuelCalculator({
  initialAmount = 0,
  initialPricePerLiter = 0,
  initialKilometers = 0,
  initialEfficiency = 0,
  onUseEfficiency,
}: FuelCalculatorProps) {
  const [mode, setMode] = useState<FuelRecordMode>(
    initialEfficiency > 0 ? "monitoramento" : "consumo",
  );
  const [amount, setAmount] = useState(displayInput(initialAmount));
  const [price, setPrice] = useState(displayInput(initialPricePerLiter));
  const [distance, setDistance] = useState(displayInput(initialKilometers));
  const [efficiencyInput, setEfficiencyInput] = useState(
    displayInput(initialEfficiency),
  );
  const [vehicleName, setVehicleName] = useState("");
  const [simulatedDistance, setSimulatedDistance] = useState("");
  const [calculated, setCalculated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAmount(displayInput(initialAmount));
  }, [initialAmount]);

  useEffect(() => {
    setPrice(displayInput(initialPricePerLiter));
  }, [initialPricePerLiter]);

  useEffect(() => {
    setDistance(displayInput(initialKilometers));
  }, [initialKilometers]);

  useEffect(() => {
    if (initialEfficiency > 0) setEfficiencyInput(displayInput(initialEfficiency));
  }, [initialEfficiency]);

  useEffect(() => {
    let active = true;
    void getFuelRecords(5)
      .then((response) => {
        if (active && response.success) setRecords(response.records);
      })
      .catch(() => {
        if (active) setStatus("Não foi possível carregar o histórico.");
      });
    return () => {
      active = false;
    };
  }, []);

  const numericAmount = numberFromInput(amount);
  const numericPrice = numberFromInput(price);
  const numericDistance = numberFromInput(distance);
  const numericEfficiency = numberFromInput(efficiencyInput);
  const isValid =
    numericAmount > 0 &&
    numericPrice > 0 &&
    numericDistance > 0 &&
    (mode === "consumo" || numericEfficiency > 0);

  const results = useMemo<FuelResults | null>(() => {
    if (!isValid) return null;
    const purchasedLiters = numericAmount / numericPrice;
    const efficiency =
      mode === "consumo" ? numericDistance / purchasedLiters : numericEfficiency;
    const costPerKilometer = numericPrice / efficiency;
    const consumedLiters = numericDistance / efficiency;
    const remainingLiters = Math.max(0, purchasedLiters - consumedLiters);
    const consumedCost = consumedLiters * numericPrice;

    return {
      purchasedLiters,
      efficiency,
      costPerKilometer,
      costPerHundredKilometers: 100 * costPerKilometer,
      consumedLiters,
      consumedCost,
      remainingLiters,
      remainingValue: Math.max(0, numericAmount - consumedCost),
      remainingRange: remainingLiters * efficiency,
    };
  }, [isValid, mode, numericAmount, numericDistance, numericEfficiency, numericPrice]);

  function fieldError(field: string, value: number): string {
    return touched[field] && value <= 0 ? "Informe um valor maior que zero." : "";
  }

  function switchMode(nextMode: FuelRecordMode) {
    setMode(nextMode);
    setCalculated(false);
    setStatus("");
  }

  function calculate() {
    setTouched({ amount: true, price: true, distance: true, efficiency: true });
    if (isValid) {
      setCalculated(true);
      setStatus("");
    }
  }

  async function saveCalculation() {
    if (!results || saving) return;
    setSaving(true);
    setStatus("");

    try {
      const response = await saveFuelRecord({
        modo: mode,
        valor_abastecido: numericAmount,
        preco_litro: numericPrice,
        km_rodados: numericDistance,
        eficiencia_veiculo: results.efficiency,
        veiculo_nome: vehicleName,
      });

      if (!response.success) {
        setStatus(response.error);
        return;
      }

      if (mode === "consumo" && onUseEfficiency) {
        onUseEfficiency(response.efficiency);
      }

      const history = await getFuelRecords(5);
      if (history.success) setRecords(history.records);
      setStatus("✅ Cálculo salvo no histórico.");
    } catch {
      setStatus("Não foi possível salvar o cálculo. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const simulatedKilometers = numberFromInput(simulatedDistance);
  const simulatedCost = results ? simulatedKilometers * results.costPerKilometer : 0;
  const exceedsTank =
    mode === "monitoramento" &&
    results !== null &&
    results.consumedLiters > results.purchasedLiters;

  return (
    <section className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-800">Calculadora de combustível</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Descubra o consumo ou acompanhe o saldo do tanque.
        </p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
        {([
          ["consumo", "Calcular consumo"],
          ["monitoramento", "Monitorar tanque"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={
              "rounded-lg px-2 py-2 text-[11px] font-bold transition " +
              (mode === value
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-800")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-600">
          Abastecido (R$)
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            className="input mt-1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, amount: true }))}
            placeholder="100,00"
          />
          {fieldError("amount", numericAmount) && (
            <span className="mt-1 block text-[10px] text-rose-600">
              {fieldError("amount", numericAmount)}
            </span>
          )}
        </label>

        <label className="text-xs font-semibold text-slate-600">
          Preço/L (R$)
          <input
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
            className="input mt-1"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, price: true }))}
            placeholder="6,39"
          />
          {fieldError("price", numericPrice) && (
            <span className="mt-1 block text-[10px] text-rose-600">
              {fieldError("price", numericPrice)}
            </span>
          )}
        </label>

        <label className="text-xs font-semibold text-slate-600">
          Km rodados
          <input
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            className="input mt-1"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, distance: true }))}
            placeholder="35"
          />
          {fieldError("distance", numericDistance) && (
            <span className="mt-1 block text-[10px] text-rose-600">
              {fieldError("distance", numericDistance)}
            </span>
          )}
        </label>

        {mode === "monitoramento" ? (
          <label className="text-xs font-semibold text-slate-600">
            Consumo (km/L)
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              className="input mt-1"
              value={efficiencyInput}
              onChange={(event) => setEfficiencyInput(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, efficiency: true }))}
              placeholder="10"
            />
            {fieldError("efficiency", numericEfficiency) && (
              <span className="mt-1 block text-[10px] text-rose-600">
                {fieldError("efficiency", numericEfficiency)}
              </span>
            )}
          </label>
        ) : (
          <label className="text-xs font-semibold text-slate-600">
            Veículo (opcional)
            <input
              className="input mt-1"
              value={vehicleName}
              maxLength={100}
              onChange={(event) => setVehicleName(event.target.value)}
              placeholder="Moto ou carro"
            />
          </label>
        )}
      </div>

      {mode === "monitoramento" && (
        <label className="mt-3 block text-xs font-semibold text-slate-600">
          Veículo (opcional)
          <input
            className="input mt-1"
            value={vehicleName}
            maxLength={100}
            onChange={(event) => setVehicleName(event.target.value)}
            placeholder="Ex.: Moto Honda"
          />
        </label>
      )}

      <button
        type="button"
        onClick={calculate}
        disabled={!isValid}
        className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Calcular
      </button>

      {calculated && results && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <div className="grid grid-cols-2 gap-2">
            <ResultCard
              label="Litros comprados"
              value={`${decimal(results.purchasedLiters)} L`}
            />
            <ResultCard
              label="Consumo médio"
              value={`${decimal(results.efficiency)} km/L`}
              emphasis
            />
            <ResultCard
              label="Custo por km"
              value={`${moneyFormatter.format(results.costPerKilometer)}/km`}
            />
            {mode === "consumo" ? (
              <ResultCard
                label="Custo para 100 km"
                value={moneyFormatter.format(results.costPerHundredKilometers)}
              />
            ) : (
              <ResultCard
                label={`Gasto em ${kilometers(numericDistance)} km`}
                value={moneyFormatter.format(results.consumedCost)}
                detail={`${decimal(results.consumedLiters)} L consumidos`}
              />
            )}

            {mode === "monitoramento" && (
              <>
                <ResultCard
                  label="Restante no tanque"
                  value={`${decimal(results.remainingLiters)} L`}
                  detail={moneyFormatter.format(results.remainingValue)}
                  emphasis
                />
                <ResultCard
                  label="Autonomia restante"
                  value={`${kilometers(results.remainingRange)} km`}
                />
              </>
            )}
          </div>

          {exceedsTank && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              A distância informada supera a autonomia deste abastecimento.
            </p>
          )}

          <label className="block text-xs font-semibold text-slate-600">
            Quanto custa rodar X km?
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              className="input mt-1"
              value={simulatedDistance}
              onChange={(event) => setSimulatedDistance(event.target.value)}
              placeholder="Distância da sua próxima rota"
            />
          </label>

          {simulatedKilometers > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-xs font-semibold text-emerald-700">
                {kilometers(simulatedKilometers)} km
              </span>
              <strong className="text-sm text-emerald-800">
                {moneyFormatter.format(simulatedCost)}
              </strong>
            </div>
          )}

          {mode === "consumo" && onUseEfficiency && (
            <button
              type="button"
              onClick={() => {
                onUseEfficiency(results.efficiency);
                setStatus("✅ Consumo aplicado aos cálculos do dia.");
              }}
              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700"
            >
              Usar {decimal(results.efficiency)} km/L nos cálculos do dia
            </button>
          )}

          <button
            type="button"
            onClick={() => void saveCalculation()}
            disabled={saving}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar cálculo no histórico"}
          </button>
        </div>
      )}

      {status && <p className="mt-2 text-center text-xs text-slate-600">{status}</p>}

      {records.length > 0 && (
        <details className="mt-3 rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-700">
            Histórico de combustível ({records.length})
          </summary>
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {records.map((record) => (
              <div key={record.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    {record.veiculo_nome ||
                      (record.modo === "consumo" ? "Consumo calculado" : "Tanque monitorado")}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(record.data_registro).toLocaleDateString("pt-BR")} ·{" "}
                    {kilometers(Number(record.km_rodados))} km
                  </p>
                </div>
                <strong className="text-xs text-emerald-700">
                  {decimal(Number(record.eficiencia_calculada))} km/L
                </strong>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
