import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDashboard } from "./actions";
import AdminDashboard from "@/components/AdminDashboard";
import { hojeBrasilia } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage(props: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const today = hojeBrasilia();
  const from = searchParams.from || today;
  const to = searchParams.to || today;
  const data = await getAdminDashboard(from, to);

  return <AdminDashboard data={data} />;
}
