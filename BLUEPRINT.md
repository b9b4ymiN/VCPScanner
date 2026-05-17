# VCP Scanner — BLUEPRINT.md
> Full System Blueprint — Web Application  
> Logic: 100% ตาม sepa_scanner.py (ห้ามแก้ไข algorithm)  
> Version: 1.0.0 | Updated: 2026-05-16

---

## 0. Executive Summary

ระบบ **Web Dashboard สำหรับดู VCP Alerts** บนหุ้น SET ไทย

**Goal:** ดู alerts แบบ EOD, cache วันต่อวัน, เร็ว, ฟรี  
**Not Goal:** Real-time trading, Backtesting, Signal ใหม่ (logic เดิมทั้งหมด)

```
sepa_scanner.py ──scan──► SQLite DB ──read──► FastAPI ──serve──► React Dashboard
     (ไม่แตะ)              (cache)    (query)   (REST)    (SPA)    (blur.io UI)
```

---

## 1. VCP & SEPA Rules (Immutable — ห้ามแก้ไข)

> ⚠️ Section นี้คือ ground truth — ทุกส่วนของระบบ implement ตามนี้ทุกตัวอักษร

### 1.1 Pre-filter (Hard Gate)

ตัดก่อน scan — **ไม่ผ่าน 3 ข้อนี้ ไม่ประเมินต่อ**

| เงื่อนไข | ค่า | ฟิลด์ |
|---|---|---|
| ราคาปัจจุบัน | ≥ ฿2.00 | `current_price >= 2.0` |
| Avg Volume 20 วัน | ≥ 200,000 หุ้น | `avg_vol_20d >= 200000` |
| ข้อมูลราคาขั้นต่ำ | ≥ 60 วัน | `len(price_data) >= 60` |

### 1.2 SEPA 7 Criteria Scoring (รวม 100 คะแนน)

**เกณฑ์แสดงผล: SEPA Score ≥ 60**

---

#### Criterion 1 — Super Performance (max 15 pts)

```python
# RS vs SET Index (4 time frames)
for period in ['1M', '3M', '6M', '1Y']:
    rs_diff = stock_return[period] - set_return[period]
    if rs_diff > 0.20:   score += 1.5
    elif rs_diff > 0.10: score += 1.0
    elif rs_diff > 0.00: score += 0.5

# 52-Week High proximity
from_52w_high = (price_52w_high - current_price) / price_52w_high
if from_52w_high <= 0.05:   score += 3
elif from_52w_high <= 0.10: score += 2
elif from_52w_high <= 0.20: score += 1

# MA Alignment
if current_price > ma50 > ma150 > ma200: score += 3

# MA200 Uptrend (slope ขึ้นในช่วง 20 วันล่าสุด)
ma200_slope = (ma200_today - ma200_20d_ago) / ma200_20d_ago
if ma200_slope > 0: score += 3
```

---

#### Criterion 2 — Earnings (max 20 pts)

```python
if eps_growth_yoy > 0.50:  score += 10
elif eps_growth_yoy > 0.20: score += 5

if revenue_growth_yoy > 0.20: score += 5

if profit_margin > 0: score += 3

if roe > 0.15: score += 2
```

---

#### Criterion 3 — Catalyst (max 10 pts)

```python
# Auto-detect จาก yfinance news (ข่าวล่าสุด)
news = yf.Ticker(symbol).news
# scoring ตาม keyword + recency ของข่าว
```

---

#### Criterion 4 — Supply/Demand / VCP (max 20 pts)

```python
# Volume Pattern Base: 0–10 pts (ตาม volume behavior ช่วง base)
volume_score = analyze_volume_base(price_data, volume_data)  # 0-10

# VCP Detection Bonus: +quality_score (0–10 pts) ถ้า is_vcp=True
vcp_result = detect_vcp(price_data, volume_data)
if vcp_result['is_vcp']:
    score += volume_score + vcp_result['quality_score']
else:
    score += volume_score
```

---

#### Criterion 5 — Leadership (max 10 pts)

```python
# Top performer ในกลุ่มอุตสาหกรรม/sector เดียวกัน
sector_peers = get_sector_peers(symbol)
percentile = rank_in_sector(symbol, sector_peers)
if percentile >= 0.90: score += 10
elif percentile >= 0.70: score += 7
elif percentile >= 0.50: score += 5
```

---

#### Criterion 6 — Sponsorship (max 10 pts)

```python
if institutional_holding > 0.10: score += 5  # Institutional > 10%
if insider_holding > 0.05:       score += 5  # Insider > 5%
```

---

#### Criterion 7 — Market Direction (max 15 pts)

```python
set_price  = get_set_index_price()
set_ma50   = calculate_ma(set_prices, 50)
set_ma200  = calculate_ma(set_prices, 200)

if set_price > set_ma50 > set_ma200:  # Uptrend
    score += 15
elif set_ma50 < set_ma200:            # Downtrend
    score += 0
else:                                  # Sideways
    score += 5
```

---

### 1.3 VCP Detection Algorithm (`detect_vcp()`)

**Input:** ข้อมูล 60 วันล่าสุด, Swing window = 5 วัน

