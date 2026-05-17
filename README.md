# VCP Scanner

Stock scanner for the Stock Exchange of Thailand (SET) using **Volatility Contraction Pattern (VCP)** and **SEPA (Specific Entry Point Analysis)** methodology based on Mark Minervini's framework.

**Live**: [vcp-scanner.pages.dev](https://vcp-scanner.pages.dev)

![Cloudflare Workers](https://img.shields.io/badge/deploy-Cloudflare-F38020?logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/lang-TypeScript_6-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/ui-React_19-61DAFB?logo=react&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8)

---

## Features

- **7-Criteria SEPA Scoring** — Superperformance, Earnings, Catalyst, Supply/Demand, Leadership, Sponsorship, Market Timing (max 100 pts)
- **VCP Detection** — Multi-contraction zigzag with quality classification (TIGHT / STANDARD / WIDE / LOOSE)
- **Trend Template Filter** — Minervini 8-point trend template evaluation with filter buttons (ALL / 8/8 / 6+ / 4+)
- **Pivot-based Trade Plan** — Entry zone (0-1% above pivot), stop loss (8% below pivot), 3:1 risk/reward target
- **Technical Indicators** — RSI, ADX, Bollinger Bandwidth, 52-week high proximity, breakout status
- **Alert Classification** — HIGH / MEDIUM / WATCH based on SEPA score + VCP quality
- **Dark Pro-Trader UI** — Candlestick chart, SEPA score ring, VCP contraction chart, criteria breakdown
- **PWA** — Installable with offline support via service worker
- **Visitor Counter** — Daily/total page view tracking
- **Auto Scheduling** — EOD scan at 16:30 Bangkok time, Mon–Fri via Cloudflare Cron

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | [Cloudflare Workers](https://workers.cloudflare.com) + [Hono](https://hono.dev) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) via [Drizzle ORM](https://orm.drizzle.team) |
| Queue | [Cloudflare Queue](https://developers.cloudflare.com/queues/) for batch scanning |
| Frontend | React 19 + Vite (deployed on [Cloudflare Pages](https://pages.cloudflare.com)) |
| Data Fetching | TanStack Query |
| State | Zustand |
| Styling | CSS Modules + CSS Variables (custom design system) |
| Data Source | Yahoo Finance via cookie/crumb auth |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for deployment
- Cloudflare account with D1 + Queue + Pages enabled

### Local Development

```bash
git clone https://github.com/your-username/vcpSystem.git
cd vcpSystem
bun install
cd web && bun install && cd ..

# Dev backend (Wrangler local)
wrangler dev

# Dev frontend (in another terminal)
cd web && bun run dev
```

### Trigger a Manual Scan

```bash
curl -X POST https://vcp-scanner.vcp-scanner.workers.dev/api/scan/trigger
```

Or use the "Run Scan Now" button in the Config tab.

### Deployment

```bash
# Deploy Worker
wrangler deploy

# Build and deploy frontend
cd web
VITE_API_URL=https://vcp-scanner.vcp-scanner.workers.dev bun run build
wrangler pages deploy dist --project-name=vcp-scanner
```

---

## Project Structure

```
vcpSystem/
├── server/
│   ├── index.ts              # Hono app entry + scheduler
│   ├── core/
│   │   ├── types.ts          # Market, Strategy, DataProvider interfaces
│   │   ├── scanner.ts        # Batch scan engine
│   │   ├── scheduler.ts      # Cron-based auto scan
│   │   └── rate-limiter.ts   # Token bucket for API calls
│   ├── db/
│   │   ├── schema.ts         # Drizzle tables (alerts, scanRuns, symbols, markets)
│   │   └── client.ts         # SQLite connection
│   ├── markets/
│   │   └── set.ts            # SET market config (.BK suffix, pre-filters)
│   ├── providers/
│   │   └── yahoo.ts          # Yahoo Finance data provider
│   ├── strategies/
│   │   ├── vcp-minervini.ts   # Strategy orchestrator (SEPA + VCP + alert level)
│   │   └── _shared/
│   │       ├── sepa-criteria.ts   # 7 SEPA criteria scoring (immutable)
│   │       ├── vcp-detector.ts    # VCP pattern detection (immutable)
│   │       └── alert-level.ts     # HIGH/MED/WATCH classifier
│   ├── indicators/
│   │   ├── ma.ts             # Moving average helpers
│   │   └── stats.ts          # Statistical helpers
│   └── routes/
│       ├── alerts.ts         # GET /api/alerts
│       ├── stock.ts          # GET /api/stock/:symbol
│       ├── history.ts        # GET /api/history
│       └── scan.ts           # POST /api/scan/trigger
├── web/
│   ├── src/
│   │   ├── App.tsx           # Main layout shell
│   │   ├── api/              # API client + TanStack Query hooks
│   │   ├── components/       # UI components (CSS Modules)
│   │   ├── stores/           # Zustand UI state
│   │   ├── lib/              # Formatting utilities
│   │   └── styles/           # Design tokens + globals
│   └── vite.config.ts        # Dev proxy → :8765
├── scripts/
│   ├── seed-symbols.ts       # Seed market symbols
│   ├── validate.ts           # Cross-validate TS vs Python output
│   └── manual-scan.ts        # CLI scan runner
├── data/
│   └── vcp.db                # SQLite database
├── drizzle/                  # Migration files
├── ARCHITECTURE-v2.md        # Full architecture document
├── DESIGN.md                 # UI design system specification
├── BLUEPRINT.md              # VCP/SEPA algorithm reference
└── CLAUDE.md                 # AI assistant instructions
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/alerts` | Alerts (query: `date`, `level`, `min_score`, `tt_min`, `limit`, `offset`) |
| `GET` | `/api/stock/:symbol` | Stock detail with prices + SEPA breakdown |
| `GET` | `/api/history` | 30-day scan history |
| `GET` | `/api/status` | Server status, last scan info |
| `GET` | `/api/views` | Daily/total page views |
| `POST` | `/api/views` | Track page view |
| `POST` | `/api/scan/trigger` | Trigger a manual scan (queues batch processing) |

### Example Response — Alerts

```json
{
  "date": "2026-05-15",
  "total": 4,
  "alerts": [
    {
      "symbol": "DELTA",
      "sepaScore": 65,
      "alertLevel": "MEDIUM",
      "price": 319,
      "vcpQuality": "TIGHT",
      "pivotPrice": 317,
      "scoreC1": 11,
      "scoreC2": 20,
      "scoreC4": 14,
      "scoreC6": 5,
      "scoreC7": 15
    }
  ]
}
```

---

## 3-Axis Architecture

Every scan is a combination of **Market × Strategy × Provider**:

```
Market (SET, NASDAQ, NYSE, HKEX)
   ×
Strategy (VCP Minervini, future strategies...)
   ×
Provider (Yahoo Finance, future providers...)
```

Adding a new market requires only one file:

```typescript
// server/markets/nasdaq.ts
export const NASDAQ: Market = {
  id: 'NASDAQ',
  name: 'NASDAQ Stock Market',
  currency: 'USD',
  yahooSuffix: '',
  timezone: 'America/New_York',
  marketClose: '16:00',
  async symbols() { /* fetch from DB or API */ },
}
```

---

## SEPA Scoring Criteria

| # | Criterion | Max Pts | Description |
|---|---|---:|---|
| C1 | Superperformance | 15 | Price vs 52w high, relative strength vs index |
| C2 | Earnings & Revenue | 20 | EPS growth, revenue growth, profit margin, ROE |
| C3 | Catalyst | 10 | Sector momentum, institutional accumulation |
| C4 | Supply & Demand | 15 | Volume patterns, accumulation days |
| C5 | Leadership | 10 | Sector leader ranking |
| C6 | Sponsorship | 15 | Institutional & insider ownership |
| C7 | Market Direction | 15 | Market index trend, breadth indicators |
| | **Total** | **100** | |

---

## VCP Quality Classification

| Label | Score | Contraction Pattern |
|---|---:|---|
| TIGHT | 8–10 | Narrow contractions, volume drying, tight pivot |
| STANDARD | 5–7 | Normal VCP with 2–3 contractions |
| WIDE | 3–4 | Wider price contractions, less defined |
| LOOSE | 0–2 | No clear VCP pattern |

---

## Commands

```bash
bun run dev              # Start backend with --watch
bun run scan             # Run scan from CLI
bun run test             # Run Vitest tests
bun run validate PTT AOT # Validate TS output vs Python
bun run check            # Full CI gate (lint + typecheck + test + validate)
bun run build            # Production build (server + web)
bun run generate         # Generate Drizzle migration
bun run migrate          # Apply migrations
bun run seed             # Seed SET symbols
bun run typecheck        # Type check all code
bun run lint             # Biome lint
```

---

## Screenshots

> Dashboard screenshots coming soon.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

### Important Rules

- **VCP/SEPA algorithm is immutable** — do not modify `sepa-criteria.ts`, `vcp-detector.ts`, or `vcp-minervini.ts` without a BLUEPRINT.md reference
- Run `bun run validate` after touching any strategy logic
- Use `bun` only — no `npm`, `npx`, `pip`, or `python`
- Follow the existing CSS Variables design system — no hardcoded colors

---

## License

[MIT](LICENSE)

---

## Acknowledgments

- **Mark Minervini** — SEPA methodology and VCP pattern from *Trade Like a Stock Market Wizard*
- **yahoo-finance2** — Reliable Yahoo Finance API wrapper
- **Drizzle ORM** — Type-safe SQL query builder for TypeScript
- **Hono** — Fast, lightweight web framework
