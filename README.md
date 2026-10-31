# Personal website

Personal website — home page (publications, focus areas, projects) and a
blog, built with React, Vite, Tailwind CSS, and react-router. Static, no
backend.

## Structure

- `src/pages/` — `HomePage`, `BlogIndexPage`, `BlogPostPage`
- `src/components/Layout.tsx` — header, nav, footer, background
- `src/data/` — site content as typed arrays:
  - `profile.ts` — email and social links
  - `publications.ts` — publications list
  - `projects.ts` — project cards (`postSlug` links a card to its post)
- `src/content/posts/` — blog posts (Markdown + frontmatter)
- `public/images/posts/<slug>/` — post images (WebP)
- `src/index.css` — Tailwind theme: dark only, emerald accent, Geist /
  Geist Mono (self-hosted via `@fontsource-variable`)

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run lint     # eslint
```

## Adding a blog post

1. Copy `src/content/posts/distil-act.md` to a new file in the same folder.
2. Edit the frontmatter:
   - required: `title`, `date`, `slug`, `excerpt`
   - optional: `project` (GitHub repo name, linked in the post header),
     `venue` (badge for posts tied to a publication)
3. Replace the Markdown body below the second `---` (GFM tables supported).
4. Put images in `public/images/posts/<slug>/` as WebP
   (`cwebp -q 85 in.png -o out.webp`) and reference them as
   `/images/posts/<slug>/<name>.webp`.

The post is picked up automatically at build time (`src/lib/posts.ts` globs
every file in `src/content/posts/`) and appears on `/blog`, rendered at
`/blog/<slug>`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and deploys `dist/` to GitHub Pages via `actions/deploy-pages`. The repo's
Pages source must be set to "GitHub Actions" (Settings → Pages).

Routing uses clean URLs (`/blog/some-post`), which GitHub Pages doesn't
support natively for a client-side router. `public/404.html` and the inline
script in `index.html` implement the standard
[spa-github-pages](https://github.com/rafgraph/spa-github-pages) redirect so
deep links and refreshes work.