```python
def detect_vcp(prices, volumes, window=5, lookback=60):
    """
    Returns: {
        'is_vcp': bool,
        'quality_score': int (0-10),
        'quality_label': str,  # TIGHT/STANDARD/WIDE/LOOSE
        'contractions': list,
        'contraction_ratios': list,
        'vol_drying': bool,
        'pivot_price': float,
        'pivot_distance_pct': float,
        'swing_highs': list,
        'swing_lows': list,
    }
    """
```

**Step 1 — หา Swing Highs / Lows**

```python
swing_highs = []
swing_lows  = []
for i in range(window, len(prices) - window):
    # Swing High: ราคาวันนั้น >= max ของ ±5 วันรอบข้าง
    if prices[i] == max(prices[i-window:i+window+1]):
        swing_highs.append((i, prices[i]))
    if prices[i] == min(prices[i-window:i+window+1]):
        swing_lows.append((i, prices[i]))

# เงื่อนไขขั้นต่ำ: ต้องมี swing_highs >= 2 AND swing_lows >= 1
if len(swing_highs) < 2 or len(swing_lows) < 1:
    return {'is_vcp': False, 'quality_score': 0, ...}
```

**Step 2 — คำนวณ Contractions**

```python
contractions = []
for i in range(len(swing_highs) - 1):
    h_i   = swing_highs[i][1]
    h_next = swing_highs[i+1][1]
    # หา Low ระหว่าง swing_high[i] และ swing_high[i+1]
    idx_start = swing_highs[i][0]
    idx_end   = swing_highs[i+1][0]
    low_between = min(prices[idx_start:idx_end+1])
    depth = (h_i - low_between) / h_i
    contractions.append(depth)

# ต้องมี contractions >= 2
if len(contractions) < 2:
    return {'is_vcp': False, ...}
```

**Step 3 — Contraction Ratios**

```python
ratios = []
for i in range(1, len(contractions)):
    ratio = contractions[i] / contractions[i-1]
    ratios.append(ratio)
# ดีสุด: ratio ทุกตัว < 1.0 (แต่ละ contraction เล็กกว่าอันก่อน)
```

**Step 4 — Volume Drying (ผ่านอย่างน้อย 1 ใน 2)**

```python
half = len(volumes) // 2
# เงื่อนไข A: Volume ครึ่งหลัง < ครึ่งแรก
cond_a = mean(volumes[half:]) < mean(volumes[:half])

# เงื่อนไข B: Volume 10 วันล่าสุด < 70% ของ mean 60 วัน
cond_b = mean(volumes[-10:]) < 0.70 * mean(volumes)

vol_drying = cond_a or cond_b
```

**Step 5 — Quality Scoring**

```python
quality_score = 0

# Ratio quality
if all(r < 1.0 for r in ratios):    quality_score += 3
elif ratios[0] < 1.0:               quality_score += 1

# Contraction count (ideal = 2–4)
n = len(contractions)
if 2 <= n <= 4:                     quality_score += 3
elif n >= 2:                        quality_score += 2  # > 4 แต่ยังผ่าน

# Pivot Distance (ระยะจาก current price ถึง last swing high)
pivot = swing_highs[-1][1]
pivot_dist = (pivot - prices[-1]) / pivot
if pivot_dist < 0.03:               quality_score += 2
elif pivot_dist < 0.05:             quality_score += 1

# Volume Drying
if vol_drying:                      quality_score += 2

# is_vcp = True ถ้า quality_score >= 5
is_vcp = (quality_score >= 5)
```

**Quality Labels**

| Label | quality_score | ความหมาย |
|---|---|---|
| 🟢 TIGHT | ≥ 8 | Ideal Minervini VCP |
| 🟡 STANDARD | 5–7 | ผ่านเกณฑ์ปกติ |
| 🟠 WIDE | 3–4 | หดตัวแต่กว้างเกินไป |
| 🔴 LOOSE | 0–2 | ไม่ผ่าน |

### 1.4 Alert Trigger Rules

**แจ้งเตือนเมื่อผ่านทั้งหมด:**

```python
def should_alert(stock):
    return (
        stock['sepa_score'] >= 60
        and stock['is_vcp'] == True        # quality_score >= 5
        and stock['current_price'] >= 2.0
        and stock['avg_vol_20d'] >= 200000
    )
```

**Alert Levels**

| Level | Condition |
|---|---|
| 🔥 HIGH | VCP TIGHT (`quality_score >= 8`) AND SEPA ≥ 75 AND pivot_distance < 3% |
| ⚡ MEDIUM | VCP STANDARD (5–7) AND SEPA ≥ 65 AND pivot_distance < 5% |
| 📌 WATCH | VCP any (`is_vcp=True`) AND SEPA ≥ 60 AND pivot_distance < 8% |

