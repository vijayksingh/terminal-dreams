import Link from "next/link";
import { Breadcrumb } from "@/components/retro/Breadcrumb";
import RetroFooter from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Breadcrumb items={[{ label: "about" }]} />
          <h1 className={styles.title}>About</h1>
          <p className={styles.subtitle}>{"// Placeholder — more soon"}</p>
        </div>
      </header>
      <div className={styles.main}>
        <main>
          <article className={styles.content}>
            <p>Welcome to the About page. Content coming soon.</p>

            {/* This Guy Cooks Section */}
            <div className="mt-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 backdrop-blur-sm transition-all hover:border-[var(--color-accent)]/40 hover:shadow-lg">
              <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
                {/* Food illustration */}
                <div className="flex-shrink-0">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform hover:scale-110"
                  >
                    {/* Cooking pot */}
                    <circle cx="40" cy="45" r="20" fill="var(--color-accent)" opacity="0.2" />
                    <path
                      d="M25 40 L25 55 Q25 60 30 60 L50 60 Q55 60 55 55 L55 40 Z"
                      fill="var(--color-accent)"
                      opacity="0.8"
                    />
                    {/* Steam wisps */}
                    <path
                      d="M35 35 Q33 30 35 25"
                      stroke="var(--color-link)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <path
                      d="M40 33 Q38 28 40 23"
                      stroke="var(--color-link)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <path
                      d="M45 35 Q47 30 45 25"
                      stroke="var(--color-link)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    {/* Handle */}
                    <path
                      d="M20 45 Q18 45 18 43 L18 40 Q18 38 20 38"
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 className="mb-2 text-2xl font-bold text-[var(--color-accent)]">
                    this guy cooks
                  </h2>
                  <p className="mb-4 text-[var(--color-muted)]">
                    An interactive kitchen recipe playground with timers, step-by-step guidance, and
                    delightful micro-interactions. From chai to curries, explore recipes designed for the
                    joy of cooking.
                  </p>
                  <Link
                    href="/cookbook"
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--color-link)] hover:shadow-md"
                  >
                    <span>Explore the Cookbook</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 3L11 8L6 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


