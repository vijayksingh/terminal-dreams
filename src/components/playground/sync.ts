/**
 * Optional cross-device sync layer for the playground workspace + recipes.
 *
 * The browser keeps localStorage as the authoritative source while signed
 * out. When a PB user is signed in, we layer this thin sync on top:
 *
 *   - pullFromServer()   -- fetches workspace+recipes, hydrates localStorage
 *   - pushToServer()     -- uploads current localStorage state
 *
 * The component layer decides when to call these (e.g. on sign-in + every
 * 30s while focused). We deliberately don't auto-sync inside `storage.ts`
 * to keep that file zero-network and zero-auth (it'd break SSR + tests).
 */

import type {
    PlaygroundRecipe,
    PlaygroundWorkspace,
} from "@/components/playground/types";

const POCKETBASE_URL =
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "/_pb";
const SYNC_ENDPOINT = "/api/playground/sync";

type AuthToken = string;

export async function signInWithPassword(
    email: string,
    password: string
): Promise<AuthToken> {
    // Auth goes directly to PB -- the Next handler only proxies sync. PB's
    // built-in rate limit on identity attempts is sufficient.
    const res = await fetch(
        `${POCKETBASE_URL}/api/collections/users/auth-with-password`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ identity: email, password }),
        }
    );
    if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "sign-in failed");
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("no token in response");
    return data.token;
}

export async function pullFromServer(
    token: AuthToken
): Promise<{
    workspace: PlaygroundWorkspace | null;
    recipes: { recipe_id: string; recipe: PlaygroundRecipe }[];
}> {
    const res = await fetch(SYNC_ENDPOINT, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`pull failed: ${res.status}`);
    return (await res.json()) as {
        workspace: PlaygroundWorkspace | null;
        recipes: { recipe_id: string; recipe: PlaygroundRecipe }[];
    };
}

export async function pushToServer(
    token: AuthToken,
    payload: {
        workspace?: PlaygroundWorkspace;
        recipes?: { recipe_id: string; recipe: PlaygroundRecipe }[];
    }
): Promise<void> {
    const res = await fetch(SYNC_ENDPOINT, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`push failed: ${res.status}`);
}
