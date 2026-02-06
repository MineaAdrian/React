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
  const name = getString(formData, "name") || null;
  const familyName = getString(formData, "familyName") || null;
  const familyId = getString(formData, "familyId") || null;
  if (!email || !password) return { error: "Email and password are required." };

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  // internal fallback
  let baseUrl = origin;
  if (!baseUrl) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || null;
  }
  if (!baseUrl) {
    console.warn("NEXT_PUBLIC_APP_URL is not set. Defaulting to http://localhost:3000");
    baseUrl = "http://localhost:3000";
  }

  const callbackUrl = `${baseUrl}/auth/callback`;
  console.log("SignUp using callbackUrl:", callbackUrl);

  console.log("Starting signUp process for:", email);

  try {
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
      console.error("Supabase signUp error:", error.message, error.status);
      return { error: `Sign up failed: ${error.message}` };
    }

    if (!data.user) {
      console.error("Supabase signUp returned no user and no error.");
      return { error: "Unexpected error: No user created." };
    }

    if (data.user.identities && data.user.identities.length === 0) {
      console.warn("User created but no identities - likely waiting for email verification or user already exists.");
      return { error: "This email is already registered. Please sign in." };
    }

    console.log("User created successfully:", data.user.id);

    // If session exists, they are logged in (email confirmation disabled?)
    if (data.user.role === 'authenticated' && !data.session) {
      return { success: true, message: "Please check your email to confirm your account." };
    }

    // If we have a session, we can proceed
    if (data.session) {
      revalidatePath("/", "layout");
      redirect("/week");
    }

    return { success: true, message: "Please check your email to confirm your account." };

  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    console.error("Exception during signUp:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function resendConfirmationEmail(email: string) {
  console.log("Resending confirmation to:", email);
  try {
    const supabase = await createClient();

    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin");
    const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/auth/callback`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: callbackUrl
      }
    });

    if (error) {
      console.error("Resend error:", error);
      return { error: error.message };
    }

    console.log("Resend successful for:", email);
    return { success: true, message: "Confirmation email resent." };
  } catch (err) {
    console.error("Exception during resend:", err);
    return { error: "Failed to resend email." };
  }
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function signIn(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const remember = formData.get("remember") === "on";

  if (!email || !password) return { error: "Email and password are required." };

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // If user did NOT check "remember me", make it a session cookie (remove persistence)
              const finalOptions = { ...options };
              if (!remember) {
                delete finalOptions.maxAge;
                delete finalOptions.expires;
              }
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // ignore
          }
        },
      },
    }
  );

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

  // Use Admin Client if available to bypass RLS during setup
  let supabaseAdmin = supabase;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const { createClient: createClientJs } = await import("@supabase/supabase-js");
    supabaseAdmin = createClientJs(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    ) as any;
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not found. Using standard client (RLS may block family creation).");
  }

  const { data: family, error: familyError } = await supabaseAdmin
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
  const { error: profileError } = await supabaseAdmin
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
