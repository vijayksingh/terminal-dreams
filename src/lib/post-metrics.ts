/**
 * Helpers for post_metrics atomic increments.
 *
 * PocketBase's number-field modifiers (`views+`, `likes+`, `likes-`)
 * perform increments in the database. Avoid read/modify/write here: two
 * simultaneous visits must not overwrite each other's counters.
 */

import type PocketBase from "pocketbase";

const COLLECTION = "post_metrics";
const MAX_SLUG_LEN = 200;

export type Metrics = { views: number; likes: number };

function hasStatus(error: unknown, status: number): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === status
    );
}

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
        if (hasStatus(e, 404)) {
            try {
                const created = await pb
                    .collection(COLLECTION)
                    .create({ slug, views: 0, likes: 0 });
                return { id: created.id, views: 0, likes: 0 };
            } catch (createError) {
                // A concurrent first visit may have won the unique-slug
                // insert. Read its row instead of failing this request.
                if (hasStatus(createError, 400)) {
                    const existing = await pb
                        .collection(COLLECTION)
                        .getFirstListItem(`slug="${slug}"`);
                    return {
                        id: existing.id,
                        views: existing.views ?? 0,
                        likes: existing.likes ?? 0,
                    };
                }
                throw createError;
            }
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
        .update(row.id, { "views+": 1 });
    return { views: updated.views, likes: updated.likes };
}

export async function bumpLikes(
    pb: PocketBase,
    slug: string,
    delta: 1 | -1
): Promise<Metrics> {
    const row = await findOrCreate(pb, slug);
    if (delta === -1 && row.likes <= 0) {
        return { views: row.views, likes: 0 };
    }
    const updated = await pb
        .collection(COLLECTION)
        .update(row.id, delta === 1 ? { "likes+": 1 } : { "likes-": 1 });
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
        if (hasStatus(e, 404)) {
            return { views: 0, likes: 0 };
        }
        throw e;
    }
}
