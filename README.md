# Terminal Dreams

> Nostalgic bytes from the digital underground.

A personal blog, cookbook, and interactive playground — built as a space to write, tinker, and share things I care about. Part portfolio, part workshop, part kitchen.

**Live:** [terminal-dreams](https://github.com/vijayksingh/terminal-dreams)

---

## What's Inside

### Blog
Long-form writing rendered from MDX with syntax highlighting (Shiki), interactive components, and embedded code playgrounds. Posts live in `content/blog/` and support React components inline.

### Playground
A browser-native React/TypeScript IDE — no backend required. Babel transpiles in the browser, imports resolve via import maps and blob URLs, and a multi-file editor (Monaco) with live preview lets you prototype ideas without leaving the site.

### Cookbook
25+ Indian and Southeast Asian recipes with an interactive step-by-step player. Features include:
- Timers with sound effects and circular progress rings
- Ingredient checklists with completion tracking
- Step-by-step navigation with ambient canvas effects
- A small celebration when you finish cooking

Categories: Curries, Street Food, Drinks, Sweets, Quick Meals.

### Recipe Walkthroughs
Scroll-driven code tutorials that pair explanation with a live playground. A different kind of recipe — for building UI.

---

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** + shadcn/ui components
- **MDX** via next-mdx-remote
- **Monaco Editor** for code editing
- **Babel Standalone** for browser-native transpilation
- **Framer Motion** for animations
- **D3** for flowchart visualizations
- **Shiki / rehype-pretty-code** for syntax highlighting

---

## Aesthetic

Retro-terminal meets warm minimalism. Dark mode by default with a crosshair cursor, scanline overlays, and a cursor glow that follows your mouse. The palette is built around warm neutrals (`#0f0e0d`, `#e8e3d8`) with a copper accent (`#c9956b`). Light mode is available too.

Typography: Geist Sans, Geist Mono, JetBrains Mono, and Fraunces for display headings in the cookbook.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing

```bash
npm run test
```

---

## Project Structure

```
content/
  blog/          # MDX blog posts
  cookbook/       # Recipe data (JSON-style TS)
  recipes/       # Code walkthrough definitions
src/
  app/           # Next.js routes (blog, cookbook, playground, recipes)
  components/    # UI components, playground, cookbook player
  lib/           # Utilities, MDX pipeline, content loaders
  styles/        # Tailwind config, CSS modules
public/          # Static assets, sounds, images
```

---

## Roadmap

- [ ] File architecture cleanup — co-locate CSS and components
- [ ] Timeline component for blog posts
- [ ] Differentiated card styles per content type (Blog, TIL, Project, Notes, Essays)
- [ ] Guestbook
- [ ] Webring
- [ ] System status widget
- [ ] Sticky table of contents

---

## License

This is a personal project. Feel free to look around and take inspiration, but please don't clone it wholesale as your own.
