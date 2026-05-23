# UCSB Econ 177 — Classroom Experiments

A Next.js web app for running live economics experiments in class, with a real-time instructor dashboard.

## Experiments

### Experiment 1 — Sealed-Bid Auctions
Students submit bids across multiple rounds. The instructor dashboard shows all bids, per-round winners, bid/value ratios, and the Nash equilibrium prediction for each auction format.

Eight treatment variants:

| Treatment | Format | Bidders | Variant |
|-----------|--------|---------|---------|
| `second-2` | Second-price | 2 | Baseline |
| `second-5` | Second-price | 5 | Baseline |
| `second-2-reserve50` | Second-price | 2 | Reserve price $50 |
| `second-2-entry25` | Second-price | 2 | Entry fee $25 |
| `first-2` | First-price | 2 | Baseline |
| `first-5` | First-price | 5 | Baseline |
| `first-2-reserve50` | First-price | 2 | Reserve price $50 |
| `first-2-entry25` | First-price | 2 | Entry fee $25 |

### Experiment 2 — Risk Aversion
Students complete a certainty-equivalent elicitation task (9 indifference-probability questions). The instructor dashboard displays individual CRRA alpha estimates and a class-level aggregate histogram.

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

### Experiment 4 — Penny Jar (Common Value)
Students estimate the number of kernels in a jar, then bid in three sealed-bid common-value auctions against 2, 10, and 100 competing bidders. The instructor dashboard plots estimate vs. bid scatter with winner's curse analysis.

### Experiment 5 — Oil Well Auction
Students receive a private signal (half-value) and bid in a common-value oil well auction. Two variants:

| Variant | Signal Type |
|---------|-------------|
| `integer` | Half-values drawn as integers ($0 or $3) |
| `continuous` | Half-values drawn from a uniform distribution |

The instructor dashboard shows empirical bid CDFs overlaid against the Nash equilibrium CDF.

### Experiment 6 — All-Pay Auction
Students bid for a $100 bill in an all-pay auction — everyone pays their bid, but only the highest bidder wins. Three group sizes:

| Variant | Bidders |
|---------|---------|
| `/exp6/2` | 2 |
| `/exp6/5` | 5 |
| `/exp6/10` | 10 |

The instructor dashboard shows bid CDF distributions for each group size compared to the Nash equilibrium.

## Student Pages

| Route | Description |
|-------|-------------|
| `/` | Home — experiment selection tabs (Exp 1–6) |
| `/exp1/[type]` | Sealed-bid auction (8 treatment variants) |
| `/exp2` | Risk aversion elicitation |
| `/exp3` | Seller reserve price auction |
| `/exp4` | Penny jar common-value auction |
| `/exp5/[variant]` | Oil well auction |
| `/exp6/[numBidders]` | All-pay auction |
| `/results` | Personal results and Nash equilibrium comparisons |
| `/class-results` | Aggregate class data visualizations |
| `/attendance` | Class attendance sign-in (GPS + code word) |
| `/export` | Download personal experiment data (CSV/JSON) |

## Instructor Dashboard

Route: `/instructor` (requires Supabase auth)

- **Exp 1–6 dashboards** — real-time charts, Nash overlays, bid/CDF distributions
- **Participation tracker** — student-by-student matrix of which experiments each student completed
- **Attendance log** — timestamped records with GPS verification, filterable by date and perm number
- **Class schedule settings** — configure meeting times and infer class dates from submission patterns
- **Quarter management** — create new quarter, bulk data export, data reset

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
