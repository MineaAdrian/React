"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [familyMode, setFamilyMode] = useState<"join" | "create">("create");

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signUp(formData);
    if (result?.error) setError(result.error);
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
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="familyName" className="block text-sm font-medium text-sage-700 mb-1">
                  Family Name
                </label>
                <input
                  id="familyName"
                  name="familyName"
                  type="text"
                  required={familyMode === "create"}
                  className="input w-full"
                  placeholder="The Smiths"
                />
                <p className="text-xs text-sage-500 mt-2">
                  You will be the <strong>admin</strong> of this new family.
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="familyId" className="block text-sm font-medium text-sage-700 mb-1">
                  Family ID
                </label>
                <input
                  id="familyId"
                  name="familyId"
                  type="text"
                  required={familyMode === "join"}
                  className="input w-full"
                  placeholder="Enter the UUID shared with you"
                />
                <p className="text-xs text-sage-500 mt-2">
                  Ask your family admin for their <strong>Family ID</strong> in Settings.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 animate-in shake-1 underline-offset-4">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full py-3 text-base font-semibold mt-2">
            Create Account
          </button>
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

function clsx(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
