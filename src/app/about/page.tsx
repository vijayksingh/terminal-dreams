import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <BreadcrumbBar items={[{ label: "about" }]} />
      <div className={styles.main}>
        <main>
          <h1 className={styles.title}>About</h1>
          <p className={styles.subtitle}>{"// Placeholder — more soon"}</p>
          <article className={styles.content}>
            <p>Welcome to the About page. Content coming soon.</p>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}
