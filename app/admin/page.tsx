import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDashboard } from "./actions";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
  const data = await getAdminDashboard(searchParams.from, searchParams.to);
  return <AdminDashboard data={data} />;
}
