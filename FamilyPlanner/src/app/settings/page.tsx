import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { SettingsForm } from "./SettingsForm";
import type { FamilyMemberRow, FamilyRequestRow } from "@/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, family_id, role")
    .eq("id", user.id)
    .single();

  let familyName: string | null = null;
  let members: FamilyMemberRow[] = [];

  if (profile?.family_id) {
    const { data: family } = await supabase
      .from("families")
      .select("name")
      .eq("id", profile.family_id)
      .single();
    familyName = family?.name ?? null;

    const { data: familyMembers } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("family_id", profile.family_id);
    members = (familyMembers || []) as FamilyMemberRow[];
  }

  // Fetch pending items
  const { getPendingRequests } = await import("@/app/actions/family");
  const invitations = await getPendingRequests(undefined, user.email ?? undefined) as FamilyRequestRow[];
  const requests = profile?.family_id && profile.role === 'admin'
    ? (await getPendingRequests(profile.family_id)) as FamilyRequestRow[]
    : [];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <SettingsForm
          userId={user.id}
          userName={profile?.name ?? ""}
          userRole={profile?.role ?? "member"}
          familyName={familyName ?? ""}
          familyId={profile?.family_id ?? null}
          members={members}
          invitations={invitations}
          requests={requests}
        />
      </main>
    </>
  );
}
