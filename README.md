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
    api/         # Route handlers: guestbook, webring, post-metrics, playground sync
  components/    # UI components, playground, cookbook player
  lib/           # Utilities, MDX pipeline, content loaders, PocketBase client
  styles/        # Tailwind config, CSS modules
public/          # Static assets, sounds, images
infra/
  pocketbase/    # PocketBase Dockerfile + JS migrations
  compose/       # Docker Swarm stack definition
  deploy.sh      # Build images + deploy to local swarm
```

---

## Persistence

User-generated state lives in [PocketBase](https://pocketbase.io). The PB
service runs alongside the Next app on the same Docker network and never
exposes a port to the public internet — the Next app authenticates as a
superuser via a server-side SDK and brokers all writes.

Collections (declared in `infra/pocketbase/pb_migrations/`):

| Collection | Purpose |
|---|---|
| `guestbook_entries` | Public sign-ins (name, message). Rate-limited per IP. |
| `webring_sites`     | Curated link ring. Managed via PB admin UI. |
| `post_metrics`      | Per-slug view + like counters. Cookie-based idempotency. |
| `playground_workspaces` | Per-user workspace JSON (auth required). |
| `playground_recipes`    | Per-user recipe JSON (auth required). |

The browser still uses `localStorage` for playground state by default;
PocketBase sync is opt-in via sign-in and lets the same workspace appear on
another device.

### Local dev with persistence

```bash
# 1. Start PocketBase locally (separate terminal)
docker build -t terminal-dreams-pocketbase:local infra/pocketbase
docker run -d --name td-pb -p 8090:8090 \
    -v td-pb-data:/pb/pb_data \
    terminal-dreams-pocketbase:local
docker exec td-pb pocketbase superuser upsert admin@local.test Password123! \
    --dir=/pb/pb_data

# 2. Point Next at it
cat > .env.local <<EOF
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@local.test
POCKETBASE_ADMIN_PASSWORD=Password123!
SESSION_SECRET=$(openssl rand -hex 16)
APP_BASE_URL=http://localhost:3000
EOF

npm run dev
```

### Production deploy (Docker Swarm)

The host must already have a `dokploy-network` external swarm network and a
Traefik instance attached to it (this is the platform-01 layout).

```bash
sudo ./infra/deploy.sh
```

The script builds both images, generates `secrets/app.env` on first run,
deploys the stack, and provisions the PB superuser. Verify with:

```bash
curl --resolve terminal-dreams.local:80:127.0.0.1 \
    http://terminal-dreams.local/
```

PocketBase's admin UI stays internal — reach it via an SSH tunnel:

```bash
ssh -L 8090:127.0.0.1:8090 admin@<host>
# then browse http://localhost:8090/_/
```

---

## Roadmap

- [ ] File architecture cleanup — co-locate CSS and components
- [ ] Timeline component for blog posts
- [ ] Differentiated card styles per content type (Blog, TIL, Project, Notes, Essays)
- [x] Guestbook
- [x] Webring
- [x] Post view/like counters
- [ ] System status widget
- [ ] Sticky table of contents
- [ ] Logto SSO for playground sync (currently uses PB-native auth)

---

## License

This is a personal project. Feel free to look around and take inspiration, but please don't clone it wholesale as your own.
