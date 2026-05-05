import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";

export default function GuestbookPage() {
  return (
    <div className={styles.container}>
      <BreadcrumbBar items={[{ label: "guestbook" }]} />
      <div className={styles.main}>
        <main>
          <h1 className={styles.title}>Guestbook</h1>
          <p className={styles.subtitle}>{"// Placeholder — sign soon"}</p>
          <article className={styles.content}>
            <p>Drop a note — guestbook will be live soon.</p>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


