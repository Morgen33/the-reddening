# The Reddening

A living chronicle of how our friends became vampires. Authored by Veronika.

Birthday gift site — Next.js 15, Clerk (optional), Turso/local SQLite via Drizzle, Vercel Blob, Tiptap, react-three-fiber globe, d3 bloodline.

## Quick start

```bash
npm install
cp .env.example .env.local   # DEV_BYPASS_AUTH=true is fine locally
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Surfaces

| Route | What |
|---|---|
| `/` | The Chronicle |
| `/chapter/[slug]` | Chapter reading |
| `/write` | Scriptorium — Quill, Confession, Revenant |
| `/cast` | Dossiers |
| `/cast/[handle]` | Portrait slider + dossier |
| `/reddening` | 3D antique globe + century scrubber |
| `/bloodline` | SVG sire tree |

## Env

See `.env.example`. Locally the DB is `file:local.db`. For production set Turso, Clerk, Blob, and AI keys.
