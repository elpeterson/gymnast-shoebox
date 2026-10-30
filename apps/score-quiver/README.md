# Score Quiver

[![License](https://img.shields.io/badge/license-GPL--3.0-blueviolet?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/elpeterson/archers-shoebox/ci.yml?style=flat-square&label=tests)](https://github.com/elpeterson/archers-shoebox/actions/workflows/ci.yml)

> **"Every arrow, remembered."**

Score Quiver is the archery sibling of [Gymnast Shoebox](https://github.com/elpeterson/gymnast-shoebox): a private, permanent home for an archer's tournament scorecards, built for looking back and seeing improvement, not live scoring.

## 🚀 Features
*   **Between Ends import:** Drop in the scorecard PDFs Between Ends lets archers download. They're parsed in the browser down to every arrow, and the original PDF is kept alongside the score.
*   **Self-checking import:** Every card is its own checksum (arrows → end sums → running totals → round totals). A card that doesn't add up is rejected with the exact end that's wrong, never guessed at.
*   **Like-for-like comparisons:** Scores are grouped by *setup* (bow style, indoor/outdoor, distance, face). The distance and face aren't printed on the card, so import asks once and remembers.
*   **Insights:** Arrow average, % of max, hit rate and end-to-end consistency over time; personal bests; where arrows landed by target color; round 1 vs round 2.
*   **Multi-archer:** Siblings under one parent account.
*   **Secure:** Supabase Auth, Row Level Security on every table, private storage for PDFs.

## 🧭 Roadmap
-   **Practice sessions from My Targets (Android):** import exported practice data using the same events → rounds → ends model (`source = 'manual'` is already reserved).
-   Manual score entry for events without a Between Ends card.
-   PWA / offline.

## 🏹 How import works

Between Ends exports scorecards with jsPDF, so every cell is real, positioned text. `lib/scorecard/parse.ts` finds each round's grid by its header row (`Rnd N … Sum Total <bonus> <bonus>`) and reads cells by column position. That one rule handles both layouts seen so far:

| | Indoor | Outdoor |
|---|---|---|
| Arrows × ends | 3 × 10 | 6 × 6 |
| Layout | landscape, rounds side by side | portrait, rounds stacked |
| Bonus columns | 10s, 9s | Xs, 10s |

Details worth knowing:
- **Arrow order within an end is not shooting order.** Between Ends sorts each end's arrows, so the app never computes "first arrow" style stats.
- **The day shot comes from the session label.** Postal events (e.g. JOAD Indoor Nationals) span months; "Massachusetts, Feb 20, 12:30pm" or "Saturday 9am" resolves the actual day.
- **Duplicates are detected** by the PDF's SHA-256, per archer.

Test fixtures in `lib/__tests__/fixtures/` are real exports converted with `scripts/make-fixture.mjs`, which replaces the archer's name. Never commit raw scorecard PDFs.

## 🛠 Tech Stack
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Database, Auth & Storage:** [Supabase](https://supabase.com/)
- **PDF parsing:** [pdf.js](https://mozilla.github.io/pdf.js/) (client-side)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Deployment:** [Vercel](https://vercel.com/)

## 💻 Local Development

### 1. Clone & Install
```bash
git clone https://github.com/elpeterson/archers-shoebox.git
cd archers-shoebox
npm install
```

### 2. Supabase
Create a new Supabase project, then run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL Editor. It creates the tables, RLS policies, the atomic `import_scorecard` function, and the private `scorecards` storage bucket.

In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow list.

### 3. Environment
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's API settings.

### 4. Run
```bash
npm run dev
```

## 🧪 Testing
```bash
npm test               # run all tests once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

To add a fixture from a new scorecard layout:
```bash
node scripts/make-fixture.mjs path/to/scorecard.pdf lib/__tests__/fixtures/<name>.json
```
