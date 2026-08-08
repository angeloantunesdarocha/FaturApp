import EntryForm from "@/components/EntryForm";
import { getMonthProfit } from "@/app/actions";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireUser(); const today = todayISO(); const monthProfit = await getMonthProfit(today);
  return <div className="space-y-4"><div className="min-w-0"><h1 className="text-2xl font-bold text-slate-900">Lançar dia</h1><p className="text-sm text-slate-600 break-safe">Olá, {user.login}. Lance o dia em 30 segundos e veja quanto sobrou de verdade — por km e por hora.</p></div><EntryForm initialDate={today} initialMonthProfit={monthProfit} /></div>;
}
