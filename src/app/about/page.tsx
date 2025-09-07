import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>About</h1>
          <p className={styles.subtitle}>{"// Placeholder — more soon"}</p>
        </div>
      </header>
      <div className={styles.main}>
        <main>
          <article className={styles.content}>
            <p>Welcome to the About page. Content coming soon.</p>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


