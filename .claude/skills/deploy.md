# Deploy to Vercel

Deploy the vitals dashboard to Vercel (static build with Vercel adapter).

## When to use
User says: "deploy", "ship it", "push to prod", "deploy to Vercel".

## Steps

1. **Verify build works locally**
   ```bash
   npm run build
   ```
   Expected: `dist/` and `.vercel/output/` created successfully.

2. **Check no health data in build**
   ```bash
   npm run build && grep -r "health.db\|export.xml" dist/ 2>/dev/null
   ```
   Should return nothing (both gitignored).

3. **Commit changes** (if any)
   ```bash
   git add . && git commit -m "feat: ready for deployment"
   ```

4. **Push to GitHub**
   ```bash
   git push origin main
   ```

5. **Deploy via Vercel CLI** (if authenticated)
   ```bash
   vercel --prod
   ```
   Or connect repo at https://vercel.com/new → select `savyasachi16/vitals`

## Vercel settings
- Framework preset: Astro
- Build command: `npm run build`
- Output dir: `.vercel/output` (auto-detected via `@astrojs/vercel`)
- Node.js version: 20.x (set in Vercel dashboard if needed)

## Gotchas
- Dev vs build: `npm run dev` uses Astro dev server, `npm run build` uses Vercel adapter
- Static JSON files in `public/` are included in build automatically
- `health.db` is NOT in build (gitignored) — dashboard uses pre-generated JSON
