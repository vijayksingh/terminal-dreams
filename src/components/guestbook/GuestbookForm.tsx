"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GuestbookForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/guestbook", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name, message }),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => ({}))) as {
                    error?: string;
                };
                throw new Error(data.error || `error ${res.status}`);
            }
            setName("");
            setMessage("");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            className="my-6 flex flex-col gap-3 rounded border border-app-border bg-surface p-4"
        >
            <label className="flex flex-col gap-1 text-sm">
                <span className="text-app-muted">name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    required
                    className="rounded border border-app-border bg-transparent px-3 py-2 font-mono text-app-text outline-none focus:border-app-accent"
                />
            </label>
            <label className="flex flex-col gap-1 text-sm">
                <span className="text-app-muted">message</span>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    required
                    rows={3}
                    className="resize-vertical rounded border border-app-border bg-transparent px-3 py-2 font-mono text-app-text outline-none focus:border-app-accent"
                />
            </label>
            {error && (
                <p className="text-sm text-red-400" role="alert">
                    {error}
                </p>
            )}
            <button
                type="submit"
                disabled={busy || !name.trim() || !message.trim()}
                className="self-start rounded border border-app-accent px-4 py-2 font-mono text-sm text-app-accent transition hover:bg-app-accent hover:text-app-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
                {busy ? "signing…" : "sign"}
            </button>
        </form>
    );
}
