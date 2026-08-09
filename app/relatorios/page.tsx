import { getEntriesInRange } from "@/app/actions";
import ReportsTableCompactV2 from "@/components/ReportsTableCompactV2";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  await requireUser();
  const today = todayISO();
  const [y, m] = today.split("-");
  const from = `${y}-${m}-01`;
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  const entries = await getEntriesInRange(`${y}-01-01`, `${y}-12-31`);
  const user = await requireUser();

  return <div className="space-y-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0"><h1 className="text-2xl font-bold text-slate-900">Relatórios</h1><p className="text-sm text-slate-600 break-safe">Usuário: {user.login}</p></div>
    </div>
    <p className="text-sm text-slate-600">Veja o que realmente sobrou: lucro, custo por km e resultado do período.</p>
    <ReportsTableCompactV2 entries={entries} initialFrom={from} initialTo={to} />
  </div>;
}
