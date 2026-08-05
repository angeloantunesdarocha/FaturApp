"use client";

import { toNumber, formatBRL, type ExtraExpense } from "@/lib/utils";

type Props = {
  extras: ExtraExpense[];
  onChange: (extras: ExtraExpense[]) => void;
};

export default function ExtraExpenses({ extras, onChange }: Props) {
  const canAdd = extras.length < 5;

  function addExtra() {
    if (!canAdd) return;
    onChange([...extras, { name: "", value: 0 }]);
  }

  function updateExtra(index: number, patch: Partial<ExtraExpense>) {
    const next = extras.map((e, i) => (i === index ? { ...e, ...patch } : e));
    onChange(next);
  }

  function removeExtra(index: number) {
    onChange(extras.filter((_, i) => i !== index));
  }

  const totalExtras = extras.reduce((acc, e) => acc + toNumber(e.value), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Gastos extras (máx. 5)
        </h3>
        <span className="text-sm text-slate-500">
          Total: {formatBRL(totalExtras)}
        </span>
      </div>

      {extras.map((extra, i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 items-end bg-white rounded-lg border border-slate-200 p-2"
        >
          <div className="col-span-12 sm:col-span-7">
            <label className="label">Nome do gasto</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Lavagem, Estacionamento..."
              value={extra.name}
              onChange={(e) => updateExtra(i, { name: e.target.value })}
            />
          </div>
          <div className="col-span-8 sm:col-span-4">
            <label className="label">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={extra.value || ""}
              onChange={(e) =>
                updateExtra(i, { value: toNumber(e.target.value) })
              }
            />
          </div>
          <div className="col-span-4 sm:col-span-1 flex sm:justify-end">
            <button
              type="button"
              onClick={() => removeExtra(i)}
              className="btn btn-danger px-3 py-2 text-xs"
              aria-label="Remover gasto extra"
              title="Remover"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addExtra}
        disabled={!canAdd}
        className="btn btn-secondary w-full"
      >
        + Adicionar gasto extra
      </button>
    </div>
  );
}