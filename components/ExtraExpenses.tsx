"use client";

import { useState } from "react";
import { toNumber, formatBRL, type ExtraExpense } from "@/lib/utils";

type Props = { extras: ExtraExpense[]; onChange: (extras: ExtraExpense[]) => void };

export default function ExtraExpenses({ extras, onChange }: Props) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const total = extras.reduce((sum, item) => sum + toNumber(item.value), 0);

  function addExtra() {
    const cleanName = name.trim();
    const numericValue = toNumber(value);
    if (!cleanName || numericValue <= 0) return;
    if (extras.length >= 5) return;
    onChange([...extras, { name: cleanName, value: numericValue }]);
    setName("");
    setValue("");
  }

  function removeExtra(index: number) {
    onChange(extras.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Gastos extras</h3>
        <span className="text-sm font-semibold text-slate-600">Total: {formatBRL(total)}</span>
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 sm:col-span-7">
          <label className="label">Descrição do gasto</label>
          <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Café da manhã" />
        </div>
        <div className="col-span-8 sm:col-span-3">
          <label className="label">Valor (R$)</label>
          <input type="text" inputMode="decimal" className="input" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }} placeholder="Ex.: 12,50" />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <button type="button" onClick={addExtra} disabled={extras.length >= 5} className="btn btn-secondary w-full px-3 py-2 text-sm">Adicionar</button>
        </div>
      </div>

      {extras.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {extras.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 border border-slate-200">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.name}</span>
              <span className="shrink-0 text-sm font-semibold text-slate-700">{formatBRL(item.value)}</span>
              <button type="button" onClick={() => removeExtra(index)} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" aria-label={`Remover ${item.name}`}>✕</button>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 text-right text-sm font-bold text-slate-800">Total dos itens: {formatBRL(total)}</div>
        </div>
      )}

      <p className="text-xs text-slate-500">Adicione até 5 itens. Descrição e valor maior que zero são obrigatórios.</p>
    </div>
  );
}