```python
def classify_alert(stock):
    q  = stock['vcp_quality_score']
    s  = stock['sepa_score']
    pd = stock['pivot_distance_pct']
    if q >= 8 and s >= 75 and pd < 0.03:  return 'HIGH'
    if q >= 5 and s >= 65 and pd < 0.05:  return 'MEDIUM'
    return 'WATCH'
```

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRON (16:30 วัน-ศ)                           │
│                        scheduler.py                                  │
│                             │                                        │
│                    sepa_scanner.py (ไม่แตะ)                         │
│                       scan ทุกหุ้น SET                              │
│                             │                                        │
│                          db.py  →  vcp_alerts.db (SQLite)           │
│                             │                                        │
│              ┌──────────────┼──────────────────┐                    │
│              │                                 │                     │
│           notify.py                        app.py                   │
│    Discord + Email SMTP              FastAPI REST API                │
│              │                                 │                     │
│              ▼                                 ▼                     │
│       Discord Channel              React Dashboard                  │
│       Email Inbox                  (blur.io UI style)               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. File Structure

```
/home/opc/workspace/sepa/
├── sepa_scanner.py               ← ⚠️ ห้ามแตะ (production logic)
│
├── vcp_alert/
│   ├── BLUEPRINT.md              ← ไฟล์นี้
│   ├── DESIGN.md                 ← Design system
│   │
│   ├── backend/
│   │   ├── app.py                ← FastAPI server
│   │   ├── scheduler.py          ← APScheduler + scan wrapper
│   │   ├── notify.py             ← Discord + Email
│   │   ├── db.py                 ← SQLite CRUD
│   │   └── config.yaml           ← credentials + toggles
│   │
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── main.jsx
│           ├── App.jsx
│           ├── styles/
│           │   ├── tokens.css        ← CSS variables (from DESIGN.md)
│           │   ├── table.css
│           │   └── components.css
│           ├── components/
│           │   ├── AlertTable.jsx
│           │   ├── AlertRow.jsx
│           │   ├── DetailPanel.jsx
│           │   ├── SepaScoreRing.jsx
│           │   ├── VcpChart.jsx
│           │   ├── CriteriaBar.jsx
│           │   ├── FilterBar.jsx
│           │   ├── StatBar.jsx
│           │   ├── Sparkline.jsx
│           │   └── Toast.jsx
│           ├── stores/
│           │   └── alertStore.js     ← Zustand
│           └── api/
│               └── client.js         ← TanStack Query + fetch
│
└── data/
    └── vcp_alerts.db             ← SQLite (30 วัน history)
```

---

## 4. Data Layer (db.py)

### 4.1 SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date            TEXT NOT NULL,        -- YYYY-MM-DD (วันที่ scan)
    symbol          TEXT NOT NULL,
    name            TEXT,                 -- ชื่อบริษัท
    sector          TEXT,
    sepa_score      REAL NOT NULL,
    alert_level     TEXT NOT NULL,        -- HIGH / MEDIUM / WATCH
    price           REAL NOT NULL,
    price_change_pct REAL,               -- % change วันนั้น
    pivot_price     REAL,
    pivot_dist_pct  REAL,
    vcp_quality     TEXT,                 -- TIGHT / STANDARD / WIDE / LOOSE
    vcp_quality_score INTEGER,
    contractions    INTEGER,
    contraction_ratios_json TEXT,         -- JSON array
    vol_drying      INTEGER DEFAULT 0,    -- boolean 0/1
    vol_avg_20d     REAL,
    
    -- SEPA breakdown (store per criterion)
    score_c1_superperf  REAL,
    score_c2_earnings   REAL,
    score_c3_catalyst   REAL,
    score_c4_supply     REAL,
    score_c5_leadership REAL,
    score_c6_sponsor    REAL,
    score_c7_market     REAL,
    
    -- Cached market data (avoid re-fetch)
    ma50            REAL,
    ma150           REAL,
    ma200           REAL,
    high_52w        REAL,
    
    -- Raw price/volume for sparkline (JSON array, 60 days)
    prices_60d_json TEXT,
    volumes_60d_json TEXT,
    
    -- Notification
    notified_discord INTEGER DEFAULT 0,
    notified_email   INTEGER DEFAULT 0,
    
    created_at      TEXT DEFAULT (datetime('now','localtime')),
    
    UNIQUE(date, symbol)   -- ป้องกัน duplicate
);

CREATE INDEX IF NOT EXISTS idx_date     ON alerts(date);
CREATE INDEX IF NOT EXISTS idx_symbol   ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_level    ON alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_score    ON alerts(sepa_score DESC);

-- Scan log (track scan runs)
CREATE TABLE IF NOT EXISTS scan_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    total_scanned INTEGER,
    total_alerts  INTEGER,
    status      TEXT,   -- running / success / failed
    error_msg   TEXT
);
```

### 4.2 CRUD Functions

```python
# db.py
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path('/home/opc/workspace/sepa/data/vcp_alerts.db')

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # better concurrent reads
    conn.execute("PRAGMA synchronous=NORMAL") # fast writes
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """สร้าง schema ถ้ายังไม่มี"""
    with get_conn() as conn:
        conn.executescript(SCHEMA_SQL)

