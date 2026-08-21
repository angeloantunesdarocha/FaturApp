"use client";

import { toNumber, formatBRL } from "@/lib/utils";

export type MaintenanceItem = { description: string; value: number };

type Props = {
  items: MaintenanceItem[];
  onChange: (items: MaintenanceItem[]) => void;
};

export default function MaintenanceExpenses({ items, onChange }: Props) {
  function addItem() {
    onChange([...items, { description: "", value: 0 }]);
  }

  function updateItem(index: number, patch: Partial<MaintenanceItem>) {
    const next = items.map((e, i) => (i === index ? { ...e, ...patch } : e));
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  const totalItems = items.reduce((acc, e) => acc + toNumber(e.value), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">{items.length} lançamento{items.length===1?"":"s"}</span><strong className="text-slate-800">{formatBRL(totalItems)}</strong></div>

      {items.map((item, i) => (
        <details
          key={i}
          open={i === items.length - 1 ? true : undefined}
          className="group rounded-lg border border-slate-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{item.description||"Nova manutenção"}</span><strong className="shrink-0 text-slate-800">{formatBRL(item.value)}</strong></summary>
          <div className="grid grid-cols-12 gap-2 items-end border-t border-slate-100 p-2">
          <div className="col-span-12 sm:col-span-7">
            <label className="label">Descrição</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Troca de óleo, Pneu..."
              value={item.description}
              onChange={(e) =>
                updateItem(i, { description: e.target.value })
              }
            />
          </div>
          <div className="col-span-8 sm:col-span-4">
            <label className="label">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={item.value || ""}
              onChange={(e) =>
                updateItem(i, { value: toNumber(e.target.value) })
              }
            />
          </div>
          <div className="col-span-4 sm:col-span-1 flex sm:justify-end">
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="btn btn-danger px-3 py-2 text-xs"
              aria-label="Remover manutenção"
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
        onClick={addItem}
        className="btn btn-secondary w-full"
      >
        + Adicionar manutenção
      </button>
    </div>
  );
}
