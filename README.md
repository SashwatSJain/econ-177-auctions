# UCSB Econ 177 — Classroom Experiments

A Next.js web app for running live economics experiments in class, with a real-time instructor dashboard.

## Experiments

### Experiment 1 — Auctions
Students submit bids across multiple rounds. The instructor dashboard shows all bids, per-round winners, bid/value ratios, and the Nash equilibrium prediction for each auction format.

### Experiment 2 — Risk Aversion
Students complete a certainty-equivalent elicitation task. The instructor dashboard displays individual CRRA alpha estimates and a class-level aggregate.

### Experiment 3 — Seller Reserve Price
Students play the role of a seller setting a reserve price in a second-price auction over 20 rounds. Four treatments vary bidder count (2 vs 5) and seller value (0 vs 30):

| Treatment | Bidders | Seller Value | Optimal Reserve |
|-----------|---------|--------------|-----------------|
| Exp 3.1   | 2       | 0            | $50             |
| Exp 3.2   | 5       | 0            | $50             |
| Exp 3.3   | 2       | 30           | $65             |
| Exp 3.4   | 5       | 30           | $65             |

The instructor dashboard includes:
- Per-round class averages for reserve price, profit, and sale rate
- Auto-zoomed charts so learning dynamics are clearly visible
- **"Show Together"** button on the Avg Reserve Price chart — overlays the paired treatment (3.1↔3.2 and 3.3↔3.4) on a single dual-line chart for side-by-side comparison
- Fullscreen chart view (Esc to close)
- Top/bottom earner stats per treatment
- Excel export

## Stack

- **Next.js** (App Router)
- **Supabase** (Postgres + Auth)
- **Tailwind CSS**
- Custom SVG charts (no charting library)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Instructor dashboard is at `/instructor` (requires Supabase auth).
