"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "@/app/actions/auth";
import { clsx } from "clsx";
import { useTranslation } from "@/hooks/useTranslation";

export function Nav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  const links = [
    { href: "/week", label: t("nav_menu") },
    { href: "/recipes", label: t("nav_recipes") },
    { href: "/shopping-list", label: t("nav_shopping") },
    { href: "/settings", label: t("nav_profile") },
  ];

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="sticky top-0 z-20 border-b border-sage-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 py-2 md:flex-nowrap md:py-3">
        {/* Row 1: Logo & Auth */}
        <div className="flex w-full items-center justify-between md:w-auto">
          <Link href="/week" className="font-display text-lg font-semibold text-sage-800">
            Family Planner
          </Link>
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex bg-sage-50 rounded-lg p-0.5 border border-sage-100">
              <button
                onClick={() => setLanguage("en")}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded",
                  language === "en" ? "bg-white shadow-sm text-sage-800" : "text-sage-400"
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("ro")}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded",
                  language === "ro" ? "bg-white shadow-sm text-sage-800" : "text-sage-400"
                )}
              >
                RO
              </button>
            </div>
            <form action={signOut}>
              <button type="submit" className="text-sm font-medium text-sage-600 hover:text-sage-800">
                {t("nav_signout")}
              </button>
            </form>
          </div>
        </div>

        {/* Row 2 (Mobile) / Row 1 (Desktop): Navigation Links */}
        <div className="mt-2 flex w-full items-center justify-center gap-1 overflow-x-auto pb-1 scrollbar-hide md:mt-0 md:justify-start md:w-auto md:overflow-visible md:pb-0">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-sage-100 text-sage-800"
                  : "text-sage-600 hover:bg-sage-50 hover:text-sage-800"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop only: Profile and Sign out */}
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex bg-sage-50 rounded-xl p-1 border border-sage-100">
            <button
              onClick={() => setLanguage("en")}
              className={clsx(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                language === "en" ? "bg-white shadow-md text-sage-800" : "text-sage-400 hover:text-sage-600"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("ro")}
              className={clsx(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                language === "ro" ? "bg-white shadow-md text-sage-800" : "text-sage-400 hover:text-sage-600"
              )}
            >
              RO
            </button>
          </div>
          <span className="text-sm text-sage-600">{profile?.name || profile?.email}</span>
          <form action={signOut}>
            <button type="submit" className="btn-ghost text-sm">
              {t("nav_signout")}
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
