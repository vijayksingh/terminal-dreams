/**
 * GET /api/github/activity?days=91
 *
 * Returns a flat array of daily contribution counts for the last N days
 * (clamped to 1..365). The GitHub username comes from `site_profile`
 * (key `github_username`) or the GITHUB_USERNAME env var, or "vijayksingh"
 * as a final default.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/pocketbase";
import { readProfile } from "@/lib/site-profile";
import { fetchActivity } from "@/lib/github-activity";

export const revalidate = 3600;

const DEFAULT_USERNAME = "vijayksingh";
const DEFAULT_DAYS = 91; // 13 weeks
const MAX_DAYS = 365;

async function resolveUsername(): Promise<string> {
    if (process.env.GITHUB_USERNAME) return process.env.GITHUB_USERNAME;
    try {
        const pb = await getServerClient();
        const profile = await readProfile(pb);
        if (profile.github_username) return profile.github_username;
    } catch {
        /* fall through to default */
    }
    return DEFAULT_USERNAME;
}

export async function GET(req: NextRequest) {
    const rawDays = Number(req.nextUrl.searchParams.get("days") ?? DEFAULT_DAYS);
    const days = Number.isFinite(rawDays)
        ? Math.max(1, Math.min(MAX_DAYS, Math.floor(rawDays)))
        : DEFAULT_DAYS;

    const username = await resolveUsername();
    const activity = await fetchActivity(username, days);

    return NextResponse.json({ username, days, activity });
}
