/**
 * Webring listing. Read-only -- entries are managed via the PB admin UI.
 *
 * GET /api/webring -> [{ label, url, description, position }]
 */

import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/pocketbase";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Re-fetch from PB at most once a minute.

export async function GET() {
    try {
        const pb = await getServerClient();
        const result = await pb
            .collection("webring_sites")
            .getList(1, 100, {
                sort: "+position,+label",
                fields: "id,label,url,description,position",
            });
        return NextResponse.json({ sites: result.items });
    } catch (e) {
        console.error("webring list failed:", e);
        return NextResponse.json(
            { error: "failed to load webring" },
            { status: 500 }
        );
    }
}