def upsert_alert(alert_data: dict):
    """Insert หรือ Update alert (UPSERT by date+symbol)"""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO alerts (date, symbol, name, sector, sepa_score, ...)
            VALUES (:date, :symbol, :name, :sector, :sepa_score, ...)
            ON CONFLICT(date, symbol) DO UPDATE SET
                sepa_score = excluded.sepa_score,
                updated_at = datetime('now','localtime')
        """, alert_data)

def get_alerts_by_date(date: str) -> list[dict]:
    """ดึง alerts ของวันนั้น เรียงตาม sepa_score DESC"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM alerts
            WHERE date = ?
            ORDER BY sepa_score DESC
        """, (date,)).fetchall()
    return [dict(r) for r in rows]

def get_alert_detail(symbol: str, date: str) -> dict:
    """ดึง full detail รวม sparkline data"""
    with get_conn() as conn:
        row = conn.execute("""
            SELECT * FROM alerts WHERE symbol=? AND date=?
        """, (symbol, date)).fetchone()
    return dict(row) if row else None

def get_history(days: int = 30) -> list[dict]:
    """สรุป daily stats ย้อนหลัง N วัน"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT
                date,
                COUNT(*) as total_alerts,
                SUM(alert_level='HIGH') as high_count,
                SUM(alert_level='MEDIUM') as medium_count,
                SUM(alert_level='WATCH') as watch_count,
                AVG(sepa_score) as avg_score
            FROM alerts
            WHERE date >= date('now', '-' || ? || ' days')
            GROUP BY date
            ORDER BY date DESC
        """, (days,)).fetchall()
    return [dict(r) for r in rows]

def mark_notified(alert_id: int, channel: str):
    """Mark ว่าส่ง notification แล้ว"""
    col = f'notified_{channel}'  # notified_discord / notified_email
    with get_conn() as conn:
        conn.execute(f"UPDATE alerts SET {col}=1 WHERE id=?", (alert_id,))

def get_unnotified_alerts(date: str, channel: str) -> list[dict]:
    """ดึง alerts ที่ยังไม่ได้ส่ง notification"""
    col = f'notified_{channel}'
    with get_conn() as conn:
        rows = conn.execute(f"""
            SELECT * FROM alerts
            WHERE date=? AND {col}=0
            ORDER BY sepa_score DESC
        """, (date,)).fetchall()
    return [dict(r) for r in rows]

def cleanup_old_data(keep_days: int = 30):
    """ลบข้อมูลเก่ากว่า 30 วัน"""
    with get_conn() as conn:
        conn.execute("""
            DELETE FROM alerts
            WHERE date < date('now', '-' || ? || ' days')
        """, (keep_days,))
```

---

## 5. Data Fetching Strategy (Rate Limit Safe)

### 5.1 ปัญหา Rate Limit

**yfinance** ใช้ Yahoo Finance API ซึ่งมี rate limit ไม่ official แต่ถ้า request เยอะเกินจะ block

**หุ้น SET มีประมาณ 700+ ตัว** → ต้อง scan อย่างระวัง

### 5.2 Smart Batching Strategy

```python
# scheduler.py

import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

BATCH_SIZE     = 20       # scan ทีละ 20 ตัว
BATCH_DELAY    = 2.0      # รอ 2 วินาทีระหว่าง batch
REQUEST_DELAY  = 0.3      # รอ 0.3s ระหว่าง request ใน batch
MAX_WORKERS    = 5        # parallel สูงสุด 5 threads ใน batch
JITTER         = 0.1      # random ± 0.1s (เพื่อไม่ให้ request ตรงกัน)

def scan_batch(symbols: list[str], date: str) -> list[dict]:
    """Scan หุ้น 1 batch พร้อมกัน (max MAX_WORKERS parallel)"""
    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(scan_single, sym, date): sym for sym in symbols}
        for future in as_completed(futures):
            sym = futures[future]
            try:
                result = future.result(timeout=30)
                if result:
                    results.append(result)
            except Exception as e:
                log.warning(f"Failed {sym}: {e}")
            # Jitter ระหว่าง request
            time.sleep(REQUEST_DELAY + random.uniform(-JITTER, JITTER))
    return results

def run_full_scan(date: str):
    """Full EOD scan พร้อม rate-limit protection"""
    symbols = get_all_set_symbols()  # ~700 ตัว
    log.info(f"Starting scan: {len(symbols)} symbols")
    
    all_alerts = []
    batches = [symbols[i:i+BATCH_SIZE] for i in range(0, len(symbols), BATCH_SIZE)]
    
    for i, batch in enumerate(batches):
        log.info(f"Batch {i+1}/{len(batches)}: {batch[:3]}...")
        results = scan_batch(batch, date)
        all_alerts.extend(results)
        
        # Inter-batch delay (ยกเว้น batch สุดท้าย)
        if i < len(batches) - 1:
            delay = BATCH_DELAY + random.uniform(0, 0.5)
            time.sleep(delay)
    
    return all_alerts
```

### 5.3 Data Caching (ลด yfinance calls)

```python
# cache.py — SQLite-based disk cache (ไม่ต้องการ Redis)

import sqlite3, json, hashlib
from datetime import datetime, timedelta

CACHE_DB = '/home/opc/workspace/sepa/data/cache.db'

# Cache TTL
CACHE_TTL = {
    'price_history':   timedelta(hours=4),    # ราคาย้อนหลัง (เปลี่ยนช้า)
    'fundamentals':    timedelta(days=1),      # EPS, Revenue (เปลี่ยนรายไตรมาส)
    'set_index':       timedelta(minutes=30),  # SET index (real-ish)
    'sector_data':     timedelta(days=7),      # Sector ranking (เปลี่ยนช้า)
    'company_info':    timedelta(days=30),     # ชื่อบริษัท, sector
}

def get_cached(key: str, ttl: timedelta) -> dict | None:
    """ดึงจาก cache ถ้ายังไม่ expired"""
    with sqlite3.connect(CACHE_DB) as conn:
        row = conn.execute(
            "SELECT value, cached_at FROM cache WHERE key=?", (key,)
        ).fetchone()
        if not row: return None
        cached_at = datetime.fromisoformat(row[1])
        if datetime.now() - cached_at > ttl: return None
        return json.loads(row[0])

def set_cached(key: str, value: dict):
    with sqlite3.connect(CACHE_DB) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO cache (key, value, cached_at)
            VALUES (?, ?, datetime('now','localtime'))
        """, (key, json.dumps(value)))

