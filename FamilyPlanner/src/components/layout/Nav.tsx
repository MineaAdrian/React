"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "@/app/actions/auth";
import { clsx } from "clsx";

const links = [
  { href: "/week", label: "Week Menu" },
  { href: "/recipes", label: "Recipes" },
  { href: "/settings", label: "Settings" },
  { href: "/shopping-list", label: "Shopping List" },
];

export function Nav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="sticky top-0 z-20 border-b border-sage-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/week" className="font-display text-lg font-semibold text-sage-800">
          Family Planner
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:overflow-visible scrollbar-hide">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                pathname === href
                  ? "bg-sage-100 text-sage-800"
                  : "text-sage-600 hover:bg-sage-50 hover:text-sage-800"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-sage-600">{profile?.name || profile?.email}</span>
          <form action={signOut}>
            <button type="submit" className="btn-ghost text-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
