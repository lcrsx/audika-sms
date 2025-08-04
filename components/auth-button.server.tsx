import { createClient } from "@/lib/supabase/server";
import { AuthButtonClient } from "./auth-button.client";

export default async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return <AuthButtonClient email={user?.email} />;
}
