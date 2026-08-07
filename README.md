# Personal website

Personal website — a minimal home page, project showcase, and blog, built
with React, Vite, Tailwind CSS, and react-router. Static, no backend.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run lint     # eslint
```

## Adding a blog post

1. Copy `src/content/posts/distil-act.md` to a new file in the same folder.
2. Edit the frontmatter (`title`, `date`, `slug`, `excerpt`, `project`).
3. Replace the Markdown body below the second `---`.

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
