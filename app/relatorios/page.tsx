import { getEntriesInRange } from "@/app/actions";
import ReportsDashboard from "@/components/ReportsDashboard";
import ShareResultCard from "@/components/ShareResultCard";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  await requireUser();
  const today = todayISO();
  const [year] = today.split("-");
  const entries = await getEntriesInRange(`${year}-01-01`, `${year}-12-31`);
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastDay = new Date(Number(year), Number(today.slice(5, 7)), 0).getDate();
  const monthEnd = `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;

  return <div className="space-y-5">
    <ReportsDashboard entries={entries} initialFrom={monthStart} initialTo={monthEnd} />
    <ShareResultCard entries={entries} />
  </div>;
}
