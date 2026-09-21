# SKYBONK

An experimental crypto meme website built as a cinematic 2D cartoon experience.

The intro follows a giant Bitcoin falling from space and bonking a very confused frog. The impact transitions into a memecoin-style landing page with cursor-reactive WebGL, an interactive navigation, responsive iPhone layouts, and a horizontally snapping lore timeline.

## Local development

```bash
pnpm install
pnpm exec vercel dev --listen 4174
```

Open `http://localhost:4174`.

## Structure

- `dist/index.html` — page structure and copy
- `dist/style.css` — responsive layout and visual system
- `dist/film.js` — cinematic intro
- `dist/universe.js` — interactive WebGL background and navigation behavior
- `dist/assets/` — original cartoon artwork

## Deployment

The repository includes `vercel.json` and serves the static `dist` directory.
