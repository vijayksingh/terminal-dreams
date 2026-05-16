/**
 * Guestbook list + sign endpoints.
 *
 * GET  /api/guestbook         -> latest 100 entries, newest first
 * POST /api/guestbook         -> sign { name, message }
 *
 * Both routes are public. Writes are rate-limited per ip-hash (in-memory --
 * acceptable for a single-replica deployment; if we ever scale out we'll move
 * this into PB itself with a `created >= ${time}` query).
 */

import { NextRequest, NextResponse } from "next/server";
import { ClientResponseError } from "pocketbase";
import { getServerClient, hashIp } from "@/lib/pocketbase";

export const dynamic = "force-dynamic";

const MAX_NAME = 80;
const MAX_MESSAGE = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

// ip-hash -> [timestamps]. Trimmed lazily.
const recentSigns = new Map<string, number[]>();

function clientIp(req: NextRequest): string | null {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const real = req.headers.get("x-real-ip");
    return real || null;
}

function checkRate(key: string): boolean {
    const now = Date.now();
    const arr = (recentSigns.get(key) ?? []).filter(
        (t) => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (arr.length >= RATE_LIMIT_MAX) {
        recentSigns.set(key, arr);
        return false;
    }
    arr.push(now);
    recentSigns.set(key, arr);
    return true;
}

export async function GET() {
    try {
        const pb = await getServerClient();
        const result = await pb
            .collection("guestbook_entries")
            .getList(1, 100, {
                sort: "-created",
                // Filter unapproved out when we add moderation. For now,
                // approved is null which we treat as visible.
                filter: "approved != false",
                fields: "id,name,message,created",
            });
        return NextResponse.json({ entries: result.items });
    } catch (e) {
        console.error("guestbook list failed:", e);
        return NextResponse.json(
            { error: "failed to load guestbook" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    let body: { name?: unknown; message?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "invalid json" },
            { status: 400 }
        );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const message =
        typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !message) {
        return NextResponse.json(
            { error: "name and message required" },
            { status: 400 }
        );
    }
    if (name.length > MAX_NAME || message.length > MAX_MESSAGE) {
        return NextResponse.json({ error: "too long" }, { status: 400 });
    }

    const ipHash = await hashIp(clientIp(req));
    if (!checkRate(ipHash || "unknown")) {
        return NextResponse.json(
            { error: "too many requests" },
            { status: 429 }
        );
    }

    try {
        const pb = await getServerClient();
        const record = await pb
            .collection("guestbook_entries")
            .create({ name, message, ip_hash: ipHash, approved: true });
        return NextResponse.json({
            entry: {
                id: record.id,
                name: record.name,
                message: record.message,
                created: record.created,
            },
        });
    } catch (e) {
        if (e instanceof ClientResponseError) {
            return NextResponse.json(
                { error: e.message },
                { status: e.status || 500 }
            );
        }
        console.error("guestbook sign failed:", e);
        return NextResponse.json(
            { error: "failed to sign guestbook" },
            { status: 500 }
        );
    }
}