# Usage:
def get_price_history(symbol: str) -> list:
    key = f'price:{symbol}'
    cached = get_cached(key, CACHE_TTL['price_history'])
    if cached: return cached
    data = yf.download(f"{symbol}.BK", period="6mo", interval="1d")
    result = data.to_dict('records')
    set_cached(key, result)
    return result
```

### 5.4 Free Data Sources

| ข้อมูล | Source | ฟรี? | Rate Limit |
|---|---|---|---|
| Price OHLCV | `yfinance` (Yahoo) | ✅ | ~2000 req/hr |
| Fundamentals | `yfinance` (Yahoo) | ✅ | เดียวกัน |
| Company info | `yfinance` | ✅ | เดียวกัน |
| SET symbols | SET website / static file | ✅ | None |
| News | `yfinance.news` | ✅ | เดียวกัน |
| Institutional hold | `yfinance.institutional_holders` | ✅ (บางตัว) | เดียวกัน |

```python
# ดึง SET symbols (update เดือนละครั้ง)
def get_all_set_symbols() -> list[str]:
    # Option 1: Static file (ง่ายสุด)
    with open('data/set_symbols.txt') as f:
        return [line.strip() for line in f if line.strip()]
    # Option 2: scrape จาก SET website (ถ้าต้องการ auto-update)
```

---

## 6. Backend API (app.py)

### 6.1 FastAPI Server

```python
# app.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import yaml
from datetime import date, timedelta
from db import get_alerts_by_date, get_alert_detail, get_history
from scheduler import get_scan_status

