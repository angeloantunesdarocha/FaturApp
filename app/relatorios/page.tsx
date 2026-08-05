import { getEntriesInRange } from "@/app/actions";
import ReportsTable from "@/components/ReportsTable";
import { todayISO } from "@/lib/utils";

export default async function ReportsPage() {
  const today = todayISO();
  const [y, m] = today.split("-");
  const from = `${y}-${m}-01`;
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

  // Busca um intervalo amplo (ano corrente) para permitir o usuário filtrar client-side
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;
  const entries = await getEntriesInRange(yearStart, yearEnd);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
      <p className="text-sm text-slate-600">
        Filtre pelo período e categorias, envie por WhatsApp, e-mail ou baixe em
        CSV.
      </p>
      <ReportsTable entries={entries} initialFrom={from} initialTo={to} />
    </div>
  );
}