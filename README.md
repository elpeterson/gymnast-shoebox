# Gymnast Shoebox

> **"Never lose a score again."**

Gymnast Shoebox is a modern, mobile-first SaaS application designed to solve the data fragmentation problem in youth gymnastics.

![Status](https://img.shields.io/badge/Status-MVP-blueviolet) ![Stack](https://img.shields.io/badge/Stack-Next.js_15_|_Supabase-black)

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
- [ ] Women's Gymnastics Support
- [ ] Gymnast Profiles (Support for multiple children)
- [ ] Data Visualizations (Progress over time)
- [ ] Dark Mode

### Bonus And/Or Requested Features
- [ ] Photo upload of physical scorecards

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

4. **Run the server**
   ```bash
   npm run dev
   ```

## 📄 License
[MIT](LICENSE)