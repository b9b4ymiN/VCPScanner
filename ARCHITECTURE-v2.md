# VCP Scanner v2 — Research & Fresh Architecture
> สแกนหุ้น VCP/SEPA หลายตลาด — TypeScript-native, no Python  
> Updated: 2026-05-16

---

## Part I — GitHub Repository Research

### 1.1 VCP / SEPA / Minervini Scanners (ที่มีอยู่)

ทุก repo ที่หาเจอเป็น **Python ทั้งหมด** — ไม่มี TypeScript/JS implementation ที่ production-ready

| Repo | Stars | Lang | Logic Quality | นำมาใช้ได้? |
|---|---:|---|---|---|
| [`jeffreyrdcs/stock-vcpscreener`](https://github.com/jeffreyrdcs/stock-vcpscreener) | ~600 | Python | ⭐⭐⭐⭐ Daily US scan + market breadth | ❌ Python |
| [`marco-hui-95/vcp_screener.github.io`](https://github.com/marco-hui-95/vcp_screener.github.io) | ~150 | Python | ⭐⭐⭐ ดี base, ใช้ FinViz API | ❌ Python |
| [`shiyu2011/cookstock`](https://github.com/shiyu2011/cookstock) | ~70 | Python | ⭐⭐⭐⭐ Stage 2 + VCP + news sentiment | ❌ Python |
| [`crankycandle/volatility-contraction-pattern`](https://github.com/crankycandle/volatility-contraction-pattern) | ~30 | Python | ⭐⭐ minimal | ❌ Python |
| [`clairetsoi1129/stock-screener`](https://github.com/clairetsoi1129/stock-screener) | ~10 | Python | ⭐⭐ basic | ❌ Python |

**สรุป:** ✗ ไม่มี VCP logic ใน TypeScript ที่จะ fork มาใช้ได้  
→ **ต้องเขียน logic ใหม่จาก `sepa_scanner.py` เดิม** (port ทุกบรรทัด, ห้ามเปลี่ยน rule)

### 1.2 TypeScript Stock Dashboard Templates

มีหลายอันที่ดีพอจะเอา **UI/structure** มาเป็น reference ได้

| Repo | Stack | จุดที่หยิบมาใช้ |
|---|---|---|
| [`adrianhajdin/signalist_stock-tracker-app`](https://github.com/adrianhajdin/signalist_stock-tracker-app) | Next.js + Shadcn + Better Auth | ⭐ Dashboard layout, table patterns |
| [`DariusLukasukas/stocks`](https://github.com/DariusLukasukas/stocks) | Next.js 14 + Shadcn + Tailwind | ⭐⭐ yfinance integration, chart components |
| [`OpenStock`](https://github.com/topics/stock-market?l=typescript) | Next.js + Inngest | Real-time WS pattern (ไม่จำเป็นต้องใช้) |

**สรุป:** หยิบ **UI patterns** ได้ แต่ไม่มีอันไหนทำ VCP/SEPA scoring → ต้อง custom

### 1.3 Building Blocks ที่ Production-Ready

ทุกตัวนี้ใช้ได้ฟรี และ MIT/Apache license

#### Data Source

| Library | Why | License |
|---|---|---|
| **`yahoo-finance2`** (npm) | 1.7M+ downloads/wk, TypeScript-native, ครอบคลุม SET (`.BK`), US, HK, JP, IDX, KOSPI | MIT |
| `yfinance-mcp-ts` | TLS fingerprint bypass (กัน rate-limit ดีกว่า) | MIT |

#### Technical Indicators

| Library | Why | Bench (vs others) |
|---|---|---|
| **`@ixjb94/indicators`** | 100+ indicators, claimed fastest TypeScript TA lib | ~2-3x faster than `technicalindicators` |
| `trading-signals` (bennycode) | Stream-friendly API, well-maintained, 100+ tests | Solid |
| `fast-technical-indicators` | Drop-in replacement, performance-focused | New but fast |

#### Charts (Frontend)

| Library | Why |
|---|---|
| **TradingView Lightweight Charts** | ฟรี, ~45KB gzip, dark mode native, professional |
| `uPlot` | ultra-light (8KB), เร็วสุดถ้าไม่ต้องการ candlestick |

---

## Part II — Architecture Decision

### 2.1 Build vs Fork

```
                ┌─────────────────────┐
                │  ตัดสินใจ            │
                └─────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  Fork Python repo    Port to TS       Build fresh
  + Web wrapper       (logic only)     (clean slate)
        │                 │                 │
        ❌                ✅                ⚠️
   ต้อง Python      Best of both    เสียเวลา design
   ทำตรงข้าม         worlds          แต่ extensible สูง
```

**Verdict: Port logic to TypeScript + Build fresh frontend**

เหตุผล:
1. **No good TS VCP scanner exists** → ต้องเขียนเอง ไม่ว่าจะอย่างไร
2. **Logic ใน `sepa_scanner.py` ไม่ซับซ้อน** — ทุก rule ระบุชัดใน BLUEPRINT.md  
   Port เป็น TS ใช้เวลาประมาณ 1-2 วันเต็ม
3. **Extensibility คือ killer feature** — design ใหม่ที่รองรับ multi-market ตั้งแต่ day 1 ดีกว่า retrofit
4. **Performance** — Bun runtime + native SQLite + zero Python startup overhead → scan เร็วขึ้น 3-5 เท่า

---

## Part III — Tech Stack (เน้นประสิทธิภาพ + ขยายต่อง่าย)

### 3.1 Recommended Stack

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   RUNTIME      Bun 1.2+                                  │
│                ↪ native TypeScript, no transpile         │
│                ↪ bun:sqlite (4-6× faster than node)      │
│                ↪ Bun.serve (fastest HTTP server in JS)   │
│                                                          │
│   BACKEND      Hono                                      │
│                ↪ Bun-native edge framework               │
│                ↪ ~6KB, ~30µs request handling            │
│                ↪ TypeScript-first, Zod-validated routes  │
│                                                          │
│   ORM          Drizzle ORM                               │
│                ↪ Type-safe SQL, zero overhead            │
│                ↪ Edge-compatible (works in Workers too)  │
│                                                          │
│   DATABASE     SQLite (via bun:sqlite)                   │
│                ↪ WAL mode + memory-mapped I/O            │
│                ↪ Single file, no daemon                  │
│                                                          │
│   SCHEDULER    Bun's built-in setInterval / cron-parser  │
│                ↪ ไม่ต้องใช้ external cron                 │
│                                                          │
│   ───────────────────────────────────────────────────    │
│                                                          │
│   FRONTEND     Vite 5 + React 19 + TypeScript            │
│                ↪ Sub-50ms HMR, sub-200KB bundle          │
│                                                          │
│   ROUTER       TanStack Router                           │
│                ↪ Type-safe routes, file-based            │
│                                                          │
│   DATA         TanStack Query                            │
│                ↪ Cache + background refetch              │
│                                                          │
│   TABLES       TanStack Table v8                         │
│                ↪ Virtualization for 1000+ rows           │
│                                                          │
│   CHARTS       TradingView Lightweight Charts            │
│                ↪ Free, dark-native, professional grade   │
│                                                          │
│   STATE        Zustand                                   │
│                ↪ ~1KB, no boilerplate                    │
│                                                          │
│   STYLING      CSS Variables + CSS Modules               │
│                ↪ ตาม DESIGN.md (blur.io aesthetic)        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Why Bun? (เทียบกับ Node.js / Deno)

| Metric | Node.js + better-sqlite3 | Deno | **Bun** |
|---|---|---|---|
| Cold start | ~80ms | ~30ms | **~10ms** |
| SQLite read 10K rows | ~12ms | N/A | **~3ms** |
| HTTP throughput | 60K req/s | 100K req/s | **150K req/s** |
| TypeScript | ts-node / tsx (slow) | native | **native** |
| Package install | npm (slow) | deno cache | **bun install (20× faster)** |
| Bundle size | needs webpack/esbuild | esbuild | **built-in** |

→ Bun เป็น **single binary** ที่ทำได้ทั้ง runtime + bundler + test runner + package manager  
→ DX ดีกว่าทุกตัวที่ใช้ปัจจุบัน

### 3.3 ทำไมไม่ใช้ Next.js?

| ข้อพิจารณา | Next.js | **Vite SPA + Bun API** |
|---|---|---|
| Bundle size | ~150KB (RSC overhead) | **<80KB** |
| EOD scan job (CPU bound) | API route timeout | **Background worker เต็มที่** |
| Self-hosted on OCI VM | ใช้ pm2 + Node | **systemd + 1 bun binary** |
| Deployment | Build step ช้า | **bun build < 5s** |
| Learning curve (existing team) | สูง (RSC, Server Actions) | **ต่ำ (REST API + SPA)** |

Next.js เหมาะกับ marketing site / e-commerce  
**Trader dashboard = SPA pure** → Vite + Bun เร็วและเรียบง่ายกว่า

---

## Part IV — Multi-Market Architecture (Strategy Pattern)

หัวใจของการขยายจาก SET → US → HK → JP คือ **abstraction ที่ถูกต้องตั้งแต่ day 1**

### 4.1 Core Abstractions

```typescript
// src/core/types.ts

// === MARKET ABSTRACTION ===
export interface Market {
  id:          string                  // 'SET' | 'NYSE' | 'NASDAQ' | 'HKEX' | 'TSE'
  name:        string                  // 'Stock Exchange of Thailand'
  currency:    string                  // 'THB' | 'USD' | 'HKD'
  yahooSuffix: string                  // '.BK' | '' | '.HK' | '.T'
  timezone:    string                  // 'Asia/Bangkok'
  marketClose: string                  // '16:30'  (HH:MM)
  
  // กฎเฉพาะตลาด (ปรับ pre-filter ได้)
  preFilter: {
    minPrice:    number                // SET: 2.0 THB, NYSE: 5.0 USD
    minAvgVol:   number                // SET: 200000, NYSE: 1000000
    minHistory:  number                // 60 days (same all)
  }
  
  symbols(): Promise<string[]>         // ดึง symbol list ของตลาดนั้น
}

// === DATA PROVIDER ABSTRACTION ===
export interface PriceData {
  date:   string                       // ISO date
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

export interface Fundamentals {
  epsGrowthYoY:        number | null
  revenueGrowthYoY:    number | null
  profitMargin:        number | null
  roe:                 number | null
  institutionalHold:   number | null
  insiderHold:         number | null
  sector:              string | null
}

export interface DataProvider {
  name: string                         // 'yahoo' | 'alphavantage' | 'finnhub'
  
  fetchPrices(
    symbol: string,
    market: Market,
    period: '1y' | '6mo' | '3mo'
  ): Promise<PriceData[]>
  
  fetchFundamentals(
    symbol: string,
    market: Market
  ): Promise<Fundamentals>
  
  fetchMarketIndex(market: Market): Promise<PriceData[]>
}

// === STRATEGY ABSTRACTION ===
export interface StrategyResult {
  symbol:       string
  date:         string
  passes:       boolean                // ผ่านเงื่อนไข strategy นี้หรือไม่
  score:        number                 // 0-100
  alertLevel:   'HIGH' | 'MEDIUM' | 'WATCH' | null
  details:      Record<string, unknown> // strategy-specific data
}

export interface Strategy {
  id:          string                  // 'vcp-minervini' | 'momentum' | 'value'
  name:        string                  // 'Minervini VCP + SEPA'
  description: string
  version:     string                  // 'v1.0' (ตาม sepa_scanner.py)
  
  scan(input: {
    symbol:        string
    market:        Market
    prices:        PriceData[]
    fundamentals:  Fundamentals
    marketIndex:   PriceData[]
    sectorPeers?:  Map<string, PriceData[]>
  }): StrategyResult
}
```

### 4.2 Strategy Implementation Example

```typescript
// src/strategies/vcp-minervini.ts
import type { Strategy, StrategyResult } from '@/core/types'
import { sma, slope } from '@/indicators'

export const VcpMinerviniStrategy: Strategy = {
  id:          'vcp-minervini',
  name:        'Minervini VCP + SEPA',
  description: 'ตาม sepa_scanner.py — Mark Minervini SEPA 7 criteria + VCP detection',
  version:     'v1.0',

  scan({ symbol, market, prices, fundamentals, marketIndex }): StrategyResult {
    // === Pre-filter (ตาม section 1.1 ของ BLUEPRINT) ===
    const currentPrice = prices.at(-1)!.close
    const avgVol20d    = mean(prices.slice(-20).map(p => p.volume))
    if (currentPrice < market.preFilter.minPrice)   return reject(symbol)
    if (avgVol20d     < market.preFilter.minAvgVol) return reject(symbol)
    if (prices.length < market.preFilter.minHistory) return reject(symbol)

    // === SEPA 7 Criteria (ตาม section 1.2) ===
    const c1 = scoreSuperPerformance(prices, marketIndex)      // max 15
    const c2 = scoreEarnings(fundamentals)                     // max 20
    const c3 = scoreCatalyst(prices)                           // max 10
    const c4 = scoreSupplyDemand(prices)                       // max 20  (includes VCP bonus)
    const c5 = scoreLeadership(/* sectorPeers */)              // max 10
    const c6 = scoreSponsorship(fundamentals)                  // max 10
    const c7 = scoreMarketDirection(marketIndex)               // max 15

    const sepaScore = c1+c2+c3+c4+c4+c5+c6+c7

    // === VCP Detection (ตาม section 1.3) ===
    const vcp = detectVcp(prices.slice(-60))

    // === Alert Trigger (ตาม section 1.4) ===
    const passes = sepaScore >= 60 && vcp.isVcp
    if (!passes) return { passes: false, score: sepaScore, alertLevel: null, ... }

    const alertLevel = classifyAlert({
      vcpQualityScore: vcp.qualityScore,
      sepaScore,
      pivotDistance:   vcp.pivotDistancePct,
    })

    return {
      symbol, date: prices.at(-1)!.date,
      passes: true,
      score: sepaScore,
      alertLevel,
      details: {
        sepaBreakdown: { c1, c2, c3, c4, c5, c6, c7 },
        vcp,
        price: currentPrice,
        avgVol20d,
      },
    }
  },
}
```

### 4.3 Adding US Market (future)

```typescript
// src/markets/nasdaq.ts
import type { Market } from '@/core/types'

export const NASDAQ: Market = {
  id:          'NASDAQ',
  name:        'NASDAQ',
  currency:    'USD',
  yahooSuffix: '',                     // AAPL ไม่ต้องมี suffix
  timezone:    'America/New_York',
  marketClose: '16:00',
  preFilter: {
    minPrice:    5.0,                  // ต่างจาก SET
    minAvgVol:   1_000_000,            // US liquid stocks
    minHistory:  60,
  },
  async symbols() {
    // ดึง NASDAQ-100 + S&P 500 list
    return await fetchSP500Symbols()
  },
}

// ใช้ strategy เดียวกัน — code 0 บรรทัด
const results = await scan({
  market:   NASDAQ,           // ← แค่เปลี่ยนตรงนี้
  strategy: VcpMinerviniStrategy,
})
```

**= 1 บรรทัดในการเพิ่มตลาด** ✅

---

## Part V — Project Structure

```
vcp-scanner/
├── README.md
├── BLUEPRINT.md                 ← rules (immutable)
├── DESIGN.md                    ← UI design system
├── package.json
├── bun.lockb
├── biome.json                   ← linter+formatter (ใช้แทน ESLint+Prettier)
├── drizzle.config.ts
│
├── server/                      ← Bun + Hono backend
│   ├── index.ts                 ← entry: Bun.serve + scheduler
│   ├── routes/
│   │   ├── alerts.ts            ← GET /api/alerts
│   │   ├── stock.ts             ← GET /api/stock/:symbol
│   │   ├── history.ts           ← GET /api/history
│   │   └── scan.ts              ← POST /api/scan/trigger
│   ├── core/
│   │   ├── types.ts             ← Market, DataProvider, Strategy interfaces
│   │   ├── scanner.ts           ← orchestrator
│   │   ├── scheduler.ts         ← cron + manual trigger
│   │   └── rate-limiter.ts      ← token bucket
│   ├── markets/
│   │   ├── set.ts               ← Thailand
│   │   ├── nasdaq.ts            ← (future)
│   │   └── nyse.ts              ← (future)
│   ├── providers/
│   │   ├── yahoo.ts             ← yahoo-finance2 wrapper + cache
│   │   └── alphavantage.ts      ← (future, fallback)
│   ├── strategies/
│   │   ├── vcp-minervini.ts     ← THE strategy (port ของ sepa_scanner.py)
│   │   └── _shared/
│   │       ├── vcp-detector.ts  ← detect_vcp() port
│   │       ├── sepa-criteria.ts ← 7 criteria scoring
│   │       └── alert-level.ts   ← HIGH/MEDIUM/WATCH classification
│   ├── indicators/              ← thin wrapper รอบ @ixjb94/indicators
│   │   ├── ma.ts                ← SMA helpers + slope
│   │   ├── stats.ts             ← mean, stdev, percentile
│   │   └── swing.ts             ← swing-high / swing-low detection
│   └── db/
│       ├── schema.ts            ← Drizzle schema
│       ├── client.ts            ← bun:sqlite + drizzle init
│       └── migrations/
│
├── web/                         ← Vite + React frontend
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── routes/              ← TanStack Router file-based
│       │   ├── __root.tsx
│       │   ├── index.tsx        ← /  (dashboard)
│       │   ├── stock.$symbol.tsx
│       │   └── history.tsx
│       ├── components/
│       │   ├── AlertTable.tsx
│       │   ├── DetailPanel.tsx
│       │   ├── SepaScoreRing.tsx
│       │   ├── VcpChart.tsx
│       │   ├── PriceChart.tsx   ← TradingView Lightweight Charts
│       │   ├── CriteriaBar.tsx
│       │   ├── FilterBar.tsx
│       │   ├── MarketSelector.tsx  ← future: SET / NASDAQ tabs
│       │   └── StatBar.tsx
│       ├── stores/
│       │   ├── filters.ts       ← Zustand
│       │   └── ui.ts
│       ├── api/
│       │   └── client.ts        ← TanStack Query hooks
│       └── styles/
│           ├── tokens.css       ← CSS variables (DESIGN.md)
│           └── globals.css
│
├── shared/                      ← types shared between server & web
│   └── types.ts                 ← API response types
│
├── scripts/
│   ├── seed-symbols.ts          ← ดึง SET symbol list → SQLite
│   └── manual-scan.ts           ← Test scan แบบ on-demand
│
└── data/
    └── vcp.db                   ← SQLite file
```

---

## Part VI — Database Schema (Drizzle)

```typescript
// server/db/schema.ts
import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core'

export const markets = sqliteTable('markets', {
  id:       text('id').primaryKey(),     // 'SET', 'NASDAQ'
  name:     text('name').notNull(),
  currency: text('currency').notNull(),
  timezone: text('timezone').notNull(),
})

export const symbols = sqliteTable('symbols', {
  symbol:   text('symbol').notNull(),
  marketId: text('market_id').notNull().references(() => markets.id),
  name:     text('name'),
  sector:   text('sector'),
  active:   integer('active', { mode: 'boolean' }).default(true),
}, t => ({ pk: { columns: [t.symbol, t.marketId] } }))

export const alerts = sqliteTable('alerts', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  date:        text('date').notNull(),       // YYYY-MM-DD
  symbol:      text('symbol').notNull(),
  marketId:    text('market_id').notNull(),
  strategyId:  text('strategy_id').notNull(), // 'vcp-minervini'
  
  // Core
  sepaScore:     real('sepa_score').notNull(),
  alertLevel:    text('alert_level').notNull(),   // 'HIGH' | 'MEDIUM' | 'WATCH'
  price:         real('price').notNull(),
  priceChangePct: real('price_change_pct'),
  
  // VCP
  vcpQuality:       text('vcp_quality'),         // 'TIGHT' | 'STANDARD' | 'WIDE' | 'LOOSE'
  vcpQualityScore:  integer('vcp_quality_score'),
  vcpContractions:  integer('vcp_contractions'),
  vcpVolDrying:     integer('vcp_vol_drying', { mode: 'boolean' }),
  pivotPrice:       real('pivot_price'),
  pivotDistancePct: real('pivot_distance_pct'),
  
  // SEPA breakdown
  scoreC1: real('score_c1'),  scoreC2: real('score_c2'),
  scoreC3: real('score_c3'),  scoreC4: real('score_c4'),
  scoreC5: real('score_c5'),  scoreC6: real('score_c6'),
  scoreC7: real('score_c7'),
  
  // Raw data for sparkline (JSON-encoded number[])
  prices60d:  text('prices_60d'),
  volumes60d: text('volumes_60d'),
  
  // Full details (escape hatch สำหรับข้อมูลที่ strategy เพิ่มเข้ามา)
  details: text('details'),                 // JSON
  
  createdAt: text('created_at').default(`datetime('now')`),
}, t => ({
  uniqDateSymbolStrategy: { columns: [t.date, t.symbol, t.strategyId, t.marketId] },
  idxDate:     index('idx_date').on(t.date),
  idxSymbol:   index('idx_symbol').on(t.symbol),
  idxLevel:    index('idx_level').on(t.alertLevel),
  idxScore:    index('idx_score').on(t.sepaScore),
}))

export const scanRuns = sqliteTable('scan_runs', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  date:        text('date').notNull(),
  marketId:    text('market_id').notNull(),
  strategyId:  text('strategy_id').notNull(),
  startedAt:   text('started_at').notNull(),
  finishedAt:  text('finished_at'),
  totalScanned: integer('total_scanned'),
  totalPassed:  integer('total_passed'),
  status:      text('status'),               // 'running' | 'success' | 'failed'
  errorMsg:    text('error_msg'),
})

// Price cache — avoid re-fetching yfinance
export const priceCache = sqliteTable('price_cache', {
  symbol:    text('symbol').notNull(),
  marketId:  text('market_id').notNull(),
  date:      text('date').notNull(),
  open:      real('open'),  high: real('high'), low: real('low'),
  close:     real('close'), volume: integer('volume'),
  fetchedAt: text('fetched_at').notNull(),
}, t => ({
  pk: { columns: [t.symbol, t.marketId, t.date] },
}))
```

---

## Part VII — Rate Limiting Strategy

ปัญหา: scan 800+ หุ้น SET = 800+ requests ไปยัง Yahoo Finance  
Solution: **Token Bucket** + **Persistent Cache**

```typescript
// server/core/rate-limiter.ts
export class TokenBucket {
  constructor(
    private capacity:    number,  // 60 tokens
    private refillRate:  number,  // 1 token per 200ms = 5 req/s
  ) { ... }
  
  async acquire(): Promise<void> {
    while (this.tokens < 1) {
      await sleep(this.refillMs)
      this.refill()
    }
    this.tokens -= 1
  }
}

// Yahoo Finance: safe rate ≈ 5 req/s sustained, 60 burst
const yahooBucket = new TokenBucket(60, 200)

// Wrap fetch with rate limit
async function fetchPriceWithLimit(symbol: string) {
  await yahooBucket.acquire()
  return await yahoo.historical(symbol, { period1, period2 })
}

// Parallelism: 5 workers max
await pMap(symbols, fetchPriceWithLimit, { concurrency: 5 })
```

**Cache layers:**

| Data | TTL | Hit Rate ≈ |
|---|---|---|
| Price history (last 6mo) | 4 hours | 95% (after first scan of day) |
| Fundamentals (EPS, Revenue) | 7 days | 99% (quarterly updates) |
| Symbol list | 30 days | 100% |
| Market index (SET) | 30 min | 80% |

→ **Day 2 scan ของ symbol เดิม = 0 API calls** (อ่านจาก cache อย่างเดียว)  
→ Full day scan ครั้งแรก ≈ 3-5 นาที (800 stocks × ~250ms)

---

## Part VIII — Bun Scheduler (replace cron)

```typescript
// server/core/scheduler.ts
import { CronJob } from 'cron'   // tiny npm package

export function startScheduler() {
  // EOD scan: 16:30 จ-ศ, Bangkok time
  new CronJob(
    '30 16 * * 1-5',
    async () => await runEodScan({ market: SET, strategy: VcpMinervini }),
    null, true, 'Asia/Bangkok'
  )
  
  // Daily cleanup: 04:00
  new CronJob('0 4 * * *', cleanupOldAlerts, null, true, 'Asia/Bangkok')
  
  console.log('[Scheduler] Started')
}

// Manual trigger via API
app.post('/api/scan/trigger', async c => {
  const { marketId, strategyId } = await c.req.json()
  
  // ทำงาน async, return immediately
  runEodScan({ market: getMarket(marketId), strategy: getStrategy(strategyId) })
    .catch(err => console.error('[Scan failed]', err))
  
  return c.json({ status: 'queued' })
})
```

---

## Part IX — Implementation Phases

### Phase 1 — Foundation (2 วัน)
```
□ bun init project structure
□ Drizzle schema + migrations
□ Core types (Market, DataProvider, Strategy)
□ Yahoo provider with rate limiter + cache
□ SET market definition
□ symbol seeder script
□ Manual fetch test: bun run scripts/manual-scan.ts PTT
```

### Phase 2 — Strategy Port (2 วัน) **← CRITICAL**
```
□ Port indicators (SMA, slope, swing-high/low)
□ Port detect_vcp() — line by line จาก Python
□ Port 7 SEPA criteria — function ละ 1 file
□ Port classifyAlert
□ Unit tests: VCP detector ต้องให้ผลตรงกับ Python implementation
   (ใช้ PTT, AOT, CPALL, BANPU เป็น test cases)
□ Side-by-side validation: TS output == Python output
```

### Phase 3 — Scanner Orchestration (1 วัน)
```
□ Scanner: fetch → strategy → save
□ Scheduler: cron-based EOD trigger
□ Batch + concurrent (with rate limit)
□ scan_runs logging
□ Cleanup job
```

### Phase 4 — API (1 วัน)
```
□ Hono routes: GET /api/alerts, /api/stock/:sym, /api/history
□ Zod validation on all inputs
□ ETag + Cache-Control headers
□ Static file serving for web/dist
```

### Phase 5 — Frontend (4 วัน)
```
□ Vite + React + TanStack Router setup
□ tokens.css จาก DESIGN.md
□ AlertTable (TanStack Table + virtualization)
□ DetailPanel + SepaScoreRing + VcpChart + PriceChart
□ FilterBar + MarketSelector
□ History view
```

### Phase 6 — Deploy (0.5 วัน)
```
□ bun build (single binary output)
□ systemd service (replace old Python cron)
□ Keep old Python scanner running until validated
□ Cut over after 1 week of side-by-side validation
```

**Total: ~10-11 working days**

---

## Part X — Extension Roadmap (Future)

### 10.1 เพิ่มตลาด US (~1-2 วัน)
```typescript
// 1. สร้าง markets/nasdaq.ts (10 บรรทัด)
// 2. ดึง SP500 symbols (sp500-typescript-list npm package)
// 3. Update preFilter: minPrice=5, minAvgVol=1M
// 4. UI: เพิ่ม Market selector tab
// 5. เสร็จ
```

### 10.2 เพิ่ม Strategy ใหม่ (~1-2 วัน per strategy)
```typescript
// strategies/momentum.ts
export const MomentumStrategy: Strategy = {
  id: 'momentum-12m',
  scan({ prices, marketIndex }) {
    const return12m = (prices.at(-1)!.close - prices.at(-252)!.close) / prices.at(-252)!.close
    const rsScore = rankInUniverse(symbol, return12m)
    return {
      passes: rsScore > 0.90,
      score: rsScore * 100,
      alertLevel: rsScore > 0.95 ? 'HIGH' : 'MEDIUM',
      details: { return12m },
    }
  }
}

// UI: เพิ่ม Strategy tab — ไม่ต้องแก้ table component
```

### 10.3 เพิ่ม Data Provider ใหม่ (~1 วัน)
```typescript
// providers/alphavantage.ts
export class AlphaVantageProvider implements DataProvider {
  async fetchPrices(symbol, market, period) { ... }
  async fetchFundamentals(symbol, market) { ... }
}

// Fallback chain
const providers = [yahooProvider, alphaVantageProvider, finnhubProvider]
```

### 10.4 เพิ่ม Crypto (~2 วัน)
```typescript
export const BINANCE: Market = {
  id: 'BINANCE', currency: 'USDT',
  yahooSuffix: '-USD',
  preFilter: { minPrice: 0, minAvgVol: 10_000_000 },
  symbols: async () => topByVolume(200),
}
// ใช้ provider ใหม่ — binance.com public API ฟรี
```

---

## Part XI — Why This is Insanely Great

### ความสง่างามที่ซ่อนอยู่

1. **Strategy/Market/Provider เป็น 3 axis ตั้งฉาก**  
   เพิ่ม market 1 ตัว = ใช้ได้กับทุก strategy  
   เพิ่ม strategy 1 ตัว = ใช้ได้กับทุก market  
   เพิ่ม provider 1 ตัว = backup ของ provider เดิม  
   → 3 markets × 3 strategies × 2 providers = **18 combinations** จาก 8 files

2. **Type safety end-to-end**  
   Drizzle schema → API types → React Query types → component props  
   เปลี่ยน schema 1 จุด → TypeScript บอกที่ต้องแก้ทั้งหมด

3. **Zero deployment complexity**  
   `bun build → 1 binary → systemd start → done`  
   ไม่มี nginx, ไม่มี pm2, ไม่มี docker (ถ้าไม่ต้องการ)

4. **Speed budget**  
   - Cold scan 800 stocks: 3-5 นาที (network-bound)  
   - Warm scan (cached): 30-60 วินาที  
   - API response: <50ms (SQLite local query)  
   - Frontend TTI: <1s

5. **No lock-in**  
   ทุก library MIT/Apache, SQLite file portable, สามารถย้ายไป Cloudflare D1 หรือ Postgres ได้ภายในชั่วโมงเดียว

---

## Part XII — สรุป Decision

> **เริ่มต้นใหม่ — แต่ port logic จาก `sepa_scanner.py` แบบบรรทัดต่อบรรทัด**

| คำถาม | คำตอบ |
|---|---|
| มี repo ตั้งต้นที่ใช่ไหม? | ❌ ไม่มี (TS) |
| จะ fork Python มาห่อด้วย web ดีไหม? | ❌ ขัดกับ requirement "no Python" |
| จะ port logic + build fresh frontend? | ✅ **ใช่ — ทางที่ถูกต้อง** |
| Stack? | **Bun + Hono + Drizzle + Vite + React** |
| Time? | ~10-11 วัน fully functional |
| Future-proof? | ✅ Market/Strategy/Provider abstractions |

**ขั้นตอนถัดไป:**  
1. ยืนยัน stack ทุกอย่าง  
2. เริ่ม Phase 1: `bun init` + Drizzle schema  
3. Side-by-side validate กับ `sepa_scanner.py` ทุกขั้นตอน Phase 2

---

*"Simplicity is the ultimate sophistication."*  
*— Leonardo da Vinci*
