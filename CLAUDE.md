# CLAUDE.md

Personal site (React 19 + Vite + Tailwind 4 + react-router), deployed to
GitHub Pages on push to `main`. See `README.md` for structure.

- Commands: `npm run dev` · `npm run build` · `npm run lint`
- Content lives in `src/data/*.ts` and `src/content/posts/*.md` — edit
  those, not the page components, to change text
- Post frontmatter is parsed by hand in `src/lib/posts.ts` (one
  `key: value` per line, split on the first `:`); new fields need a parser
  change
- Dark theme only; accent colour is Tailwind `emerald`
- Pin exact dependency versions in `package.json`
- Post images: WebP in `public/images/posts/<slug>/`
- Never push to `main` directly — feature branch + PR
