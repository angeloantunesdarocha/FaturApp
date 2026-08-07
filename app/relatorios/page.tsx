import { getEntriesInRange } from "@/app/actions";
import ReportsTable from "@/components/ReportsTable";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function ReportsPage() {
  const user = await requireUser();
  const today = todayISO();
  const [y, m] = today.split("-");
  const from = `${y}-${m}-01`;
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;
  const entries = await getEntriesInRange(yearStart, yearEnd);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-600">Usuário: {user.login}</p>
        </div>
        <LogoutButton />
      </div>

      <p className="text-sm text-slate-600">
        Consulte quilometragem, combustível, receitas, despesas e lucro em uma visão organizada. Envie por WhatsApp, e-mail ou baixe em PDF/CSV.
      </p>

      <ReportsTable entries={entries} initialFrom={from} initialTo={to} />
    </div>
  );
}
