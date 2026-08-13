import { getEntriesInRange } from "@/app/actions";
import ReportsDashboardPremium from "@/components/ReportsDashboardPremium";
import { todayISO } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  await requireUser();
  const today = todayISO();
  const [year] = today.split("-");
  // Buscar todos os lançamentos do ano para o dashboard filtrar dinamicamente
  const entries = await getEntriesInRange(`${year}-01-01`, `${year}-12-31`);
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastDay = new Date(Number(year), Number(today.slice(5, 7)), 0).getDate();
  const monthEnd = `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {/*
        ReportExportActions agora vive DENTRO do ReportsDashboardPremium
        e recebe from/to do estado dinâmico do usuário.
        Antes estava aqui com from/to fixos do servidor — esse era o bug
        que gerava o PDF sempre com o mês inteiro ignorando a data selecionada.
      */}
      <ReportsDashboardPremium
        entries={entries}
        initialFrom={monthStart}
        initialTo={monthEnd}
      />
    </div>
  );
}
