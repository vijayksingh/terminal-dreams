/**
 * View counter. POST bumps `views` once per visitor per slug.
 *
 * Idempotency: a per-slug cookie `td_v_<slug>` carries an HMAC of the slug;
 * if present we skip the increment and just return current counts. The cookie
 * is HttpOnly so the page can't fake it, and SameSite=Lax so it survives
 * normal navigation. Lifetime 30 days.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerClient } from "@/lib/pocketbase";
import {
    bumpViews,
    readMetrics,
    validSlug,
} from "@/lib/post-metrics";

export const dynamic = "force-dynamic";

function cookieName(slug: string): string {
    // Replace anything funky -- the slug already validated, but cookie names
    // are stricter than slugs.
    return `td_v_${slug.replace(/[^a-z0-9]/gi, "_")}`;
}

function signSlug(slug: string): string {
    const secret = process.env.SESSION_SECRET ?? "";
    return crypto
        .createHmac("sha256", secret)
        .update(slug)
        .digest("hex")
        .slice(0, 16);
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

    try {
        const pb = await getServerClient();
        if (cookie?.value === expected) {
            const metrics = await readMetrics(pb, slug);
            return NextResponse.json({ metrics, counted: false });
        }
        const metrics = await bumpViews(pb, slug);
        const res = NextResponse.json({ metrics, counted: true });
        res.cookies.set(cookieName(slug), expected, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        });
        return res;
    } catch (e) {
        console.error("view bump failed:", e);
        return NextResponse.json(
            { error: "metrics unavailable" },
            { status: 500 }
        );
    }
}
