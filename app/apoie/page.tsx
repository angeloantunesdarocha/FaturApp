import { requireUser } from "@/lib/auth";
import ContributionForm from "@/components/ContributionForm";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireUser();
  return (
    <div className="min-h-[calc(100vh-10rem)] bg-slate-50 px-3 py-8 sm:px-6 sm:py-12">
      <ContributionForm returned={searchParams.status === "retorno"} />
    </div>
  );
}