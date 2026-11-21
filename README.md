# Heavy Report — Local-First Workout Analytics PWA

Dark-mode workout analytics web app & PWA for exported workout `.csv` files, with 100% local browser processing and IndexedDB storage.

**Live PWA (GitHub Pages):** https://alejandro-bcc.github.io/heavy-report/

## Features
- **Incremental CSV Upload & Deduplication:** Parses workout CSVs (handling mixed CRLF/LF pagination boundaries, emojis, decimal weights/RPE, `warmup`/`normal`/`dropset`/`failure`, bodyweight/assisted/duration/cardio, and repeated exercise blocks with `set_index` restarting at `0`). Skips unchanged workouts, updates only affected monthly caches, and opens a review modal for edited workouts.
- **Statistics Hub (Last 7 Days):** 7-day activity strip, anatomical body map, top worked muscles, and 30-day KPI summary.
- **Muscle Distribution:** Period selector (`30d`, `3m`, `1y`, `All time`), 6-axis hexagonal Radar chart (Apache ECharts) comparing current vs. previous period, and 4 comparative KPI cards (`Workouts`, `Duration`, `Volume`, `Sets`).
- **Body Distribution:** Weekly navigator (`Mon–Sun`) + period filters, custom interactive Front & Back anatomical SVG covering all 16 detailed muscles, fractional sets table (`1.0` primary / `0.5` secondary), and historical muscle progression chart.
- **Main Exercises:** Ranked frequency list with search/muscle filters and exercise detail view (PRs, Max Weight / Inverted Assistance / Duration, Session Volume, Estimated 1RM via Epley, Average RPE, and full session log).
- **Consistency Calendar (3 Modes):** `Month` (continuous with `week streak`, `rest days`, and workout titles under trained days), `Year` (12 mini-calendars), and `Multi-year` (GitHub-style stacked heatmap), with click-to-open workout summary modal.
- **Exercise Muscle Mappings & JSON Backup/Restore:** Built-in exercise dictionary + editable mapping modal + full JSON export/restore (`Merge` or `Replace`).

## Commands
```bash
npm install      # Install dependencies
npm run dev      # Start local dev server
npm test         # Run Vitest unit test suite
npm run build    # Type-check and build production PWA in dist/
npm run preview  # Preview the production PWA locally
```
