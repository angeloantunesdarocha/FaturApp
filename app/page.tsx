import EntryForm from "@/components/EntryForm";
import { getMonthProfit } from "@/app/actions";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function Home() {
  const user = await requireUser();
  const today = todayISO();
  const monthProfit = await getMonthProfit(today);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lançar dia</h1>
          <p className="text-sm text-slate-600">Olá, {user.login}. Preencha os dados da corrida e das despesas. O lucro do dia e do mês é calculado em tempo real.</p>
        </div>
        <LogoutButton />
      </div>
      <EntryForm initialDate={today} initialMonthProfit={monthProfit} />
    </div>
  );
}
