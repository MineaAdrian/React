"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { signUp, resendConfirmationEmail } from "@/app/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [familyMode, setFamilyMode] = useState<"join" | "create">("create");
  const [familyId, setFamilyId] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const isUuidValid = (uuid: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };

  const isSubmitDisabled = familyMode === "join" && !isUuidValid(familyId);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    const formDataEmail = formData.get("email") as string;
    setEmail(formDataEmail);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setMessage(result.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-warm">
      <div className="w-full max-w-md card p-8">
        <h1 className="text-2xl font-display font-semibold text-sage-800 mb-2">
          Create account
        </h1>
        <p className="text-sage-600 mb-6">Plan meals with your loved ones</p>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-sage-700 mb-1">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input w-full"
                placeholder="Alex"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input w-full"
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-sage-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input w-full"
            />
          </div>

          <div className="pt-4 border-t border-sage-100">
            <p className="text-sm font-semibold text-sage-800 mb-3">Family Options</p>
            <div className="flex gap-2 p-1 bg-sage-50 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setFamilyMode("create")}
                className={clsx(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  familyMode === "create"
                    ? "bg-white text-sage-800 shadow-sm"
                    : "text-sage-500 hover:text-sage-700"
                )}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => setFamilyMode("join")}
                className={clsx(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  familyMode === "join"
                    ? "bg-white text-sage-800 shadow-sm"
                    : "text-sage-500 hover:text-sage-700"
                )}
              >
                Join Existing
              </button>
            </div>

            {familyMode === "create" ? (
              <div key="create-mode" className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="familyName" className="block text-sm font-medium text-sage-700 mb-1">
                  Family Name
                </label>
                <input
                  id="familyName"
                  name="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required={familyMode === "create"}
                  className="input w-full"
                  placeholder="The Smiths"
                />
                <p className="text-xs text-sage-500 mt-2">
                  You will be the <strong>admin</strong> of this new family.
                </p>
              </div>
            ) : (
              <div key="join-mode" className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="familyId" className="block text-sm font-medium text-sage-700 mb-1">
                  Family ID
                </label>
                <input
                  id="familyId"
                  name="familyId"
                  type="text"
                  value={familyId || ""}
                  onChange={(e) => setFamilyId(e.target.value)}
                  required={familyMode === "join"}
                  className={clsx(
                    "input w-full",
                    (familyId || "") && !isUuidValid(familyId) && "border-red-300 focus:border-red-400 focus:ring-red-100"
                  )}
                  placeholder="Enter the UUID shared with you"
                />
                {(familyId || "") && !isUuidValid(familyId) && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1">
                    Invalid Family ID format
                  </p>
                )}
                <p className="text-xs text-sage-500 mt-2">
                  Ask your family admin for their <strong>Family ID</strong> in Settings.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 animate-in shake-1 underline-offset-4">{error}</p>
          )}

          {message ? (
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center animate-in fade-in zoom-in duration-500">
              <div className="text-2xl mb-2">✉️</div>
              <p className="text-sm font-medium text-green-800 mb-1">{message}</p>
              <p className="text-xs text-green-600">Once confirmed, you will be able to sign in.</p>
              <Link href="/login" className="btn-primary block w-full py-3 mt-4 text-sm font-semibold">
                Go to Login
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setResendStatus("sending");
                  if (email) {
                    const res = await resendConfirmationEmail(email);
                    if (res?.success) setResendStatus("sent");
                    else setResendStatus("error");
                  }
                }}
                disabled={resendStatus === "sending" || resendStatus === "sent"}
                className="text-xs text-sage-500 hover:text-sage-700 underline mt-4 transition-colors disabled:opacity-50 disabled:no-underline"
              >
                {resendStatus === "sending" ? "Sending..." : resendStatus === "sent" ? "Email resent!" : "Resend confirmation email"}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={clsx(
                "btn-primary w-full py-3 text-base font-semibold mt-2 transition-all",
                isSubmitDisabled && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              Create Account
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-sage-600">
          Already have an account?{" "}
          <Link href="/login" className="text-sage-800 underline font-semibold hover:text-sage-900">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

