import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { ShoppingList } from "@/components/shopping/ShoppingList";

export default async function ShoppingListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <>
            <Nav />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <ShoppingList />
            </main>
        </>
    );
}
