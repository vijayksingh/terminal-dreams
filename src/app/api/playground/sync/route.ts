/**
 * Playground workspace sync.
 *
 * GET   /api/playground/sync       -> { workspace, recipes }
 * POST  /api/playground/sync       -> body { workspace, recipes } -> upserts
 *
 * Auth: requires the caller to send `Authorization: Bearer <pb_token>` where
 * pb_token is the JWT from `pb.collection('users').authWithPassword(...)`.
 * We don't proxy auth itself -- the browser hits PB directly for that, since
 * PB has good built-in rate limiting and we don't want to re-implement
 * password handling.
 *
 * Why route through Next instead of letting the browser write directly? Two
 * reasons: (1) keeps the PB URL off the public origin until we wire a real
 * domain, (2) we may want to layer extra validation (size caps already at
 * the PB schema level, but a Next-side allowlist on field shapes is useful
 * when we add Logto SSO later).
 */

import { NextRequest, NextResponse } from "next/server";
import PocketBase, { ClientResponseError } from "pocketbase";

export const dynamic = "force-dynamic";

const POCKETBASE_URL =
    process.env.POCKETBASE_URL ?? "http://pocketbase:8090";

const MAX_WORKSPACE_BYTES = 2_000_000;

async function clientFromAuth(
    req: NextRequest
): Promise<PocketBase | NextResponse> {
    const header = req.headers.get("authorization") ?? "";
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) {
        return NextResponse.json(
            { error: "missing bearer token" },
            { status: 401 }
        );
    }
    const pb = new PocketBase(POCKETBASE_URL);
    pb.authStore.save(m[1], null);
    try {
        // Refreshes + populates authStore.model
        await pb.collection("users").authRefresh();
    } catch {
        return NextResponse.json(
            { error: "invalid token" },
            { status: 401 }
        );
    }
    return pb;
}

export async function GET(req: NextRequest) {
    const pbOrErr = await clientFromAuth(req);
    if (pbOrErr instanceof NextResponse) return pbOrErr;
    const pb = pbOrErr;
    const userId = pb.authStore.record?.id;
    if (!userId) {
        return NextResponse.json({ error: "no user" }, { status: 401 });
    }

    try {
        const wsList = await pb
            .collection("playground_workspaces")
            .getFullList({ filter: `user="${userId}"` });
        const recipeList = await pb
            .collection("playground_recipes")
            .getFullList({ filter: `user="${userId}"` });
        return NextResponse.json({
            workspace: wsList[0]?.workspace ?? null,
            recipes: recipeList.map((r) => ({
                recipe_id: r.recipe_id,
                recipe: r.recipe,
            })),
        });
    } catch (e) {
        console.error("playground sync GET failed:", e);
        return NextResponse.json(
            { error: "sync unavailable" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const pbOrErr = await clientFromAuth(req);
    if (pbOrErr instanceof NextResponse) return pbOrErr;
    const pb = pbOrErr;
    const userId = pb.authStore.record?.id;
    if (!userId) {
        return NextResponse.json({ error: "no user" }, { status: 401 });
    }

    let body: {
        workspace?: unknown;
        recipes?: Array<{ recipe_id: string; recipe: unknown }>;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "invalid json" },
            { status: 400 }
        );
    }

    if (
        body.workspace &&
        JSON.stringify(body.workspace).length > MAX_WORKSPACE_BYTES
    ) {
        return NextResponse.json(
            { error: "workspace too large" },
            { status: 413 }
        );
    }

    try {
        if (body.workspace) {
            const existing = await pb
                .collection("playground_workspaces")
                .getFullList({ filter: `user="${userId}"` });
            if (existing.length) {
                await pb
                    .collection("playground_workspaces")
                    .update(existing[0].id, { workspace: body.workspace });
            } else {
                await pb
                    .collection("playground_workspaces")
                    .create({ user: userId, workspace: body.workspace });
            }
        }

        if (Array.isArray(body.recipes)) {
            for (const r of body.recipes) {
                if (typeof r.recipe_id !== "string") continue;
                const existing = await pb
                    .collection("playground_recipes")
                    .getFullList({
                        filter: `user="${userId}" && recipe_id="${r.recipe_id}"`,
                    });
                if (existing.length) {
                    await pb
                        .collection("playground_recipes")
                        .update(existing[0].id, { recipe: r.recipe });
                } else {
                    await pb.collection("playground_recipes").create({
                        user: userId,
                        recipe_id: r.recipe_id,
                        recipe: r.recipe,
                    });
                }
            }
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        if (e instanceof ClientResponseError) {
            return NextResponse.json(
                { error: e.message },
                { status: e.status || 500 }
            );
        }
        console.error("playground sync POST failed:", e);
        return NextResponse.json(
            { error: "sync failed" },
            { status: 500 }
        );
    }
}
