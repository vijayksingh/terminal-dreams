/**
 * PocketBase client factories.
 *
 * Two clients live here:
 *   - getServerClient()  -- used only in Next route handlers / RSC, authenticated
 *                           as a superuser. Reused across requests via a module-
 *                           level cache; re-auths when the token is < 5min from
 *                           expiry.
 *   - getBrowserClient() -- unauthenticated, for components that listen to
 *                           realtime collections directly (currently unused
 *                           because all our writes go through Next handlers,
 *                           but exported for future read-only realtime feeds).
 */

import PocketBase from "pocketbase";

const POCKETBASE_URL =
    process.env.POCKETBASE_URL ?? "http://pocketbase:8090";
const POCKETBASE_PUBLIC_URL =
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "/_pb"; // proxied if ever needed

// Module-scoped server client. Next route handlers run in the same Node
// process, so we avoid re-handshaking on every request.
let serverClient: PocketBase | null = null;
let tokenExpiresAt = 0;

function decodeJwtExp(token: string): number {
    // PB tokens are JWTs. The exp claim is in seconds since epoch.
    try {
        const payload = token.split(".")[1];
        const json = JSON.parse(
            Buffer.from(payload, "base64").toString("utf8")
        );
        return typeof json.exp === "number" ? json.exp * 1000 : 0;
    } catch {
        return 0;
    }
}

export async function getServerClient(): Promise<PocketBase> {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (serverClient && tokenExpiresAt - now > fiveMinutes) {
        return serverClient;
    }

    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;
    if (!email || !password) {
        throw new Error(
            "POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD must be set"
        );
    }

    const client = new PocketBase(POCKETBASE_URL);
    // PB 0.23+ split superusers into a separate collection.
    const auth = await client
        .collection("_superusers")
        .authWithPassword(email, password);

    serverClient = client;
    tokenExpiresAt = decodeJwtExp(auth.token) || now + 30 * 60 * 1000;
    return client;
}

export function getBrowserClient(): PocketBase {
    // Singletons aren't safe across requests on the server, but on the browser
    // a single instance per tab is fine.
    return new PocketBase(POCKETBASE_PUBLIC_URL);
}

/**
 * Hash a (possibly null) IP address into an opaque token. We never store raw
 * IPs but want some abuse-tracking lever, so we keep a salted-then-hashed
 * value. Salt = SESSION_SECRET (already required for cookie signing).
 */
export async function hashIp(ip: string | null): Promise<string> {
    if (!ip) return "";
    const salt = process.env.SESSION_SECRET ?? "";
    const data = new TextEncoder().encode(`${salt}:${ip}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
