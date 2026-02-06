import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { WeekCalendar } from "@/components/week/WeekCalendar";

export default async function WeekPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <WeekCalendar />
      </main>
    </>
  );
}
