import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Expose git commit + branch as build-time public env vars so the homepage
// "about" card can show the deployed revision. Resolution order:
//   1. NEXT_PUBLIC_GIT_COMMIT / NEXT_PUBLIC_GIT_BRANCH already in env
//      (set by infra/deploy.sh in the Docker build).
//   2. Shell out to git (works for `npm run dev` on a developer checkout).
//   3. Empty string. RetroAboutCard falls back to placeholder text.
function safeGit(args: string): string {
    try {
        return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .trim();
    } catch {
        return "";
    }
}

const gitCommit =
    process.env.NEXT_PUBLIC_GIT_COMMIT || safeGit("rev-parse --short HEAD");
const gitBranch =
    process.env.NEXT_PUBLIC_GIT_BRANCH || safeGit("rev-parse --abbrev-ref HEAD");

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_GIT_COMMIT: gitCommit,
        NEXT_PUBLIC_GIT_BRANCH: gitBranch,
    },
};

export default nextConfig;
