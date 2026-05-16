import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";
import { GuestbookForm } from "@/components/guestbook/GuestbookForm";
import { GuestbookList } from "@/components/guestbook/GuestbookList";

export const dynamic = "force-dynamic";

async function loadEntries(): Promise<
    { id: string; name: string; message: string; created: string }[]
> {
    // Server-side fetch -- the route handler reads via the superuser server
    // client, so we go through it rather than touching PB directly here
    // (keeps the surface area small and lets us add caching/filters in one
    // place later).
    try {
        const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
        const res = await fetch(`${base}/api/guestbook`, { cache: "no-store" });
        if (!res.ok) return [];
        const data = (await res.json()) as { entries?: unknown };
        return Array.isArray(data.entries)
            ? (data.entries as {
                  id: string;
                  name: string;
                  message: string;
                  created: string;
              }[])
            : [];
    } catch {
        return [];
    }
}

export default async function GuestbookPage() {
    const entries = await loadEntries();
    return (
        <div className={styles.container}>
            <BreadcrumbBar items={[{ label: "guestbook" }]} />
            <div className={styles.main}>
                <main>
                    <h1 className={styles.title}>Guestbook</h1>
                    <p className={styles.subtitle}>
                        {"// Drop a note. Be kind."}
                    </p>
                    <article className={styles.content}>
                        <GuestbookForm />
                        <GuestbookList initialEntries={entries} />
                    </article>
                </main>
            </div>
            <RetroFooter />
        </div>
    );
}
