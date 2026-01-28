"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getFamilyMembers(familyId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("family_id", familyId);

    if (error) throw error;
    return data;
}

export async function removeMember(memberId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("role, family_id")
        .eq("id", user.id)
        .single();

    if (!currentUserProfile) throw new Error("Profile not found");
    if (currentUserProfile.role !== "admin" && user.id !== memberId) {
        throw new Error("Only admins can remove other members");
    }

    const { error } = await supabase
        .from("profiles")
        .update({ family_id: null, role: "member" })
        .eq("id", memberId);

    if (error) throw error;
    revalidatePath("/settings");
}

// --- NEW REQUEST LOGIC ---

export async function sendJoinRequest(familyId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if request already exists
    const { data: existing } = await supabase
        .from("family_requests")
        .select("id")
        .eq("family_id", familyId)
        .eq("email", user.email)
        .eq("status", "pending")
        .maybeSingle();

    if (existing) throw new Error("Request already pending.");

    const { error } = await supabase
        .from("family_requests")
        .insert({
            family_id: familyId,
            email: user.email!,
            user_id: user.id,
            type: "request"
        });

    if (error) throw error;

    // Notify Admin via Email
    const { data: admin } = await supabase
        .from("profiles")
        .select("email")
        .eq("family_id", familyId)
        .eq("role", "admin")
        .maybeSingle();

    if (admin?.email) {
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
            to: admin.email,
            subject: "🏠 New Family Join Request!",
            html: `
                <h2>Someone wants to join your family!</h2>
                <p><strong>${user.email}</strong> has requested to join your Family Planner.</p>
                <p>Go to your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings">Settings</a> to approve or decline.</p>
            `,
        });
    }

    revalidatePath("/settings");
}

export async function inviteMemberByEmail(email: string, familyId: string) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Verify current user is admin
    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role, families(name)")
        .eq("id", currentUser.id)
        .single();
    if (adminProfile?.role !== "admin") throw new Error("Unauthorized");

    const { error } = await supabase
        .from("family_requests")
        .insert({
            family_id: familyId,
            email: email.toLowerCase(),
            type: "invite"
        });

    if (error) throw error;

    // Notify User via Email
    const { sendEmail } = await import("@/lib/email");
    const familyData = adminProfile.families as unknown as { name: string } | null;

    await sendEmail({
        to: email,
        subject: `🍕 Invitation to join ${familyData?.name || 'a family'}!`,
        html: `
            <h2>You've been invited!</h2>
            <p>Admin <strong>${currentUser.email}</strong> invited you to join their family group on Family Planner.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings">Click here</a> to accept the invitation.</p>
        `,
    });

    revalidatePath("/settings");
}

export async function handleRequestAction(requestId: string, action: 'accepted' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: request } = await supabase
        .from("family_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (!request) throw new Error("Request not found");

    if (action === 'accepted') {
        // Find the user profile if it's an invite
        const { data: targetProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", request.email)
            .maybeSingle();

        if (targetProfile) {
            await supabase
                .from("profiles")
                .update({ family_id: request.family_id, role: "member" })
                .eq("id", targetProfile.id);
        }
    }

    await supabase
        .from("family_requests")
        .update({ status: action })
        .eq("id", requestId);

    revalidatePath("/settings");
}

export async function getPendingRequests(familyId?: string, email?: string) {
    const supabase = await createClient();
    let query = supabase.from("family_requests").select("*, families(name)").eq("status", "pending");

    if (familyId) query = query.eq("family_id", familyId).eq("type", "request");
    if (email) query = query.eq("email", email).eq("type", "invite");

    const { data, error } = await query;
    return data || [];
}
