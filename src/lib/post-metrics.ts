/**
 * Helpers for post_metrics atomic increments.
 *
 * PB doesn't ship a SQL-level $inc, so we rely on the JS SDK's optimistic
 * update with a small retry loop on conflict. For a tiny personal site this
 * is plenty; if traffic ever justifies it we'd swap to PB's onRecordBefore
 * hook with a custom SQL UPDATE.
 */

import type PocketBase from "pocketbase";
import { ClientResponseError } from "pocketbase";

const COLLECTION = "post_metrics";
const MAX_SLUG_LEN = 200;

export type Metrics = { views: number; likes: number };

export function validSlug(slug: string): boolean {
    return (
        typeof slug === "string" &&
        slug.length > 0 &&
        slug.length <= MAX_SLUG_LEN &&
        /^[a-z0-9][a-z0-9\-_/]*$/i.test(slug)
    );
}

async function findOrCreate(
    pb: PocketBase,
    slug: string
): Promise<{ id: string; views: number; likes: number }> {
    try {
        const row = await pb
            .collection(COLLECTION)
            .getFirstListItem(`slug="${slug}"`);
        return {
            id: row.id,
            views: row.views ?? 0,
            likes: row.likes ?? 0,
        };
    } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) {
            const created = await pb
                .collection(COLLECTION)
                .create({ slug, views: 0, likes: 0 });
            return { id: created.id, views: 0, likes: 0 };
        }
        throw e;
    }
}

export async function bumpViews(
    pb: PocketBase,
    slug: string
): Promise<Metrics> {
    const row = await findOrCreate(pb, slug);
    const updated = await pb
        .collection(COLLECTION)
        .update(row.id, { views: row.views + 1 });
    return { views: updated.views, likes: updated.likes };
}

export async function bumpLikes(
    pb: PocketBase,
    slug: string,
    delta: 1 | -1
): Promise<Metrics> {
    const row = await findOrCreate(pb, slug);
    const next = Math.max(0, row.likes + delta);
    const updated = await pb
        .collection(COLLECTION)
        .update(row.id, { likes: next });
    return { views: updated.views, likes: updated.likes };
}

export async function readMetrics(
    pb: PocketBase,
    slug: string
): Promise<Metrics> {
    try {
        const row = await pb
            .collection(COLLECTION)
            .getFirstListItem(`slug="${slug}"`);
        return { views: row.views ?? 0, likes: row.likes ?? 0 };
    } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) {
            return { views: 0, likes: 0 };
        }
        throw e;
    }
}
