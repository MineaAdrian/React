"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeMember, inviteMemberByEmail, sendJoinRequest, handleRequestAction } from "../actions/family";
import { UserRole, type FamilyMemberRow, type FamilyRequestRow } from "@/types";

import { useAuth } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  userId: string;
  userName: string;
  userRole: UserRole;
  familyName: string;
  familyId: string | null;
  members: FamilyMemberRow[];
  invitations: FamilyRequestRow[];
  requests: FamilyRequestRow[];
};

export function SettingsForm({ userId, userName, userRole, familyName, familyId, members, invitations, requests }: Props) {
  const { refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const [name, setName] = useState(userName);
  const [saved, setSaved] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "family" | "add">("profile");
  const [inviteEmail, setInviteEmail] = useState("");
  const [joinId, setJoinId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ name: name || null }).eq("id", user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) return;
    setStatus("sending");
    try {
      await inviteMemberByEmail(inviteEmail, familyId);
      setInviteEmail("");
      setStatus("success");
      setTimeout(() => setStatus(null), 3000);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error));
      setStatus(null);
    }
  };

  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("requesting");
    try {
      await sendJoinRequest(joinId);
      setJoinId("");
      setStatus("success");
      setTimeout(() => setStatus(null), 3000);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error));
      setStatus(null);
    }
  };

  const onAction = async (id: string, action: 'accepted' | 'rejected') => {
    try {
      await handleRequestAction(id, action);
      await refreshProfile();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-sage-800 mb-6">{t("nav_profile")}</h1>
      {/* Tab Navigation */}
      <div className="flex border-b border-sage-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "profile" ? "border-sage-600 text-sage-800" : "border-transparent text-sage-400 hover:text-sage-600"
            }`}
        >
          {t("settings_profile")}
        </button>
        <button
          onClick={() => setActiveTab("family")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${activeTab === "family" ? "border-sage-600 text-sage-800" : "border-transparent text-sage-400 hover:text-sage-600"
            }`}
        >
          {t("settings_family")}
          {requests.length > 0 && userRole === 'admin' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${activeTab === "add" ? "border-sage-600 text-sage-800" : "border-transparent text-sage-400 hover:text-sage-600"
            }`}
        >
          {familyId ? (userRole === "admin" ? t("settings_add_member") : t("settings_invite_id")) : t("settings_join")}
          {invitations.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      <div className="card p-6">
        {activeTab === "profile" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-sm font-semibold text-sage-600 uppercase tracking-wider mb-2">{t("settings_my_profile")}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">{t("settings_your_name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                />
              </div>
              <button type="submit" className="btn-primary">
                {saved ? t("settings_saved") : t("settings_save_changes")}
              </button>
            </form>
          </div>
        )}

        {activeTab === "family" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {familyId ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-sage-600 uppercase tracking-wider">{t("settings_family_label")}: {familyName}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-sage-100 text-sage-600 rounded-full uppercase">{userRole}</span>
                </div>

                {/* Approvals Section for Admin */}
                {userRole === 'admin' && requests.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-100">
                    <h3 className="text-xs font-bold text-amber-800 uppercase mb-3">{t("settings_join_requests")}</h3>
                    <div className="space-y-3">
                      {requests.map((req: FamilyRequestRow) => (
                        <div key={req.id} className="flex items-center justify-between bg-white/50 p-2 rounded border border-amber-200">
                          <span className="text-xs font-medium text-amber-900">{req.email}</span>
                          <div className="flex gap-2">
                            <button onClick={() => onAction(req.id, 'accepted')} className="text-[10px] px-2 py-1 bg-green-600 text-white rounded font-bold uppercase transition-transform hover:scale-105 active:scale-95">{t("settings_approve")}</button>
                            <button onClick={() => onAction(req.id, 'rejected')} className="text-[10px] px-2 py-1 bg-white border border-amber-200 text-amber-600 rounded font-bold uppercase transition-transform hover:scale-105 active:scale-95">{t("settings_decline")}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="divide-y divide-sage-100">
                  {members.map((member) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center text-sage-600 font-bold text-xs">
                          {member.name?.[0] || "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-sage-800">{member.name || "User"}</div>
                          <div className="text-xs text-sage-500">{member.email}</div>
                        </div>
                      </div>
                      {member.role !== 'admin' && (userRole === "admin" || member.id === userId) && members.length > 1 && (
                        <button
                          onClick={async () => {
                            if (window.confirm(t("meal_remove_confirm"))) { // Reusing a confirm key or I should use a generic one
                              await removeMember(member.id);
                              await refreshProfile();
                            }
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          {t("settings_remove_member")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-sage-500">{t("settings_no_family_hint")}</p>
            )}
          </div>
        )}

        {activeTab === "add" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* INVITATIONS BOX */}
            {invitations.length > 0 && (
              <div className="bg-sage-600 text-white rounded-lg p-4 mb-4 shadow-lg shadow-sage-200 ring-2 ring-white ring-inset">
                <h3 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
                  <span className="text-lg">💌</span> {t("settings_invited_title")}
                </h3>
                <div className="space-y-3">
                  {invitations.map((inv: FamilyRequestRow) => (
                    <div key={inv.id} className="flex flex-col gap-2 p-3 bg-white/10 rounded-lg border border-white/20">
                      <p className="text-xs">{t("settings_invited_to_join")} <strong>{inv.families?.name}</strong></p>
                      <div className="flex gap-2">
                        <button onClick={() => onAction(inv.id, 'accepted')} className="flex-1 py-1.5 bg-white text-sage-800 rounded text-[10px] font-bold uppercase shadow-sm active:translate-y-0.5 transition-all">{t("settings_accept")}</button>
                        <button onClick={() => onAction(inv.id, 'rejected')} className="flex-1 py-1.5 bg-sage-700 text-white border border-sage-500 rounded text-[10px] font-bold uppercase active:translate-y-0.5 transition-all">{t("settings_ignore")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {familyId ? (
              <>
                <h2 className="text-sm font-semibold text-sage-600 uppercase tracking-wider mb-2">
                  {userRole === "admin" ? t("settings_invite_new") : t("settings_invite_id")}
                </h2>
                {userRole === "admin" ? (
                  <form onSubmit={handleInvite} className="space-y-3">
                    <p className="text-xs text-sage-500 mb-2">{t("settings_send_invite_hint")}</p>
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="input w-full"
                    />
                    <button type="submit" disabled={status === "sending"} className="btn-primary w-full">
                      {status === "sending" ? t("settings_sending_invite") : status === "success" ? t("settings_invite_sent") : t("settings_add_member")}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-sage-600">{t("settings_share_id_hint")}</p>
                    <code className="block p-2 bg-sage-50 rounded text-xs text-sage-600 select-all border border-sage-100">{familyId}</code>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleJoinRequest} className="space-y-3">
                <h2 className="text-sm font-semibold text-sage-600 uppercase tracking-wider mb-2">{t("settings_request_join")}</h2>
                <p className="text-xs text-sage-500">{t("settings_paste_id_hint")}</p>
                <input
                  type="text"
                  required
                  placeholder="Paste Family ID here"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="input w-full font-mono text-xs"
                />
                <button type="submit" disabled={status === "requesting"} className="btn-primary w-full">
                  {status === "requesting" ? t("settings_sending_request") : status === "success" ? t("settings_request_sent") : t("settings_request_join")}
                </button>
                {status === "success" && (
                  <p className="text-[10px] text-sage-500 text-center font-medium animate-in fade-in duration-500">
                    {t("settings_approval_hint")}
                  </p>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
