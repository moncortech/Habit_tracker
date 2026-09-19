import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getDashboardData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) redirect("/login");

  const dashboard = await getDashboardData(data.claims.sub as string);
  return <Dashboard initialData={dashboard} />;
}
