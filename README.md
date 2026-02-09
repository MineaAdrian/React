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