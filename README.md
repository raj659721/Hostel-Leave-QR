# Hostel Manager

This repository contains the Hostel Manager application (React + Vite frontend).

## Setup

1. Copy ` .env.example ` to ` .env ` at the project root:

```bash
cp .env.example .env
```

2. Open `.env` and set your Supabase credentials:

- `VITE_SUPABASE_URL` — your Supabase project URL (Project Settings → API → Project URL)
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key (Project Settings → API → anon public)

3. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

## Vercel deployment

- Application Preset: `Vite`
- Root Directory: `/`
- Build Command: `npm run build`
- Output Directory: `dist`

Set these environment variables in Vercel (Project Settings → Environment Variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Structure

- `client/` — React application source
- `server/` — backend server code (optional helpers)
- `supabase/` — database SQL, Edge Functions, migrations
- `dist/` — build output (generated)

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — build the application
- `npm run serve` — preview the build
- `npm run typecheck` — run TypeScript type checking
