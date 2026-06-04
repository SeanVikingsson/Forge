# ⚡ Forge — Fitness OS

Personal fitness tracking app with AI-powered meal parsing, workout logging, progress tracking, and recipe generation.

**Stack:** Next.js 15 · Supabase · Gemini 2.0 Flash · Recharts · Vercel

---

## Features

- **Dashboard** — daily macro rings, muscle heatmap, weight trend, AI workout of the day
- **Meal Tracker** — natural language input parsed by Gemini into full macro breakdown
- **Workout Logger** — exercise library, set/rep/weight logging, session history
- **Recipes** — AI-generated high-protein recipes tailored to remaining daily macros
- **Progress** — weight trend chart, training volume, body measurements
- **Profile** — TDEE calculator, macro targets, dietary preferences fed into all AI features

---

## Setup

### 1. Clone and install

```powershell
git clone https://github.com/YOUR_USERNAME/forge.git; cd forge; npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL editor, run the full contents of `supabase-schema.sql`
3. Copy your project URL and keys from Settings → API

### 3. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_DAILY_LIMIT=50
```

Get your Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 4. Run locally

```powershell
npm run dev
```

### 5. Deploy to Vercel

```powershell
git init; git add .; git commit -m "Initial commit"; git remote add origin https://github.com/YOUR_USERNAME/forge.git; git push -u origin main
```

Then connect the repo in Vercel and add the same environment variables in Project → Settings → Environment Variables.

---

## Modules

| Route | Description |
|-------|-------------|
| `/dashboard` | Daily summary, macro rings, muscle heatmap, AI workout suggestion |
| `/meals` | Log meals via natural language, daily macro tracking |
| `/workouts` | Log sessions, exercise library, history |
| `/recipes` | AI recipe suggestions based on remaining macros |
| `/progress` | Weight chart, training volume, body measurements |
| `/profile` | Stats, TDEE, macro targets, dietary preferences |

---

## AI (Gemini)

All AI features use `gemini-2.0-flash` via server-side route handlers. A daily per-user request cap is enforced via the `gemini_usage` Supabase table. Default cap: 50 requests/day (configurable via `GEMINI_DAILY_LIMIT`).

AI endpoints:
- `POST /api/ai/parse-meal` — parses natural language meal to macros
- `POST /api/ai/workout-recommendation` — generates workout based on training history
- `POST /api/ai/recipe-suggest` — generates high-protein recipes
