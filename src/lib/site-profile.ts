/**
 * Reader for the site_profile key/value collection.
 *
 * Returns a flat map of keys -> string values. Unknown keys are not present;
 * callers should fall back to sensible defaults rather than treating the
 * response as exhaustive.
 */

import type PocketBase from "pocketbase";

const COLLECTION = "site_profile";

export type SiteProfile = Record<string, string>;

export async function readProfile(pb: PocketBase): Promise<SiteProfile> {
    const result = await pb
        .collection(COLLECTION)
        .getList(1, 200, { fields: "key,value" });
    const out: SiteProfile = {};
    for (const row of result.items) {
        if (typeof row.key === "string") {
            out[row.key] = typeof row.value === "string" ? row.value : "";
        }
    }
    return out;
}
