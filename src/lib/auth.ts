"use server";

import { createClient } from "@/lib/supabase/server";

/** Returns current user id and family id from Supabase auth + profile. */
export async function getCurrentUserAndFamily(): Promise<{
  userId: string | null;
  familyId: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { userId: null, familyId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  return { userId: user.id, familyId: profile?.family_id ?? null };
}
