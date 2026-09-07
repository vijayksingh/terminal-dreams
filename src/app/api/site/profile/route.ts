/**
 * GET /api/site/profile -> flat key/value map sourced from the `site_profile`
 * PB collection. Used by the homepage about card. Defaults live on the
 * client side, so a 500 here is non-fatal -- the card still renders.
 */

import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/pocketbase";
import { readProfile } from "@/lib/site-profile";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
    try {
        const pb = await getServerClient();
        const profile = await readProfile(pb);
        return NextResponse.json({ profile });
    } catch (e) {
        console.error("site profile read failed:", e);
        return NextResponse.json(
            { error: "profile unavailable" },
            { status: 500 }
        );
    }
}
