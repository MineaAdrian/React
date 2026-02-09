import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const supabase = await createClient();
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `recipe-photos/${fileName}`;

        const { data, error } = await supabase.storage
            .from("recipes")
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Supabase Storage Error:", error);
            return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from("recipes")
            .getPublicUrl(filePath);

        return NextResponse.json({ url: publicUrl });
    } catch (err: any) {
        console.error("Upload API Error:", err);
        return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
    }
}
