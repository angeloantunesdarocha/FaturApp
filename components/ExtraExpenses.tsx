"use client";

import { toNumber, formatBRL, type ExtraExpense } from "@/lib/utils";

type Props = {
  extras: ExtraExpense[];
  onChange: (extras: ExtraExpense[]) => void;
};

export default function ExtraExpenses({ extras, onChange }: Props) {
  function addExtra() {
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
      <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">{extras.length} lançamento{extras.length===1?"":"s"}</span><strong className="text-slate-800">{formatBRL(totalExtras)}</strong></div>

      {extras.map((extra, i) => (
        <details
          key={i}
          open={!extra.name || !extra.value ? true : undefined}
          className="group rounded-lg border border-slate-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{extra.name||"Novo gasto"}</span><strong className="shrink-0 text-slate-800">{formatBRL(extra.value)}</strong></summary>
          <div className="grid grid-cols-12 gap-2 items-end border-t border-slate-100 p-2">
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
        </details>
      ))}

      <button
        type="button"
        onClick={addExtra}
        className="btn btn-secondary w-full"
      >
        + Adicionar gasto extra
      </button>
    </div>
  );
}
