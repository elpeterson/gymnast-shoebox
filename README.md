# Gymnast Shoebox

[![License](https://img.shields.io/badge/license-MIT-blueviolet?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/github/v/release/elpeterson/gymnast-shoebox?style=flat-square&label=version)](https://github.com/elpeterson/gymnast-shoebox/releases)

> **"Never lose a score again."**

Gymnast Shoebox is a modern, mobile-first SaaS application designed to solve the data fragmentation problem in youth gymnastics.

## 🚀 Features
*   **Multi-Gymnast Support:** Track scores for multiple children (siblings) under one parent account.
*   **MeetScoresOnline Integration:** Automatically import meet details and scores using an MSO Athlete ID.
*   **Live Meet Entry:** Enter scores as they happen. Supports incomplete meets and future schedule planning.
*   **Detailed Scoring:** Track Final Score, Placement, and Start Values.
*   **Deep Customization:** Toggle fields (like Start Value) to declutter the UI on small screens.
*   **Themeable:** Dark Mode support with custom "Sterling Gym" branding.
*   **Secure:** Row Level Security (RLS) ensures data privacy.

## 🚧 Coming Soon
-   **Women's Gymnastics Support:** Support for uneven bars and beam.
-   **Offline Support:** PWA capabilities for warehouses with poor signal.
-   **Data Visualizations:** Charts to track progress over the season.
-   **Media Uploads:** Attach photos of scorecards or screenshots to meets.

## 🐛 Known Issues
-   Dark mode preference is currently stored per-device (local storage), not synced to the user profile.
-   The "All-Around Placement" field is currently missing from the manual entry form (though it imports correctly from MSO).

## 📖 The Problem
For parents of competitive gymnasts, tracking progress is a nightmare of fragmentation. 
- **The "Official" App:** MyUSAGym is unreliable, often crashes during meets, and has poor support for non-iOS devices.
- **The Fragmentation:** Meets are split across ScoreCat, MyMeetScoresOnline, and paper printouts.
- **The Data Loss:** There is no single, reliable "source of truth" for a gymnast's history over the years.

## 💡 The Solution
Gymnast Shoebox is exactly what it sounds like: a permanent digital container for competition results. It doesn't care which scoring system the meet used. It places the power back in the parent's hands to own their child's data.

**Core Philosophy:**
1.  **Mobile First:** Built for the parent sitting in the bleachers.
2.  **Data Ownership:** You enter it, you keep it. Forever.
3.  **Simplicity:** No social feeds, no ads, just scores.

## 🛠 Tech Stack
This project utilizes a modern, serverless architecture designed for high performance and low maintenance.

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Deployment:** [Vercel](https://vercel.com/)


## 💻 Local Development

### 1. Clone & Install
```bash
git clone https://github.com/elpeterson/gymnast-shoebox.git
cd gymnast-shoebox
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Database Setup (Supabase)
Run the following SQL script in your Supabase SQL Editor. This single script creates the complete schema, relationships, security policies, and views required for the application.

```sql
-- 1. Create Tables
create table public.gymnasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  mso_id text, -- MeetScoresOnline Athlete ID
  gender text default 'male',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.competitions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  gymnast_id uuid references public.gymnasts(id) on delete cascade not null,
  name text not null,
  start_date date,
  end_date date,
  level text,
  all_around_place integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.scores (
  id uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  apparatus text not null,
  value numeric,      -- Nullable for future/incomplete meets
  start_value numeric, -- Optional difficulty score
  place integer,      -- Optional ranking
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Enable Security (RLS)
alter table public.gymnasts enable row level security;
alter table public.competitions enable row level security;
alter table public.scores enable row level security;

-- 3. Create RLS Policies (CRUD)
-- Gymnasts
create policy "Users can view own gymnasts" on public.gymnasts for select using (auth.uid() = user_id);
create policy "Users can insert own gymnasts" on public.gymnasts for insert with check (auth.uid() = user_id);
create policy "Users can update own gymnasts" on public.gymnasts for update using (auth.uid() = user_id);
create policy "Users can delete own gymnasts" on public.gymnasts for delete using (auth.uid() = user_id);

-- Competitions
create policy "Users can view own competitions" on public.competitions for select using (auth.uid() = user_id);
create policy "Users can insert own competitions" on public.competitions for insert with check (auth.uid() = user_id);
create policy "Users can update own competitions" on public.competitions for update using (auth.uid() = user_id);
create policy "Users can delete own competitions" on public.competitions for delete using (auth.uid() = user_id);

-- Scores (checked via parent competition)
create policy "Users can view own scores" on public.scores for select using (exists (select 1 from public.competitions where competitions.id = scores.competition_id and competitions.user_id = auth.uid()));
create policy "Users can insert own scores" on public.scores for insert with check (exists (select 1 from public.competitions where competitions.id = scores.competition_id and competitions.user_id = auth.uid()));
create policy "Users can update own scores" on public.scores for update using (exists (select 1 from public.competitions where competitions.id = scores.competition_id and competitions.user_id = auth.uid()));
create policy "Users can delete own scores" on public.scores for delete using (exists (select 1 from public.competitions where competitions.id = scores.competition_id and competitions.user_id = auth.uid()));

-- 4. Create Helper View (The "API" for the dashboard)
create or replace view public.competitions_with_scores as
select
  c.id, c.user_id, c.gymnast_id, c.name, c.start_date, c.end_date, c.level, c.all_around_place, c.created_at,
  coalesce(
    (select json_agg(json_build_object('apparatus', s.apparatus, 'value', s.value, 'start_value', s.start_value, 'place', s.place)) from public.scores s where s.competition_id = c.id),
    '[]'::json
  ) as scores,
  (select sum(s.value) from public.scores s where s.competition_id = c.id) as all_around_score
from public.competitions c;

-- 5. Secure the View
alter view public.competitions_with_scores set (security_invoker = true);
grant select on public.competitions_with_scores to authenticated;
```

### 4. Run the Server
```bash
npm run dev
```