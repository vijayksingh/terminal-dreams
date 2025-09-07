"use client";

import styles from "./retro.module.css";

export function RetroHeader() {
  const items = ["Home", "Archives", "About", "Guestbook", "Webring"];
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <pre className={`${styles.ascii} ${styles.flickerAnimation}`}>{`╔═══════════════════════════════════════════════════════════════╗\n║  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗ ║\n║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║ ║\n║     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║ ║\n║     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║ ║\n║     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███╗║\n║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══╝║\n╚═══════════════════════════════════════════════════════════════╝`}</pre>
        <h1 className={`${styles.title} ${styles.glitchAnimation} ${styles.blinkCursor}`}>
          TERMINAL_DREAMS
        </h1>
        <p className={styles.subtitle}>{"// Nostalgic bytes from the digital underground"}</p>
        <nav style={{ marginTop: "2rem" }}>
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item}>
                <a
                  href={item === "Home" ? "/" : "#"}
                  className={styles.navLink}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLAnchorElement;
                    target.style.color = "#e0e0e0";
                    target.textContent = `[ ${item} ]`;
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLAnchorElement;
                    target.style.color = "#a0a0a0";
                    target.textContent = item;
                  }}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default RetroHeader;


