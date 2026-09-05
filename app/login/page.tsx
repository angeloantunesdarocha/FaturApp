import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <AuthForm mode="login" oauthError={searchParams.error} />;
}
