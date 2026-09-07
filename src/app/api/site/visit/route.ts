/**
 * Visitor counter. POST bumps the site-wide `visitors` counter at most once
 * per visitor (cookie idempotency, 30-day lifetime). Same pattern as the
 * per-post view route — see src/app/api/posts/[slug]/view/route.ts.
 *
 * GET returns the current count without mutating state.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerClient } from "@/lib/pocketbase";
import { bumpCounter, readCounter } from "@/lib/site-metrics";

export const dynamic = "force-dynamic";

const COOKIE = "td_visited";
const KEY = "visitors";

function signatureForKey(): string {
    const secret = process.env.SESSION_SECRET ?? "";
    return crypto
        .createHmac("sha256", secret)
        .update(KEY)
        .digest("hex")
        .slice(0, 16);
}

export async function POST(req: NextRequest) {
    const cookie = req.cookies.get(COOKIE);
    const expected = signatureForKey();

    try {
        const pb = await getServerClient();
        if (cookie?.value === expected) {
            const value = await readCounter(pb, KEY);
            return NextResponse.json({ visitors: value, counted: false });
        }
        const value = await bumpCounter(pb, KEY);
        const res = NextResponse.json({ visitors: value, counted: true });
        res.cookies.set(COOKIE, expected, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        });
        return res;
    } catch (e) {
        console.error("visit bump failed:", e);
        return NextResponse.json(
            { error: "metrics unavailable" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const pb = await getServerClient();
        const value = await readCounter(pb, KEY);
        return NextResponse.json({ visitors: value });
    } catch (e) {
        console.error("visit read failed:", e);
        return NextResponse.json(
            { error: "metrics unavailable" },
            { status: 500 }
        );
    }
}
