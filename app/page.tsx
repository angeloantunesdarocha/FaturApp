import EntryForm from "@/components/EntryForm";
import { getMonthProfit } from "@/app/actions";
import { hojeBrasilia } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/comece");
  const today = hojeBrasilia(); const monthProfit = await getMonthProfit(today);
  return <div className="space-y-4"><div className="min-w-0"><h1 className="text-2xl font-bold text-slate-900">Lançar dia</h1><p className="text-sm text-slate-600 break-safe">Olá, {user.login}. Lance o dia em 30 segundos e veja quanto sobrou de verdade — por km e por hora.</p></div><EntryForm initialDate={today} initialMonthProfit={monthProfit} userId={user.user_id} /></div>;
}