app = FastAPI(title="VCP Scanner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://0.0.0.0:8765"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Serve React build
app.mount("/static", StaticFiles(directory="frontend/dist"), name="static")

@app.get("/")
async def root():
    return FileResponse("frontend/dist/index.html")
```

### 6.2 API Endpoints

```python
# GET /api/alerts
# ดึง alerts พร้อม filtering
@app.get("/api/alerts")
async def get_alerts(
    date:      str  = Query(default=None),          # YYYY-MM-DD (default=today)
    level:     str  = Query(default=None),           # HIGH/MEDIUM/WATCH
    min_score: float = Query(default=60.0),
    limit:     int  = Query(default=100, le=500),
    offset:    int  = Query(default=0),
):
    target_date = date or str(datetime.now().date())
    alerts = get_alerts_by_date(target_date)
    
    # Filter
    if level:
        alerts = [a for a in alerts if a['alert_level'] == level.upper()]
    alerts = [a for a in alerts if a['sepa_score'] >= min_score]
    
    total = len(alerts)
    alerts = alerts[offset:offset+limit]
    
    return {
        "date": target_date,
        "total": total,
        "alerts": alerts,
    }

# HTTP Cache headers (ETag + max-age)
from fastapi import Response
import hashlib

@app.get("/api/alerts")
async def get_alerts(response: Response, ...):
    ...
    data = {"date": target_date, "total": total, "alerts": alerts}
    etag = hashlib.md5(str(data).encode()).hexdigest()[:8]
    response.headers["Cache-Control"] = "public, max-age=300"   # 5 min
    response.headers["ETag"] = etag
    return data


# GET /api/alerts/{date}
@app.get("/api/alerts/{alert_date}")
async def get_alerts_for_date(alert_date: str):
    alerts = get_alerts_by_date(alert_date)
    return {"date": alert_date, "total": len(alerts), "alerts": alerts}


# GET /api/stock/{symbol}
# Detail + VCP data + sparkline
@app.get("/api/stock/{symbol}")
async def get_stock_detail(
    symbol: str,
    date: str = Query(default=None),
):
    target_date = date or str(datetime.now().date())
    detail = get_alert_detail(symbol, target_date)
    if not detail:
        raise HTTPException(404, f"No data for {symbol} on {target_date}")
    
    # Parse JSON fields
    detail['prices_60d']          = json.loads(detail['prices_60d_json'] or '[]')
    detail['volumes_60d']         = json.loads(detail['volumes_60d_json'] or '[]')
    detail['contraction_ratios']  = json.loads(detail['contraction_ratios_json'] or '[]')
    
    return detail


# GET /api/history
# Daily summary ย้อนหลัง 30 วัน
@app.get("/api/history")
async def get_history_summary(days: int = Query(default=30, le=90)):
    history = get_history(days)
    return {"days": days, "history": history}


# GET /api/status
# สถานะ scan ล่าสุด
@app.get("/api/status")
async def get_status():
    return {
        "last_scan":  get_last_scan_info(),
        "next_scan":  get_next_scan_time(),
        "db_size_mb": get_db_size_mb(),
    }


# POST /api/config
# Toggle Discord/Email on/off
@app.post("/api/config")
async def update_config(body: dict):
    allowed_keys = {'discord_enabled', 'email_enabled', 'min_sepa_score'}
    payload = {k: v for k, v in body.items() if k in allowed_keys}
    update_yaml_config(payload)
    return {"status": "ok", "updated": list(payload.keys())}


# POST /api/scan/trigger
# Manual trigger สำหรับ test
@app.post("/api/scan/trigger")
async def trigger_scan(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_eod_scan)
    return {"status": "queued", "message": "Scan started in background"}
```

---

## 7. Scheduler (scheduler.py)

```python
# scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import sys
sys.path.insert(0, '/home/opc/workspace/sepa')
import sepa_scanner   # ← import จาก production
from db import upsert_alert, log_scan_start, log_scan_finish, cleanup_old_data
from notify import send_discord_alerts, send_email_alerts

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job(
    CronTrigger(
        day_of_week='mon-fri',
        hour=16, minute=30,
        timezone='Asia/Bangkok'
    )
)
async def eod_scan_job():
    await run_eod_scan()

async def run_eod_scan():
    """Main EOD scan workflow"""
    today = str(datetime.now().date())
    scan_id = log_scan_start(today)
    
    try:
        log.info(f"[EOD SCAN] Starting: {today}")
        
        # 1. รัน scanner (logic จาก sepa_scanner.py)
        symbols = get_all_set_symbols()
        results = await asyncio.get_event_loop().run_in_executor(
            None,  # thread pool
            lambda: sepa_scanner.scan_all(symbols)  # blocking I/O
        )
        
        # 2. Filter และ save alerts
        alerts = []
        for r in results:
            if should_alert(r):
                r['alert_level'] = classify_alert(r)
                r['date'] = today
                upsert_alert(r)
                alerts.append(r)
        
        log.info(f"[EOD SCAN] {len(alerts)} alerts found")
        
        # 3. Send notifications
        cfg = load_config()
        if cfg['notifications']['discord']['enabled']:
            await send_discord_alerts(alerts, cfg['notifications']['discord'])
        if cfg['notifications']['email']['enabled']:
            await send_email_alerts(alerts, cfg['notifications']['email'])
        
        # 4. Cleanup old data
        cleanup_old_data(keep_days=30)
        
        log_scan_finish(scan_id, len(symbols), len(alerts), 'success')
        
    except Exception as e:
        log_scan_finish(scan_id, 0, 0, 'failed', str(e))
        log.error(f"[EOD SCAN] Failed: {e}")
        raise
```

---

## 8. Notifications (notify.py)

### 8.1 Discord Webhook

```python
# notify.py
import aiohttp, json

async def send_discord_alerts(alerts: list[dict], config: dict):
    if not alerts: return
    
    webhook_url = config['webhook_url']
    
    # Group by level
    high   = [a for a in alerts if a['alert_level'] == 'HIGH']
    medium = [a for a in alerts if a['alert_level'] == 'MEDIUM']
    watch  = [a for a in alerts if a['alert_level'] == 'WATCH']
    
    # Summary embed
    summary = {
        "embeds": [{
            "title": f"🎯 VCP Scanner — {alerts[0]['date']}",
            "color": 0xF56900,  # orange
            "fields": [
                {"name": "🔥 HIGH",   "value": str(len(high)),   "inline": True},
                {"name": "⚡ MEDIUM", "value": str(len(medium)), "inline": True},
                {"name": "📌 WATCH",  "value": str(len(watch)),  "inline": True},
            ],
            "footer": {"text": "VCP Scanner | SET Thailand"},
        }]
    }
    
    async with aiohttp.ClientSession() as session:
        # ส่ง summary
        await session.post(webhook_url, json=summary)
        await asyncio.sleep(0.5)
        
        # ส่ง HIGH alerts แบบ detailed (max 5 ตัว ป้องกัน spam)
        for alert in high[:5]:
            embed = format_alert_embed(alert)
            await session.post(webhook_url, json={"embeds": [embed]})
            await asyncio.sleep(0.5)

def format_alert_embed(alert: dict) -> dict:
    level_colors = {'HIGH': 0xF56900, 'MEDIUM': 0xEAB308, 'WATCH': 0x60A5FA}
    return {
        "title": f"{alert['symbol']} — {alert['name']}",
        "color": level_colors.get(alert['alert_level'], 0x8B8A96),
        "fields": [
            {"name": "SEPA Score", "value": f"{alert['sepa_score']:.1f}/100", "inline": True},
            {"name": "VCP",        "value": alert['vcp_quality'],             "inline": True},
            {"name": "Price",      "value": f"฿{alert['price']:.2f}",        "inline": True},
            {"name": "Pivot Dist", "value": f"{alert['pivot_dist_pct']*100:.1f}%", "inline": True},
        ],
    }
```

### 8.2 Email SMTP

```python
async def send_email_alerts(alerts: list[dict], config: dict):
    if not alerts or not config.get('to'): return
    
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    
    html_body = generate_email_html(alerts)
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"VCP Alerts {alerts[0]['date']} — {len(alerts)} stocks"
    msg['From']    = config['username']
    msg['To']      = ', '.join(config['to'])
    msg.attach(MIMEText(html_body, 'html'))
    
    with smtplib.SMTP(config['smtp_host'], config['smtp_port']) as server:
        server.starttls()
        server.login(config['username'], config['password'])
        server.sendmail(config['username'], config['to'], msg.as_string())
```

---

## 9. Frontend (React)

### 9.1 State Management (Zustand)

```javascript
// stores/alertStore.js
import { create } from 'zustand'

export const useAlertStore = create((set, get) => ({
  // State
  selectedDate:  new Date().toISOString().split('T')[0],
  levelFilter:   'ALL',        // ALL | HIGH | MEDIUM | WATCH
  minScore:      60,
  selectedAlert: null,         // alert ที่เปิด detail panel
  sortBy:        'sepa_score',
  sortDir:       'desc',

  // Actions
  setDate:         (date)    => set({ selectedDate: date }),
  setLevelFilter:  (level)   => set({ levelFilter: level }),
  setMinScore:     (score)   => set({ minScore: score }),
  selectAlert:     (alert)   => set({ selectedAlert: alert }),
  closeDetail:     ()        => set({ selectedAlert: null }),
  setSort:         (col)     => set(state => ({
    sortBy:  col,
    sortDir: state.sortBy === col && state.sortDir === 'desc' ? 'asc' : 'desc',
  })),
}))
```

### 9.2 API Client (TanStack Query)

```javascript
// api/client.js
import { useQuery } from '@tanstack/react-query'

const BASE_URL = '/api'

// Fetch alerts สำหรับวันที่เลือก (cache 5 นาที)
export function useAlerts(date, filters = {}) {
  const params = new URLSearchParams({ date, ...filters })
  return useQuery({
    queryKey: ['alerts', date, filters],
    queryFn:  () => fetch(`${BASE_URL}/alerts?${params}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,       // 5 min (EOD data ไม่เปลี่ยน)
    gcTime:    30 * 60 * 1000,      // keep 30 min in memory
    refetchOnWindowFocus: false,    // ไม่ refetch เมื่อ focus window
  })
}

// Detail stock
export function useStockDetail(symbol, date) {
  return useQuery({
    queryKey: ['stock', symbol, date],
    queryFn:  () => fetch(`${BASE_URL}/stock/${symbol}?date=${date}`).then(r => r.json()),
    enabled:  !!symbol,
    staleTime: 10 * 60 * 1000,
  })
}

// History
export function useHistory(days = 30) {
  return useQuery({
    queryKey: ['history', days],
    queryFn:  () => fetch(`${BASE_URL}/history?days=${days}`).then(r => r.json()),
    staleTime: 30 * 60 * 1000,
  })
}

// Scan status
export function useScanStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn:  () => fetch(`${BASE_URL}/status`).then(r => r.json()),
    refetchInterval: 60 * 1000,    // poll ทุก 1 นาที
  })
}
```

### 9.3 Key Components

```jsx
// components/AlertTable.jsx
import { useAlertStore } from '../stores/alertStore'
import { useAlerts } from '../api/client'

export function AlertTable() {
  const { selectedDate, levelFilter, minScore, sortBy, sortDir, selectAlert } =
    useAlertStore()
  const { data, isLoading } = useAlerts(selectedDate, {
    level: levelFilter !== 'ALL' ? levelFilter : undefined,
    min_score: minScore,
  })

  const alerts = useMemo(() => {
    if (!data?.alerts) return []
    return [...data.alerts].sort((a, b) => {
      const v = sortDir === 'desc' ? -1 : 1
      return v * (a[sortBy] > b[sortBy] ? 1 : -1)
    })
  }, [data, sortBy, sortDir])

  if (isLoading) return <TableSkeleton rows={10} />

  return (
    <table className="data-table">
      <TableHeader />
      <tbody>
        {alerts.map(alert => (
          <AlertRow
            key={alert.id}
            alert={alert}
            onClick={() => selectAlert(alert)}
          />
        ))}
      </tbody>
    </table>
  )
}
```

```jsx
// components/SepaScoreRing.jsx
export function SepaScoreRing({ score }) {
  const radius   = 34
  const cx = cy  = 40
  const circ     = 2 * Math.PI * radius
  const fill     = (score / 100) * circ
  const color    = score >= 75 ? 'var(--purple-400)'
                 : score >= 65 ? 'var(--orange-500)'
                 : 'var(--yellow-400)'

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={radius}
        className="score-ring-track"
        strokeWidth="6" stroke="var(--bg-elevated)" fill="none" />
      <circle cx={cx} cy={cy} r={radius}
        strokeWidth="6" stroke={color} fill="none"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.34,1.56,0.64,1)' }}
      />
      <text x={cx} y={cy-6}   textAnchor="middle"
        style={{ font: '700 16px var(--font-data)', fill: 'var(--text-primary)' }}>
        {score.toFixed(1)}
      </text>
      <text x={cx} y={cy+10}  textAnchor="middle"
        style={{ font: '400 10px var(--font-ui)', fill: 'var(--text-secondary)' }}>
        SEPA
      </text>
    </svg>
  )
}
```

---

## 10. Config (config.yaml)

```yaml
# config.yaml
schedule:
  cron: "30 16 * * 1-5"          # EOD หลังตลาดปิด (Bangkok time)
  timezone: "Asia/Bangkok"

scan:
  batch_size:   20                # ตัว/batch
  batch_delay:  2.0               # วินาที ระหว่าง batch
  request_delay: 0.3             # วินาที ระหว่าง request ใน batch
  max_workers:  5                 # parallel threads ใน batch
  timeout_per_stock: 30          # วินาที timeout ต่อหุ้ว

notifications:
  discord:
    enabled: true
    webhook_url: "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN"
    max_alerts_to_detail: 5      # ส่ง full embed แค่ 5 อันดับแรก

  email:
    enabled: false
    smtp_host: "smtp.gmail.com"
    smtp_port: 587
    username:  ""
    password:  ""                # ใช้ App Password (Gmail)
    to: []

filters:
  min_sepa_score:  60
  min_price:       2.0
  min_avg_volume:  200000
  require_vcp:     true

web:
  host: "0.0.0.0"
  port: 8765

data:
  db_path:        "data/vcp_alerts.db"
  cache_db_path:  "data/cache.db"
  symbols_file:   "data/set_symbols.txt"
  keep_days:      30             # history retention
```

---

## 11. Deployment

### 11.1 systemd Service

```ini
# /etc/systemd/system/vcp-scanner.service
[Unit]
Description=VCP Scanner Web App
After=network.target

[Service]
Type=simple
User=opc
WorkingDirectory=/home/opc/workspace/sepa/vcp_alert
ExecStart=/usr/bin/python3 -m uvicorn backend.app:app --host 0.0.0.0 --port 8765
Restart=always
RestartSec=10
Environment=PYTHONPATH=/home/opc/workspace/sepa
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Deploy commands
cd /home/opc/workspace/sepa/vcp_alert/frontend
npm run build

sudo systemctl daemon-reload
sudo systemctl enable vcp-scanner
sudo systemctl start vcp-scanner
sudo systemctl status vcp-scanner
```

### 11.2 nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-server-ip;
    
    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 12. Implementation Order (Build Sequence)

```
Phase 1 — Core (2-3 วัน)
  ├── 1. db.py              SQLite schema + CRUD + cache
  ├── 2. scheduler.py       wrap sepa_scanner + batch + rate-limit
  └── 3. Manual test        python -m backend.scheduler --run-now

Phase 2 — API (1 วัน)
  ├── 4. app.py             FastAPI endpoints
  └── 5. curl test          GET /api/alerts, /api/stock/PTT

Phase 3 — Notify (1 วัน)
  ├── 6. notify.py          Discord + Email
  └── 7. test webhook       python -m backend.notify --test

Phase 4 — Frontend (3-4 วัน)
  ├── 8. tokens.css         CSS variables (DESIGN.md)
  ├── 9. AlertTable         main table + filter
  ├── 10. DetailPanel       score ring + VCP chart + criteria
  └── 11. History view      daily summary + mini chart

Phase 5 — Deploy (0.5 วัน)
  ├── 12. npm run build
  ├── 13. systemd service
  └── 14. End-to-end test
```

---

## 13. Testing Checklist

```
[ ] db.py: upsert_alert ทำงาน, UNIQUE constraint ไม่ crash
[ ] Pre-filter: หุ้นราคา < 2 ถูกตัดออก
[ ] VCP: quality_score คำนวณถูกต้อง (ทดสอบ 5 cases)
[ ] Alert level: HIGH/MEDIUM/WATCH classify ถูก
[ ] Rate limit: scan 700 ตัวโดยไม่ถูก block (test กับ 50 ตัวก่อน)
[ ] API: /api/alerts returns sorted by SEPA DESC
[ ] Cache: request ที่ 2 เร็วกว่า request แรก (ETag)
[ ] Discord: ส่ง webhook ถึง channel
[ ] UI: Table sort ทำงาน, Filter chip toggle ทำงาน
[ ] Detail panel: Score ring animate, criteria bars grow
[ ] History: 30 วันแสดงถูก
[ ] EOD cron: 16:30 วัน-ศ trigger ถูก (ทดสอบด้วย manual trigger)
[ ] Cleanup: ข้อมูลเก่า > 30 วัน ถูกลบ
```

---

*Blueprint นี้เป็น source of truth — ทุก implementation ต้อง reference กลับมา*  
*Algorithm ใน Section 1 คัดลอกมาจาก sepa_scanner.py โดยตรง ห้ามแก้ไขโดยเด็ดขาด*
