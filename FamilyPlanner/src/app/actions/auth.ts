"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const name = getString(formData, "name") || undefined;
  const familyName = getString(formData, "familyName") || undefined;
  const familyId = getString(formData, "familyId") || undefined;
  if (!email || !password) return { error: "Email and password are required." };

  const origin = (await headers()).get("origin");
  const callbackUrl = origin ? `${origin}/auth/callback` : `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        name,
        family_name: familyName,
        family_id: familyId
      }
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { success: true, message: "Please check your email to confirm your account." };
  }

  revalidatePath("/", "layout");
  redirect("/week");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  if (!email || !password) return { error: "Email and password are required." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/week");
}

export async function ensureFamilyFromMetadata(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const familyName = (user.user_metadata?.family_name || user.user_metadata?.familyName) as string | undefined;
  const familyId = (user.user_metadata?.family_id || user.user_metadata?.familyId) as string | undefined;

  // 1. Find or Create Profile (The "Ghost User" Fix)
  let { data: profile } = await supabase
    .from("profiles")
    .select("id, family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    console.log("Profile missing - repairing account...");
    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
        role: "member"
      })
      .select("id, family_id")
      .single();

    if (profileError) {
      console.error("Critical: Could not repair profile:", profileError);
      return false;
    }
    profile = newProfile;
  }

  // 2. If already in a family, we're done
  if (profile.family_id) return true;

  // 3. Setup Family (Join or Create)
  if (familyId) {
    console.log("Attempting to join family:", familyId);

    // Verify family exists
    const { data: familyExists } = await supabase
      .from("families")
      .select("id")
      .eq("id", familyId)
      .maybeSingle();

    if (!familyExists) {
      console.error("Family ID not found:", familyId);
      // Fallback to creating a new one or show error? 
      // For now, let's just log and continue to create a new one as fallback
      console.log("Falling back to creating a new family...");
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ family_id: familyId, role: "member" })
        .eq("id", user.id);

      if (error) {
        console.error("Error joining family:", error.message);
        return false;
      }

      console.log("Successfully joined family:", familyId);
      return true;
    }
  }

  // Create a new family (Use metadata or a default if missing)
  const finalFamilyName = familyName?.trim() || `${user.user_metadata?.name || 'My'}'s Family`;
  console.log("Creating new family:", finalFamilyName);

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: finalFamilyName })
    .select("id")
    .single();

  if (familyError || !family) {
    console.error("Error creating family:", familyError?.message || "No family returned");
    return false;
  }

  console.log("New family created with ID:", family.id);

  // Set as ADMIN for the new family
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ family_id: family.id, role: "admin" })
    .eq("id", user.id);

  if (profileError) {
    console.error("Error linking profile to new family:", profileError.message);
    return false;
  }

  console.log("Profile linked to family as admin successfully");
  return true;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
