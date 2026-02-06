# Family Planner – Weekly Meal Planner

A multi-user weekly meal planner with shared shopping list and real-time sync. Built with **Next.js (App Router)**, **Supabase** (auth, Postgres, real-time), and **Tailwind CSS**.

## Features

- **Weekly calendar** – Current week (Mon–Sun), 5 meal slots per day: Mic Dejun, Lunch, Dinner, To-Go, Dessert
- **Recipe database** – Add recipes with ingredients and instructions; filter by meal type
- **Assign recipes to meals** – Search/filter recipes and assign to any day/meal slot
- **Auto shopping list** – Aggregated ingredients from planned recipes, summed by name+unit
- **Real-time checklist** – Check/uncheck items; all family members see updates instantly
- **Family accounts** – Email/password auth; optional family name on register (creates a family)

## Tech stack

- **Frontend:** React 18, Next.js 14 (App Router), Zustand, Tailwind CSS, date-fns
- **Backend:** Supabase (Auth, Realtime), **Prisma** (type-safe Postgres), same Supabase Postgres DB
- **Deployment:** Vercel-ready

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the schema from `supabase/schema.sql`.
3. In **Project Settings > API**, copy the project URL and anon key.
4. In **Project Settings > Database**, copy the connection strings (URI) for Session pooler and Direct connection.

### 3. Environment variables

Copy the example and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for auth and realtime.
- `DATABASE_URL` – see below (only this one is needed for Prisma).

**Prisma:** Use a **pooler** URL for `DATABASE_URL`, not the direct `db.xxx:5432` one (that often gives "Can't reach database server" or "Tenant or user not found").

- In the dashboard, click **Connect** (top of the project). If you see **Session** or **Transaction** connection strings, copy that URI into `DATABASE_URL`.
- If you only see a Direct URI, use the **Session pooler** format instead:
  ```
  postgresql://postgres.PROJECT_REF:YOUR_DB_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
  ```
  Replace **PROJECT_REF**, **YOUR_DB_PASSWORD**, and **REGION** (e.g. `us-east-1`).

All Prisma scripts (`db:generate`, `db:pull`, `db:push`, etc.) are wired to load **`.env.local`**, so keep `DATABASE_URL` there and run e.g. `npm run db:pull`. If you don’t have `.env.local` yet, copy it from `.env.local.example` before `npm install` (postinstall runs `prisma generate`).

Then generate the Prisma client:

```bash
npm run db:generate
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register with an email and optional family name to create a family.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/week` or `/login` |
| `/login` | Sign in |
| `/register` | Create account (optional family name) |
| `/week` | Weekly calendar and meal planning |
| `/recipes` | Browse and add recipes |
| `/shopping-list` | Auto-generated list; real-time checkoffs |
| `/settings` | Name and family info |

## Data model (conceptual)

- **families** – One per household; users have `family_id` on profile
- **profiles** – Extends Supabase auth (name, family_id, role)
- **recipes** – name, meal_type, ingredients (JSON), instructions; `family_id` null = global
- **week_plans** – One per family per week; `days` JSON array with meal slots
- **shopping_items** – One row per ingredient per week; `checked`, `checked_by` for real-time

Real-time is enabled on `shopping_items` so checklist changes sync to all clients.

## Future ideas

- Nutrition tracking, cost estimation, pantry inventory
- Voice input, AI recipe suggestions, meal repetition
- Export shopping list (PDF), invite/remove family members (admin)
