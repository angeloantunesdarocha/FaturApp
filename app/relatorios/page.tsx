import { getEntriesInRange } from "@/app/actions";
import ReportsTable from "@/components/ReportsTable";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  const user = await requireUser();
  const today = todayISO();
  const [year] = today.split("-");
  const entries = await getEntriesInRange(`${year}-01-01`, `${year}-12-31`);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-600 break-safe">Usuário: {user.login}</p>
        </div>
      </div>
      <p className="text-sm text-slate-600">Veja o que realmente sobrou: lucro, custo por km e resultado do período selecionado.</p>
      <ReportsTable entries={entries} initialFrom={`${year}-${today.split("-")[1]}-01`} initialTo={today} />
    </div>
  );
}
