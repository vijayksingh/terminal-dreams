This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## MDX Blogging

Author posts as MDX in `content/blog`. Example: `content/blog/sample-interactive.mdx` demonstrates code highlighting and an interactive React component.

- Frontmatter:
```
---
title: "Title"
date: "2025-09-01"
category: "Cyberspace"
summary: "Short summary"
tags: ["mdx", "nextjs"]
---
```

- Use React components in MDX. The post route maps `<InteractiveCounter />` as an allowed component.
- Code fences are highlighted via `rehype-pretty-code` (Shiki themes).

Routes:
- `/blog` lists posts
- `/blog/[slug]` renders a post

Home also shows the latest posts using the same renderer.

## Testing

```bash
npm run test
```

## TODO 
- [ ] Fix the file architecture to have the css and components in a folder so that they don't all go into same folder.
- [ ] Implement the timeline component for blogs posts
- [ ] Implement different styles of cards for the different blog types
  - [ ] Blog Card
  - [ ] TIL Card
  - [ ] Project Card
  - [ ] Notes Card
  - [ ] Essays 
- [ ] Implement the guestbook component
- [ ] Implement the webring component
- [ ] Implement the system status component
- [ ] Implement the recent posts component
- [ ] Implement the categories component
- [ ] Implement the stats grid component
