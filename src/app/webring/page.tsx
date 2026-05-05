import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";

export default function WebringPage() {
  return (
    <div className={styles.container}>
      <BreadcrumbBar items={[{ label: "webring" }]} />
      <div className={styles.main}>
        <main>
          <h1 className={styles.title}>Webring</h1>
          <p className={styles.subtitle}>{"// Placeholder — links soon"}</p>
          <article className={styles.content}>
            <p>Webring navigation will be available here soon.</p>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


