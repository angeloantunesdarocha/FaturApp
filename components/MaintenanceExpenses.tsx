"use client";

import { toNumber, formatBRL } from "@/lib/utils";

export type MaintenanceItem = { description: string; value: number };

type Props = {
  items: MaintenanceItem[];
  onChange: (items: MaintenanceItem[]) => void;
};

export default function MaintenanceExpenses({ items, onChange }: Props) {
  const canAdd = items.length < 5;

  function addItem() {
    if (!canAdd) return;
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Manutenções (máx. 5)
        </h3>
        <span className="text-sm text-slate-500">
          Total: {formatBRL(totalItems)}
        </span>
      </div>

      {items.map((item, i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 items-end bg-white rounded-lg border border-slate-200 p-2"
        >
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
      ))}

      <button
        type="button"
        onClick={addItem}
        disabled={!canAdd}
        className="btn btn-secondary w-full"
      >
        + Adicionar manutenção
      </button>
    </div>
  );
}
