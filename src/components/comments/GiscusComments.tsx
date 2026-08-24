"use client";

import Giscus from "@giscus/react";
import { useEffect, useState } from "react";

type GiscusTheme = "light" | "transparent_dark";

function readTheme(): GiscusTheme {
    return document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "transparent_dark";
}

export function GiscusComments({ slug }: { slug: string }) {
    const [theme, setTheme] = useState<GiscusTheme>("transparent_dark");

    useEffect(() => {
        setTheme(readTheme());
        const observer = new MutationObserver(() => setTheme(readTheme()));
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });
        return () => observer.disconnect();
    }, []);

    return (
        <section className="mt-16 border-t border-app-border pt-8" aria-labelledby="comments-heading">
            <h2
                id="comments-heading"
                className="mb-2 font-mono text-xl font-semibold text-app-text"
            >
                Comments
            </h2>
            <p className="mb-6 font-mono text-sm text-app-muted">
                Join the discussion with your GitHub account.
            </p>
            <Giscus
                id="post-comments"
                repo="vijayksingh/terminal-dreams"
                repoId="R_kgDOR9v6MQ"
                category="General"
                categoryId="DIC_kwDOR9v6Mc4DEE4a"
                mapping="specific"
                term={`blog/${slug}`}
                strict="1"
                reactionsEnabled="1"
                emitMetadata="0"
                inputPosition="top"
                theme={theme}
                lang="en"
                loading="lazy"
            />
        </section>
    );
}
