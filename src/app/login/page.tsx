"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signIn(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-warm">
      <div className="w-full max-w-sm card p-8">
        <h1 className="text-2xl font-display font-semibold text-sage-800 mb-2">
          Family Planner
        </h1>
        <p className="text-sage-600 mb-6">Sign in to your family account</p>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              placeholder="you@example.com"
            />
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
              className="input"
            />
          </div>
          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-sage-600">
              Keep me signed in
            </label>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
          )}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-sage-600">
          No account?{" "}
          <Link href="/register" className="text-sage-600 underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
