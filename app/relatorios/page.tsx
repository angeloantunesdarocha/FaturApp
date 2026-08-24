import { getEntriesInRange } from "@/app/actions";
import ReportsDashboardPremium from "@/components/ReportsDashboardPremium";
import { hojeBrasilia } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  await requireUser();
  const today = hojeBrasilia();
  const [year] = today.split("-");
  // Buscar todos os lançamentos do ano para o dashboard filtrar dinamicamente
  const entries = await getEntriesInRange(`${year}-01-01`, `${year}-12-31`);

  return (
    <div className="space-y-5">
      <ReportsDashboardPremium
        entries={entries}
        initialFrom={today}
        initialTo={today}
      />
    </div>
  );
}
