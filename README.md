# Gymnast Shoebox

[![License](https://img.shields.io/github/license/elpeterson/gymnast-shoebox?style=flat-square&color=blueviolet)](LICENSE)
[![Version](https://img.shields.io/github/v/release/elpeterson/gymnast-shoebox?style=flat-square&label=version)](https://github.com/elpeterson/gymnast-shoebox/releases)
> **"Never lose a score again."**

Gymnast Shoebox is a modern, mobile-first SaaS application designed to solve the data fragmentation problem in youth gymnastics.

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

## 🚀 Features & Roadmap

### Phase 1: The Shoebox (Released)
- [x] Secure User Authentication (Supabase Auth)
- [x] Normalized Database Schema (Scalable for future apparatus changes)
- [x] Historical Data Entry (Full meet entry)
- [x] Chronological Score History
- [x] Automatic "All-Around" Calculation

### Phase 2: The Live Meet (Released)
- [x] "Incomplete" Meet States (Enter scores live as they happen)
- [x] Level Tracking (Level 4, 5, etc.) to contextualize scores
- [x] Edit/Delete capabilities for data correction
- [x] Placement entering; Pommel 1st, Vault 4th, etc

### Phase 3: The Platform (Coming soon)
- [ ] Gymnast Profiles (Support for multiple children)
- [ ] Women's Gymnastics Support

### Bonus And/Or Requested Features
- [ ] Photo upload of physical scorecards
- [ ] Data Visualizations (Progress over time)
- [x] Dark Mode

### Known Issues (bugs)
- [ ] Dark mode not stored in user profile (per device only)
- [ ] All-Around Placement field missing from meet entry form

## 💻 Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/gymnast-shoebox.git
   cd gymnast-shoebox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url_here
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key_here
   ```

4. **Database Setup (Supabase)**
   Run the following SQL script in your Supabase SQL Editor to initialize the database, views, and security policies.

   ```sql
   -- 1. Create Tables
   create table public.competitions (
   id uuid default gen_random_uuid() primary key,
   user_id uuid references auth.users(id) on delete cascade not null,
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
   value numeric, -- Nullable for incomplete meets
   place integer,
   created_at timestamptz default now() not null,
   updated_at timestamptz default now() not null
   );

   -- 2. Enable Security (RLS)
   alter table public.competitions enable row level security;
   alter table public.scores enable row level security;

   -- 3. Create RLS Policies (CRUD)
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
   ```

4. **Run the server**
   ```bash
   npm run dev
   ```

5. **Build the server**
   ```bash
   npm run build
   ```

## 📄 License
[MIT](LICENSE)