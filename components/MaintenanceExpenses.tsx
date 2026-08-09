"use client";

import { useState } from "react";
import { toNumber, formatBRL } from "@/lib/utils";

export type MaintenanceItem = { description: string; value: number };

type Props = { items: MaintenanceItem[]; onChange: (items: MaintenanceItem[]) => void };

export default function MaintenanceExpenses({ items, onChange }: Props) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const total = items.reduce((sum, item) => sum + toNumber(item.value), 0);

  function addItem() {
    const cleanDescription = description.trim();
    const numericValue = toNumber(value);
    if (!cleanDescription || numericValue <= 0) return;
    if (items.length >= 5) return;
    onChange([...items, { description: cleanDescription, value: numericValue }]);
    setDescription("");
    setValue("");
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Manutenção</h3>
        <span className="text-sm font-semibold text-slate-600">Total: {formatBRL(total)}</span>
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 sm:col-span-7">
          <label className="label">Descrição do gasto</label>
          <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Troca de óleo" />
        </div>
        <div className="col-span-8 sm:col-span-3">
          <label className="label">Valor (R$)</label>
          <input type="text" inputMode="decimal" className="input" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} placeholder="Ex.: 35,00" />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <button type="button" onClick={addItem} disabled={items.length >= 5} className="btn btn-secondary w-full px-3 py-2 text-sm">Adicionar</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {items.map((item, index) => (
            <div key={`${item.description}-${index}`} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 border border-slate-200">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.description}</span>
              <span className="shrink-0 text-sm font-semibold text-slate-700">{formatBRL(item.value)}</span>
              <button type="button" onClick={() => removeItem(index)} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" aria-label={`Remover ${item.description}`}>✕</button>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 text-right text-sm font-bold text-slate-800">Total dos itens: {formatBRL(total)}</div>
        </div>
      )}

      <p className="text-xs text-slate-500">Adicione até 5 itens. Descrição e valor maior que zero são obrigatórios.</p>
    </div>
  );
}
