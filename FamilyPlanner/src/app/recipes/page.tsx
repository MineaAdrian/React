import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { RecipesPageClient } from "./RecipesPageClient";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <RecipesPageClient familyId={profile?.family_id ?? null} />
      </main>
    </>
  );
}
