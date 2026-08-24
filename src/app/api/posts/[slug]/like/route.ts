/**
 * Like toggle. POST flips the per-visitor like state for a slug.
 *
 * The cookie `td_l_<slug>` holds the HMAC if the visitor has liked. Setting
 * it on first POST increments the counter; clearing it on second POST
 * decrements. No PB account required.
 *
 * GET returns current counts without mutating state.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerClient } from "@/lib/pocketbase";
import {
    bumpLikes,
    readMetrics,
    validSlug,
} from "@/lib/post-metrics";

export const dynamic = "force-dynamic";

function cookieName(slug: string): string {
    return `td_l_${slug.replace(/[^a-z0-9]/gi, "_")}`;
}

function signSlug(slug: string): string {
    const secret = process.env.SESSION_SECRET ?? "";
    return crypto
        .createHmac("sha256", secret)
        .update(`like:${slug}`)
        .digest("hex")
        .slice(0, 16);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    if (!validSlug(slug)) {
        return NextResponse.json({ error: "bad slug" }, { status: 400 });
    }
    try {
        const pb = await getServerClient();
        const metrics = await readMetrics(pb, slug);
        const liked =
            req.cookies.get(cookieName(slug))?.value === signSlug(slug);
        return NextResponse.json({ metrics, liked });
    } catch (e) {
        console.error("metrics read failed:", e);
        return NextResponse.json(
            { error: "metrics unavailable" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    if (!validSlug(slug)) {
        return NextResponse.json({ error: "bad slug" }, { status: 400 });
    }

    const cookie = req.cookies.get(cookieName(slug));
    const expected = signSlug(slug);
    const isLiked = cookie?.value === expected;

    try {
        const pb = await getServerClient();
        const metrics = await bumpLikes(pb, slug, isLiked ? -1 : 1);
        const res = NextResponse.json({ metrics, liked: !isLiked });
        if (isLiked) {
            res.cookies.delete(cookieName(slug));
        } else {
            res.cookies.set(cookieName(slug), expected, {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24 * 365,
                path: "/",
            });
        }
        return res;
    } catch (e) {
        console.error("like toggle failed:", e);
        return NextResponse.json(
            { error: "metrics unavailable" },
            { status: 500 }
        );
    }
}
