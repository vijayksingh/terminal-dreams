/**
 * Helpers for site_metrics atomic counters.
 *
 * Mirrors post-metrics.ts but with a single `key` axis (e.g. "visitors")
 * instead of per-slug. PB has no native $inc, so we read-then-write through
 * the SDK; for a personal site the contention is negligible.
 */

import type PocketBase from "pocketbase";
import { ClientResponseError } from "pocketbase";

const COLLECTION = "site_metrics";
const MAX_KEY_LEN = 80;

export function validKey(key: string): boolean {
    return (
        typeof key === "string" &&
        key.length > 0 &&
        key.length <= MAX_KEY_LEN &&
        /^[a-z][a-z0-9_]*$/i.test(key)
    );
}

async function findOrCreate(
    pb: PocketBase,
    key: string
): Promise<{ id: string; value: number }> {
    try {
        const row = await pb
            .collection(COLLECTION)
            .getFirstListItem(`key="${key}"`);
        return { id: row.id, value: row.value ?? 0 };
    } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) {
            const created = await pb
                .collection(COLLECTION)
                .create({ key, value: 0 });
            return { id: created.id, value: 0 };
        }
        throw e;
    }
}

export async function bumpCounter(
    pb: PocketBase,
    key: string
): Promise<number> {
    const row = await findOrCreate(pb, key);
    const updated = await pb
        .collection(COLLECTION)
        .update(row.id, { value: row.value + 1 });
    return updated.value;
}

export async function readCounter(
    pb: PocketBase,
    key: string
): Promise<number> {
    try {
        const row = await pb
            .collection(COLLECTION)
            .getFirstListItem(`key="${key}"`);
        return row.value ?? 0;
    } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) {
            return 0;
        }
        throw e;
    }
}
