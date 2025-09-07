"use client";

import styles from "./retro.module.css";

export function RetroHeader() {
  const items = [
    { label: "Home", href: "/" },
    { label: "Archives", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Guestbook", href: "/guestbook" },
    { label: "Webring", href: "/webring" },
  ];
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <pre className={`${styles.ascii} ${styles.flickerAnimation}`}>{`╔═══════════════════════════════════════════════════════════════╗\n║  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗ ║\n║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║ ║\n║     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║ ║\n║     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║ ║\n║     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███╗║\n║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══╝║\n╚═══════════════════════════════════════════════════════════════╝`}</pre>
        <h1 className={`${styles.title} ${styles.glitchAnimation} ${styles.blinkCursor}`}>
          TERMINAL_DREAMS
        </h1>
        <p className={styles.subtitle}>{"// Nostalgic bytes from the digital underground"}</p>
        <nav style={{ marginTop: "var(--space-6)" }}>
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={styles.navLink}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLAnchorElement;
                    target.textContent = `[ ${item.label} ]`;
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLAnchorElement;
                    target.textContent = item.label;
                  }}
                >
                  {item.label}
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


