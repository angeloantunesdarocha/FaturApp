import EntryForm from "@/components/EntryForm";
import { getMonthProfit } from "@/app/actions";
import { todayISO } from "@/lib/utils";

export default async function Home() {
  const today = todayISO();
  const monthProfit = await getMonthProfit(today);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Lançar dia</h1>
      <p className="text-sm text-slate-600">
        Preencha os dados da corrida e das despesas. O lucro do dia e do mês é
        calculado em tempo real.
      </p>
      <EntryForm initialDate={today} initialMonthProfit={monthProfit} />
    </div>
  );
}