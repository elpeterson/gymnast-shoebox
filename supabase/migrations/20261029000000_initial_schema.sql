-- Initial schema for Gymnast Shoebox: tables, row level security, and the
-- dashboard view. Previously lived in the README's "Database Setup" section.
--
-- New project: apply with `supabase db push` or paste into the SQL Editor.
-- Existing project (schema already created by hand): mark it applied instead,
--   supabase migration repair --status applied 20261029000000

-- 1. Create Tables
create table public.gymnasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  mso_id text, -- MeetScoresOnline Athlete ID
  discipline text default 'MAG' not null, -- 'MAG' or 'WAG'
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
  level text,      -- e.g. '4' (men's DP), 'Gold' (women's Xcel)
  division text,   -- e.g. '1'/'2', a track ('E'/'J'/'S'), or free text
  all_around_place integer,
  show_start_value boolean default false not null,
  show_place boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.scores (
  id uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  apparatus text not null,
  value numeric,       -- Nullable for future/incomplete meets
  start_value numeric, -- Optional difficulty score
  place integer,       -- Optional ranking
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint scores_competition_apparatus_unique unique (competition_id, apparatus)
);

create table public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  theme text default 'system' not null,
  show_start_values boolean default false not null,
  show_placements boolean default true not null,
  updated_at timestamptz default now() not null
);

-- 2. Enable Security (RLS)
alter table public.gymnasts enable row level security;
alter table public.competitions enable row level security;
alter table public.scores enable row level security;
alter table public.user_settings enable row level security;

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

-- User Settings
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);

-- 4. Create Helper View (The "API" for the dashboard)
create or replace view public.competitions_with_scores as
select
  c.id, c.user_id, c.gymnast_id, c.name, c.start_date, c.end_date, c.level,
  c.division, c.all_around_place, c.show_start_value, c.show_place, c.created_at,
  coalesce(
    (select json_agg(json_build_object('apparatus', s.apparatus, 'value', s.value, 'start_value', s.start_value, 'place', s.place)) from public.scores s where s.competition_id = c.id),
    '[]'::json
  ) as scores,
  (select sum(s.value) from public.scores s where s.competition_id = c.id) as all_around_score
from public.competitions c;

-- 5. Secure the View
alter view public.competitions_with_scores set (security_invoker = true);
grant select on public.competitions_with_scores to authenticated;
