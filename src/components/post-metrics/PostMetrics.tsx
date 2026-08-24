"use client";

import { useCallback, useEffect, useState } from "react";

type Metrics = { views: number; likes: number };

/**
 * Renders view + like counts for a post and exposes a like-toggle button.
 *
 * On mount it fires POST /api/posts/<slug>/view -- the server decides whether
 * to actually increment based on the visitor's cookie. That gives us "view
 * count starts from real visits, not preview/SSR fetches" without needing a
 * separate beacon.
 */
export function PostMetrics({ slug }: { slug: string }) {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [liked, setLiked] = useState<boolean | null>(null);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [viewRes, likeRes] = await Promise.all([
                    fetch(`/api/posts/${encodeURIComponent(slug)}/view`, {
                        method: "POST",
                    }),
                    fetch(`/api/posts/${encodeURIComponent(slug)}/like`),
                ]);
                const viewData = (await viewRes.json().catch(() => ({}))) as {
                    metrics?: Metrics;
                };
                const likeData = (await likeRes.json().catch(() => ({}))) as {
                    metrics?: Metrics;
                    liked?: boolean;
                };
                if (cancelled) return;
                // Prefer the view response (it's strictly newer) but fall back
                // to like data if view 500s.
                setMetrics(viewData.metrics ?? likeData.metrics ?? null);
                setLiked(
                    typeof likeData.liked === "boolean"
                        ? likeData.liked
                        : false
                );
            } catch {
                /* silent */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const onLike = useCallback(async () => {
        if (pending) return;
        setPending(true);
        try {
            const res = await fetch(
                `/api/posts/${encodeURIComponent(slug)}/like`,
                { method: "POST" }
            );
            if (!res.ok) return;
            const data = (await res.json()) as {
                metrics?: Metrics;
                liked?: boolean;
            };
            if (data.metrics) setMetrics(data.metrics);
            if (typeof data.liked === "boolean") setLiked(data.liked);
        } finally {
            setPending(false);
        }
    }, [pending, slug]);

    return (
        <div className="my-4 flex items-center gap-4 text-sm text-app-muted">
            <span>
                {"// "}views{" "}
                <span className="text-app-text">
                    {metrics?.views ?? "—"}
                </span>
            </span>
            <button
                type="button"
                onClick={onLike}
                disabled={pending}
                aria-pressed={liked === true}
                className="flex items-center gap-1 rounded border border-app-border px-2 py-1 font-mono transition hover:border-app-accent hover:text-app-accent disabled:opacity-50"
            >
                <span aria-hidden>{liked === true ? "♥" : "♡"}</span>
                <span className="text-app-text">
                    {metrics?.likes ?? "—"}
                </span>
            </button>
        </div>
    );
}
