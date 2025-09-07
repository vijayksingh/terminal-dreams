import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";

export default function WebringPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Webring</h1>
          <p className={styles.subtitle}>{"// Placeholder — links soon"}</p>
        </div>
      </header>
      <div className={styles.main}>
        <main>
          <article className={styles.content}>
            <p>Webring navigation will be available here soon.</p>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


