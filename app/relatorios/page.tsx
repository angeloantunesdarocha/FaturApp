import { getEntriesInRange } from "@/app/actions";
import ReportsTable from "@/components/ReportsTable";
import WrappedMensal from "@/components/WrappedMensal";
import { computeDayProfit, computeNetFare, formatBRL, formatDateBR, todayISO, toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function ReportsPage() {
  await requireUser();
  const today = todayISO(); const [y, m] = today.split("-"); const from = `${y}-${m}-01`; const lastDay = new Date(Number(y), Number(m), 0).getDate(); const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`; const yearStart = `${y}-01-01`; const yearEnd = `${y}-12-31`;
  const entries = await getEntriesInRange(yearStart, yearEnd);
  const monthEntries = entries.filter((e: any) => e.date >= from && e.date <= to);
  const profit = monthEntries.reduce((s: number, e: any) => s + computeDayProfit(e), 0);
  const km = monthEntries.reduce((s: number, e: any) => s + Math.max(0, Number(e.km_driven) || 0), 0);
  const costs = monthEntries.reduce((s: number, e: any) => s + Math.max(0, Number(e.gas_expense) || 0) + Math.max(0, Number(e.alcohol_expense) || 0) + Math.max(0, Number(e.maintenance_expense) || 0) + (e.extra_expenses || []).reduce((x: number, item: any) => x + toNumber(item.value), 0), 0);
  const profitPerKm = km > 0 ? profit / km : null; const costPerKm = km > 0 ? costs / km : null;
  const best = monthEntries.reduce((best: any, e: any) => !best || computeDayProfit(e) > computeDayProfit(best) ? e : best, null);
  const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  const verdict = profit > 0 ? <>🟢 Neste mês você <strong>LUCROU {formatBRL(profit)}</strong>. {km > 0 && profitPerKm !== null && costPerKm !== null ? <>Sobrou {formatBRL(profitPerKm)}/km e o custo ficou em {formatBRL(costPerKm)}/km.</> : ""}</> : profit < 0 ? <>🔴 Neste mês você <strong>PAGOU PRA TRABALHAR</strong>: faltaram {formatBRL(Math.abs(profit))}.</> : <>🟡 Neste mês você ficou no zero a zero: trabalhou pra pagar o carro.</>;

  return <div className="space-y-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><div className="min-w-0"><h1 className="text-2xl font-bold text-slate-900">Relatórios</h1><p className="text-sm text-slate-600 break-safe">Usuário: {await (async () => { const u = await requireUser(); return u.login; })()}</p></div><div className="self-start"><LogoutButton /></div></div>
    <p className="text-sm text-slate-600">Veja o que realmente sobrou: lucro, custo por km e resultado do mês.</p>

    {monthEntries.length > 0 && <>
      <section className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">A VERDADE DO MÊS</p><h2 className="mt-1 text-xl font-bold text-slate-900">Quanto sobrou de verdade?</h2><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Lucro líquido</p><p className="mt-1 text-xl font-bold text-slate-900">{formatBRL(profit)}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">R$ por km (médio)</p><p className="mt-1 text-xl font-bold text-slate-900">{profitPerKm === null ? "—" : `${formatBRL(profitPerKm)}/km`}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">R$ por hora</p><p className="mt-1 text-xl font-bold text-slate-900">—</p><p className="mt-1 text-[11px] text-slate-500">Disponível quando horas forem persistidas no lançamento.</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Km rodados</p><p className="mt-1 text-xl font-bold text-slate-900">{km.toLocaleString("pt-BR")} km</p></div></div><div className={`mt-4 rounded-xl p-4 text-sm font-semibold break-safe ${profit > 0 ? "bg-brand-50 text-brand-900" : profit < 0 ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`} aria-live="polite">{verdict}</div></section>
      {best && <WrappedMensal monthLabel={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} profit={profit} km={km} bestDate={formatDateBR(best.date)} bestProfit={computeDayProfit(best)} costPerKm={costPerKm} />}
    </>}

    <ReportsTable entries={entries} initialFrom={from} initialTo={to} />
  </div>;
}
