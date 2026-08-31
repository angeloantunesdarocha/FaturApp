import { getEntriesInRange } from "@/app/actions";
import ReportsDashboardPremium from "@/components/ReportsDashboardPremium";
import { hojeBrasilia } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  const user = await requireUser();
  const today = hojeBrasilia();
  // O filtro De/Até pode atravessar semanas, meses e anos sem nova regra de cálculo.
  const entries = await getEntriesInRange("2000-01-01", "2100-12-31");

  return (
    <div className="space-y-5">
      <ReportsDashboardPremium
        entries={entries}
        initialFrom={today}
        initialTo={today}
        userId={user.user_id}
      />
    </div>
  );
}
