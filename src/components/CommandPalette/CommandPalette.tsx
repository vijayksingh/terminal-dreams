"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./CommandPalette.module.css";

export type CommandPalettePost = {
  slug: string;
  title: string;
  category?: string;
};

type CommandPaletteProps = {
  posts: CommandPalettePost[];
};

export default function CommandPalette({ posts }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pages = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "Archives", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Guestbook", href: "/guestbook" },
      { label: "Webring", href: "/webring" },
    ],
    []
  );

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Site search"
      overlayClassName={styles.overlay}
      contentClassName={styles.content}
    >
      <RadixDialog.Title className={styles.srOnly}>Site search</RadixDialog.Title>
      <div className={styles.inputWrap}>
        <Command.Input placeholder="Search pages and posts…" className={styles.input} />
      </div>
      <Command.List className={styles.list}>
        <Command.Empty className={styles.empty}>No results found.</Command.Empty>

        <Command.Group heading="Pages" className={styles.group}>
          {pages.map((p) => (
            <Command.Item
              key={p.href}
              value={`${p.label} ${p.href}`}
              onSelect={() => go(p.href)}
              className={styles.item}
            >
              <span className={styles.itemLabel}>{p.label}</span>
              <span className={styles.itemHint}>{p.href}</span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Posts" className={styles.group}>
          {posts.map((post) => (
            <Command.Item
              key={post.slug}
              value={`${post.title} ${post.slug} ${post.category ?? ""}`}
              onSelect={() => go(`/blog/${post.slug}`)}
              className={styles.item}
            >
              <span className={styles.itemLabel}>{post.title}</span>
              <span className={styles.itemHint}>/blog/{post.slug}</span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
      <div className={styles.hintRow}>
        <kbd className={styles.kbd}>⌘</kbd>
        <span className={styles.plus}>+</span>
        <kbd className={styles.kbd}>K</kbd>
        <span className={styles.hintText}>to toggle</span>
      </div>
    </Command.Dialog>
  );
}


