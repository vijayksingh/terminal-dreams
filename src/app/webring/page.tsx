import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";
import { WebringList, WebringSite } from "@/components/webring/WebringList";

export const dynamic = "force-dynamic";

async function loadSites(): Promise<WebringSite[]> {
    try {
        const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
        const res = await fetch(`${base}/api/webring`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { sites?: WebringSite[] };
        return Array.isArray(data.sites) ? data.sites : [];
    } catch {
        return [];
    }
}

export default async function WebringPage() {
    const sites = await loadSites();
    return (
        <div className={styles.container}>
            <BreadcrumbBar items={[{ label: "webring" }]} />
            <div className={styles.main}>
                <main>
                    <h1 className={styles.title}>Webring</h1>
                    <p className={styles.subtitle}>
                        {"// neighbours in the digital underground"}
                    </p>
                    <article className={styles.content}>
                        <WebringList sites={sites} />
                    </article>
                </main>
            </div>
            <RetroFooter />
        </div>
    );
}
