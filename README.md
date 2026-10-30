# Gymnast Shoebox

[![License](https://img.shields.io/badge/license-MIT-blueviolet?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/github/v/release/elpeterson/gymnast-shoebox?style=flat-square&label=version)](https://github.com/elpeterson/gymnast-shoebox/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/elpeterson/gymnast-shoebox/ci.yml?style=flat-square&label=tests)](https://github.com/elpeterson/gymnast-shoebox/actions/workflows/ci.yml)

> **"Never lose a score again."**

Gymnast Shoebox is a modern, mobile-first SaaS application designed to solve the data fragmentation problem in youth gymnastics.

## 🚀 Features
*   **Multi-Gymnast Support:** Track scores for multiple children (siblings) under one parent account.
*   **MAG & WAG Support:** Full support for both Men's and Women's artistic gymnastics disciplines.
*   **MeetScoresOnline Integration:** Import a gymnast's full meet history from MeetScoresOnline via its JSON API using an MSO Athlete ID — capturing per-apparatus scores, all-around, and each meet's level & division.
*   **Consistency Insights:** A per-apparatus line graph of a gymnast's scores across the season, filtered by level and division so non-comparable groups are never mixed (see [Insights](#-insights)).
*   **Structured Levels & Divisions (Men's):** Level and division are captured as structured fields mirroring the values used in competition — numeric levels 3–10 with Division 1/2, plus Elite/Junior/Senior tracks and elite codes. Women's keeps flexible free-text entry.
*   **Live Meet Entry:** Enter scores as they happen. Supports incomplete meets and future schedule planning.
*   **Detailed Scoring:** Track Final Score, Start Value, Placement, and All-Around placement.
*   **Deep Customization:** Toggle fields (like Start Value) to declutter the UI on small screens.
*   **Themeable:** Dark Mode support with custom "Sterling Gym" branding.
*   **Secure:** Row Level Security (RLS) ensures data privacy — each user sees only their own gymnasts.

## 📊 Insights
The **Consistency** view (linked from the dashboard) charts a gymnast's apparatus scores over a season:
- One colored line per apparatus, dates on the X axis and score on the Y axis, with a hover tooltip showing every event's score for a given date.
- A **Level** filter plus a context-aware **Division / Track** filter, so a Level 4 Division 1 season is never plotted against a Level 5 Division 2 season — those scores aren't comparable.
- Computed entirely from the gymnast's own stored scores; it uses no other users' data.

## 🚧 Coming Soon
-   **Offline Support:** PWA capabilities for gyms with poor signal.
-   **Additional Data Sources:** Manual import from scoring sources beyond MeetScoresOnline.
-   **Media Uploads:** Attach photos of scorecards or screenshots to meets.

## 🐛 Known Issues
-   Dark mode preference is currently stored per-device (local storage), not synced to the user profile.

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
- **Charts:** [Recharts](https://recharts.org/) (via shadcn/ui charts)
- **Testing:** [Vitest](https://vitest.dev/)
- **Deployment:** [Vercel](https://vercel.com/)


## 💻 Local Development

### 1. Clone & Install
```bash
git clone https://github.com/elpeterson/gymnast-shoebox.git
cd gymnast-shoebox
npm install
```

### 2. Environment Setup
Copy the example file and fill in your Supabase project's URL and publishable key (Project Settings → API):
```bash
cp .env.example .env.local
```

### 3. Database Setup (Supabase)
The complete schema (tables, row level security policies, and the `competitions_with_scores` view) lives in [`supabase/migrations/`](supabase/migrations/).

- **New project:** run `supabase db push` with the [Supabase CLI](https://supabase.com/docs/guides/cli), or paste the migration files into the SQL Editor in order.
- **Existing project** (schema created by hand): mark the initial migration as applied rather than re-running it:
  ```bash
  supabase migration repair --status applied 20261029000000
  ```

Schema changes go in a new timestamped file in `supabase/migrations/`; never edit one that has already been applied.

### 4. Run the Server
```bash
npm run dev
```

## 🧪 Testing

```bash
npm test             # run all tests once
npm run test:watch   # watch mode
npm run test:coverage  # with coverage report
```

Tests live in `lib/__tests__/` and are run automatically on every push via GitHub Actions.
