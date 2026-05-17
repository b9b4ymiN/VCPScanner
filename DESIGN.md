# VCP Scanner — DESIGN.md
> Design System & Visual Language  
> Aesthetic: `blur.io` — Dark Pro Trader Interface  
> Version: 1.0.0 | Updated: 2026-05-16

---

## 0. Philosophy

> **"Built for signal, not noise."**

ระบบนี้สร้างสำหรับ **Pro Trader** ที่ต้องการข้อมูลเยอะในหน้าจอเดียว โดยไม่รู้สึกท่วมท้น  
Design ได้รับแรงบันดาลใจจาก [blur.io](https://blur.io) — dark, dense, precise, and ruthlessly functional.

**Core Tenets:**
- **Signal > Decoration** — ทุก pixel ต้องมีความหมาย
- **Density > Whitespace** — Pro users อยากเห็นข้อมูลมาก ไม่ใช่พื้นที่ว่าง
- **Speed > Polish** — data ต้องโหลดเร็ว ไม่มี splash screen
- **Dark ตลอดเวลา** — ไม่มี light mode (market ไม่มีวันหยุด หน้าจอก็ไม่ควรเหนื่อยตา)

---

## 1. Color System

### 1.1 Base Palette

```css
:root {
  /* === BACKGROUNDS === */
  --bg-canvas:    #0A0A0B;   /* หน้าจอหลัก — ดำสนิท */
  --bg-surface:   #111114;   /* Cards, panels */
  --bg-elevated:  #18181C;   /* Dropdowns, tooltips, modals */
  --bg-hover:     #1E1E24;   /* Row hover, button hover */
  --bg-active:    #252530;   /* Selected state */
  --bg-border:    #202028;   /* Dividers, table lines */

  /* === ORANGE ACCENT (Primary — blur.io signature) === */
  --orange-50:    #FFF3E8;
  --orange-100:   #FFD4A8;
  --orange-200:   #FFB573;
  --orange-400:   #FF7A1A;
  --orange-500:   #F56900;   /* Primary CTA, Alerts HIGH */
  --orange-600:   #C45200;
  --orange-700:   #8A3800;

  /* === SEMANTIC COLORS === */
  --green-400:    #22C55E;   /* Positive, Up, Confirmed */
  --green-500:    #16A34A;
  --green-dim:    rgba(34,197,94,0.12);

  --red-400:      #EF4444;   /* Negative, Down, Warning */
  --red-500:      #DC2626;
  --red-dim:      rgba(239,68,68,0.12);

  --yellow-400:   #EAB308;   /* MEDIUM alert, caution */
  --yellow-dim:   rgba(234,179,8,0.12);

  --blue-400:     #60A5FA;   /* Info, links */
  --blue-dim:     rgba(96,165,250,0.10);

  --purple-400:   #A78BFA;   /* VCP TIGHT, premium signal */
  --purple-dim:   rgba(167,139,250,0.10);

  /* === TEXT === */
  --text-primary:   #F0EFF4;   /* Headings, important numbers */
  --text-secondary: #8B8A96;   /* Labels, meta */
  --text-tertiary:  #4A4956;   /* Placeholders, disabled */
  --text-inverse:   #0A0A0B;   /* Text on orange buttons */

  /* === VCP QUALITY LEVELS === */
  --vcp-tight:    #A78BFA;   /* 🟢 TIGHT — Purple (rare, premium) */
  --vcp-standard: #F56900;   /* 🟡 STANDARD — Orange */
  --vcp-wide:     #EAB308;   /* 🟠 WIDE — Yellow */
  --vcp-loose:    #4A4956;   /* 🔴 LOOSE — Gray (muted) */

  /* === ALERT LEVELS === */
  --alert-high:   #F56900;   /* 🔥 HIGH */
  --alert-medium: #EAB308;   /* ⚡ MEDIUM */
  --alert-watch:  #60A5FA;   /* 📌 WATCH */
}
```

### 1.2 Color Usage Rules

| Context | Color | Rationale |
|---|---|---|
| SEPA Score ≥ 75 | `--purple-400` | Premium signal — rare and special |
| SEPA Score 65–74 | `--orange-500` | Strong — brand accent |
| SEPA Score 60–64 | `--yellow-400` | Watch zone |
| Price Up | `--green-400` | Universal market color |
| Price Down | `--red-400` | Universal market color |
| VCP TIGHT label | `--purple-400` | Minervini ideal |
| VCP STANDARD label | `--orange-500` | Normal pass |
| VCP WIDE/LOOSE label | `--text-tertiary` | Muted — don't draw attention |
| Numbers (prices) | `--text-primary` | Maximum legibility |
| Column headers | `--text-secondary` | Subordinate to data |

---

## 2. Typography

### 2.1 Font Stack

```css
:root {
  /* Display: ตัวเลข, prices, scores */
  --font-data: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* UI: labels, navigation, buttons */
  --font-ui:   'Inter', 'SF Pro Display', system-ui, sans-serif;

  /* Thai text support */
  --font-thai: 'Noto Sans Thai', 'Sarabun', var(--font-ui);
}
```

> **Why Monospace for numbers?**  
> ตัวเลขราคา, score, volume ต้องการ **tabular figures** — ตัวเลขกว้างเท่ากันทุกตัว  
> เพื่อให้ columns align สวยงาม ไม่ต้อง fidget ตา  
> blur.io ใช้ approach นี้เหมือนกัน

### 2.2 Type Scale

```css
/* === DISPLAY (numbers, prices) === */
.text-price-lg  { font: 700 28px/1.0 var(--font-data); letter-spacing: -0.5px; }
.text-price-md  { font: 600 20px/1.0 var(--font-data); }
.text-price-sm  { font: 500 14px/1.0 var(--font-data); }
.text-score     { font: 700 32px/1.0 var(--font-data); letter-spacing: -1px; }
.text-mono-sm   { font: 400 12px/1.0 var(--font-data); }

/* === UI TEXT === */
.text-heading-xl { font: 600 18px/1.3 var(--font-ui); letter-spacing: -0.3px; }
.text-heading-lg { font: 600 15px/1.4 var(--font-ui); }
.text-heading-md { font: 500 13px/1.4 var(--font-ui); }
.text-label      { font: 500 11px/1.0 var(--font-ui); letter-spacing: 0.6px; text-transform: uppercase; }
.text-body       { font: 400 13px/1.6 var(--font-ui); }
.text-caption    { font: 400 11px/1.4 var(--font-ui); color: var(--text-secondary); }

/* === THAI TEXT === */
.text-thai       { font-family: var(--font-thai); font-size: 13px; line-height: 1.7; }
```

### 2.3 Number Formatting Rules

```javascript
// ราคาหุ้น (฿)
const formatPrice = (n) => `฿${n.toFixed(2)}`;

// Volume (แสดงเป็น K/M)
const formatVol = (n) => n >= 1e6
  ? `${(n/1e6).toFixed(1)}M`
  : n >= 1e3
  ? `${(n/1e3).toFixed(0)}K`
  : n.toString();

// SEPA Score (ทศนิยม 1 ตำแหน่ง)
const formatScore = (n) => n.toFixed(1);

// Percent (pivot distance, price change)
const formatPct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

// Date
const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', {
  day: '2-digit', month: 'short', year: '2-digit'
});
```

---

## 3. Spacing & Layout

### 3.1 Spacing Scale

```css
:root {
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
}
```

### 3.2 Layout Grid

```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR  (64px fixed, border-bottom 1px --bg-border)     │
├──────────────────────────────────────────────────────────┤
│  NAV SIDEBAR (220px)  │  MAIN CONTENT (fluid)            │
│  position: sticky     │  padding: 0 24px 24px            │
│  top: 64px            │                                  │
│  height: calc(100vh   │  ┌─────────────────────────────┐ │
│  - 64px)              │  │  FILTER BAR  (52px sticky)  │ │
│                       │  ├─────────────────────────────┤ │
│                       │  │  CONTENT AREA               │ │
│                       │  │  (scrollable)               │ │
│                       │  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Border Radius

```css
:root {
  --radius-sm:  4px;    /* Tags, badges, tight components */
  --radius-md:  6px;    /* Buttons, inputs, table cells */
  --radius-lg:  10px;   /* Cards, panels */
  --radius-xl:  14px;   /* Modals, large surfaces */
  --radius-pill: 9999px; /* Pill badges */
}
```

---

## 4. Component Library

### 4.1 Alert Row (Main Component)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🔥  │  PTT     │ ฿45.50  │ +1.2%  │  82.5  │  TIGHT   │  < 2.1%  │  ◄ detail│
│      │  (PTT)   │         │        │  SEPA  │  VCP     │  Pivot   │          │
└──────────────────────────────────────────────────────────────────────────────┘

Visual spec:
- Height: 48px (table row)
- Hover: background --bg-hover, transition 80ms
- Alert icon: 18px, centered in 36px column
- Symbol: font-ui, 600, 14px, --text-primary
- Price: font-data, 500, 13px, --text-primary
- Change %: font-data, 500, 12px, green/red based on value
- SEPA Score: font-data, 700, 14px, color by score range
- VCP badge: see Badge component
- Pivot dist: font-data, 12px, color by distance
- Row border-bottom: 0.5px solid --bg-border
```

```css
.alert-row {
  display: grid;
  grid-template-columns: 36px 100px 80px 72px 64px 100px 80px 40px;
  align-items: center;
  height: 48px;
  padding: 0 var(--space-4);
  border-bottom: 0.5px solid var(--bg-border);
  cursor: pointer;
  transition: background 80ms ease;
}
.alert-row:hover { background: var(--bg-hover); }
.alert-row.selected { background: var(--bg-active); }
```

### 4.2 SEPA Score Ring (Detail Panel)

```
     ╭────────╮
    /   82.5   \
   │    ████    │  ← Arc fill color = score range
    \          /      Purple ≥75, Orange 65-74, Yellow 60-64
     ╰────────╯
     SEPA Score
```

```css
/* SVG-based ring — 80px diameter */
.score-ring {
  width: 80px;
  height: 80px;
  position: relative;
}
/* Stroke-dasharray animation on mount */
.score-ring circle.track  { stroke: var(--bg-elevated); stroke-width: 6; fill: none; }
.score-ring circle.fill   { stroke-width: 6; fill: none;
                             stroke-linecap: round;
                             transition: stroke-dashoffset 600ms ease; }
```

### 4.3 VCP Quality Badge

```css
.badge-vcp {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font: 500 11px/1 var(--font-ui);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge-vcp.tight    { color: var(--vcp-tight);    background: rgba(167,139,250,0.12); border: 0.5px solid rgba(167,139,250,0.25); }
.badge-vcp.standard { color: var(--vcp-standard); background: rgba(245,105,0,0.12);   border: 0.5px solid rgba(245,105,0,0.25); }
.badge-vcp.wide     { color: var(--vcp-wide);     background: rgba(234,179,8,0.12);   border: 0.5px solid rgba(234,179,8,0.25); }
.badge-vcp.loose    { color: var(--text-tertiary); background: var(--bg-elevated);    border: 0.5px solid var(--bg-border); }
```

### 4.4 Alert Level Indicator

```css
.alert-icon { font-size: 16px; }

/* Color dot variant (compact) */
.alert-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.alert-dot.high   { background: var(--alert-high);   box-shadow: 0 0 6px rgba(245,105,0,0.6); }
.alert-dot.medium { background: var(--alert-medium); }
.alert-dot.watch  { background: var(--alert-watch);  }
```

### 4.5 Mini Sparkline (Price + Volume)

```
ราคา:  ╭─╮    ╭──╮╭
       ╯ ╰────╯  ╰╯   ← 60 วัน
Volume: ▁▁▂▃▁▁▂▁▁▁▁▁  ← bars fade ลงเรื่อยๆ (Volume Drying)
```

```javascript
// SVG sparkline — canvas 120×32px
function renderSparkline(prices, volumes, container) {
  const W = 120, H = 32, VH = 8;
  const min = Math.min(...prices), max = Math.max(...prices);
  const normalize = (v, lo, hi) => (v - lo) / (hi - lo || 1);

  const pts = prices.map((p, i) =>
    `${(i / (prices.length - 1)) * W},${H - normalize(p, min, max) * (H - VH - 4)}`
  ).join(' ');

  const maxVol = Math.max(...volumes);
  const volBars = volumes.map((v, i) => {
    const x = (i / volumes.length) * W;
    const bh = normalize(v, 0, maxVol) * VH;
    // Volume drying = ความเข้มของแท่งลดลง
    const opacity = 0.3 + normalize(v, 0, maxVol) * 0.5;
    return `<rect x="${x}" y="${H - bh}" width="${W/volumes.length - 0.5}" height="${bh}"
              fill="var(--orange-500)" opacity="${opacity}"/>`;
  }).join('');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${volBars}
    <polyline points="${pts}" fill="none" stroke="var(--text-primary)" stroke-width="1.2"
      stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}
```

### 4.6 VCP Contraction Visualizer

```
Swing High 1 ──────╮                    ← H[0]
                   │ Contraction 1
              ╭────╯                    ← Low[0..1]
              │
              ╰──╮                      ← H[1]  (lower high = contracting)
                 │ Contraction 2 (< 1)
            ╭───╯                       ← Low[1..2]
            │
            ╰─╮                         ← H[2]
              │ Contraction 3 (< 2)
           ╭──╯
           │
           ┊←── Pivot Point (current)   ← breakout zone
```

```css
/* VCP Contraction Chart */
.vcp-chart {
  position: relative;
  height: 80px;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Pivot zone highlight */
.vcp-pivot-zone {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 20%;
  background: linear-gradient(90deg, transparent, rgba(245,105,0,0.08));
  border-right: 1px dashed rgba(245,105,0,0.4);
}
```

### 4.7 SEPA Criteria Breakdown Bar

```
Criterion          Score  Bar
─────────────────────────────────
Super Performance  12/15  ████████████░░░
Earnings           18/20  ████████████████████░░░
Catalyst            7/10  ███████░░░
Supply/Demand      16/20  ████████████████░░░░
Leadership          8/10  ████████░░
Sponsorship         5/10  █████░░░░░
Market Direction   15/15  ███████████████
─────────────────────────────────
TOTAL              81/100
```

```css
.criteria-bar-track {
  height: 4px;
  background: var(--bg-elevated);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.criteria-bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--orange-500);
  transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
/* Max score bars get purple */
.criteria-bar-fill.max { background: var(--purple-400); }
```

### 4.8 Filter Chip

```css
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 0.5px solid var(--bg-border);
  background: var(--bg-surface);
  font: 500 12px var(--font-ui);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 120ms ease;
  user-select: none;
  white-space: nowrap;
}
.filter-chip:hover  { border-color: var(--orange-500); color: var(--text-primary); }
.filter-chip.active { border-color: var(--orange-500); background: rgba(245,105,0,0.12);
                      color: var(--orange-400); }
```

### 4.9 Toast Notification

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 0.5px solid var(--bg-border);
  border-radius: var(--radius-lg);
  font: 400 13px var(--font-ui);
  color: var(--text-primary);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: toast-in 200ms ease forwards;
  max-width: 320px;
}
.toast.success { border-left: 2px solid var(--green-400); }
.toast.error   { border-left: 2px solid var(--red-400); }
.toast.info    { border-left: 2px solid var(--orange-500); }

@keyframes toast-in {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
```

### 4.10 Skeleton Loading (Shimmer)

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

.skeleton {
  background: linear-gradient(90deg,
    var(--bg-elevated) 25%,
    var(--bg-hover) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: var(--radius-sm);
}
```

---

## 5. Page Layouts

### 5.1 Dashboard (Main View)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR                                                              │
│  [🔴 VCP Scanner]  Alerts  History  Config     [🔔 3]  [⚙]        │
├──────────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR      │ STAT BAR                                             │
│              │  🔥 HIGH: 3   ⚡ MED: 7   📌 WATCH: 12  SET: ▲      │
│ 📊 Alerts    ├──────────────────────────────────────────────────────┤
│ 📈 History   │ FILTER BAR                                           │
│ ⚙ Config    │  [ALL] [🔥HIGH] [⚡MED] [📌WATCH]  Score:[60+▼] [↓]  │
│              ├──────────────────────────────────────────────────────┤
│ ─────────    │ ALERT TABLE                                          │
│ Last scan:   │  #  │ Sym │ Price │ %Chg │ Score │ VCP   │ Pvt │ ★  │
│ 16:30 today  │  1  │ PTT │ ฿45.5│ +1.2%│ 82.5  │ TIGHT │ 2.1%│   │
│              │  2  │ AOT │ ฿68.0│ -0.3%│ 76.1  │ STD   │ 3.8%│   │
│ Next scan:   │  ...                                                 │
│ Tomorrow     │                                                      │
│ 16:30        │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### 5.2 Detail Panel (Side Drawer)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Back]   PTT — PTT PCL   🔥 HIGH        ฿45.50 +1.2%      │
├────────────────────────────┬─────────────────────────────────┤
│  PRICE CHART (60d)         │  SEPA Score Ring                │
│                            │       ╭──────╮                  │
│  [sparkline 60d]           │      /  82.5  \                 │
│  Volume bars below         │     │  ██████  │                │
│                            │      \        /                  │
│                            │       ╰──────╯                  │
├────────────────────────────┴─────────────────────────────────┤
│  VCP ANALYSIS                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [VCP Contraction Chart]                                │ │
│  │  Contractions: 3  │  Vol Drying: ✓  │  Quality: 8/10  │ │
│  │  Pivot: ฿45.80    │  Distance: 2.1%                    │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  SEPA CRITERIA BREAKDOWN                                     │
│  Super Performance ████████████░░░ 12/15                    │
│  Earnings          ████████████████████ 18/20               │
│  [... 7 criteria]                                            │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 History View

```
┌──────────────────────────────────────────────────────────────┐
│  History — 30 วันที่ผ่านมา                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Hit Rate Chart (ลูกศรขึ้น/ลง %)  — line chart         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Date          │  Alerts  │  HIGH  │  MED  │  WATCH  │  SET  │
│  16 พ.ค. 26   │   22     │   3    │   7   │   12    │  ▲    │
│  15 พ.ค. 26   │   18     │   2    │   5   │   11    │  ─    │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Motion & Animation

### 6.1 Timing Tokens

```css
:root {
  --ease-fast:    80ms ease;           /* Hover states */
  --ease-normal:  120ms ease;          /* Button press, chip toggle */
  --ease-enter:   200ms cubic-bezier(0.0, 0.0, 0.2, 1);  /* Panel open */
  --ease-exit:    150ms cubic-bezier(0.4, 0.0, 1, 1);    /* Panel close */
  --ease-spring:  400ms cubic-bezier(0.34, 1.56, 0.64, 1); /* Score ring fill */
}
```

### 6.2 Animation Rules

```
✅ ALLOWED animations:
   - Table row hover (bg transition 80ms)
   - SEPA Score ring fill on mount (600ms spring)
   - Criteria bars grow left-to-right (400ms staggered)
   - Toast in/out (200ms)
   - Skeleton shimmer (continuous)
   - Sparkline draw-on (500ms path animation)
   - Alert level dot pulse (subtle, for HIGH only)

❌ FORBIDDEN:
   - Page transitions / route animations
   - Floating particles, glows, neons
   - Animations longer than 600ms (except skeleton)
   - Anything that loops unless skeleton/pulse
   - CSS blur/glassmorphism effects
   - Loading spinners (ใช้ skeleton แทน)
```

### 6.3 HIGH Alert Pulse

```css
/* เฉพาะ 🔥 HIGH alert dot */
@keyframes alert-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,105,0,0.6); }
  50%       { box-shadow: 0 0 0 4px rgba(245,105,0,0); }
}

.alert-dot.high {
  animation: alert-pulse 2s ease infinite;
}
```

---

## 7. Data Table Spec

### 7.1 Column Definitions (Main Alert Table)

| Col | Width | Align | Font | Color Logic |
|---|---|---|---|---|
| Alert Level | 36px | center | emoji | — |
| Symbol | 100px | left | UI 600 14px | `--text-primary` |
| Name (short) | 120px | left | UI 400 12px | `--text-secondary` |
| Price | 80px | right | Mono 500 13px | `--text-primary` |
| % Change | 72px | right | Mono 500 12px | green/red |
| SEPA Score | 64px | right | Mono 700 14px | by range |
| VCP Quality | 100px | center | badge | by quality |
| Pivot Dist | 80px | right | Mono 12px | green if <3%, yellow <5% |
| Action | 40px | center | icon | `--text-tertiary` |

### 7.2 Table CSS

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-ui);
}

.data-table thead th {
  padding: 0 var(--space-4);
  height: 36px;
  font: 500 11px var(--font-ui);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  text-align: right;
  border-bottom: 0.5px solid var(--bg-border);
  user-select: none;
  cursor: pointer;
  white-space: nowrap;
}

.data-table thead th:hover { color: var(--text-secondary); }
.data-table thead th.sorted { color: var(--orange-400); }
.data-table thead th:first-child,
.data-table thead th:nth-child(2) { text-align: left; }

.data-table tbody tr {
  height: 48px;
  border-bottom: 0.5px solid var(--bg-border);
  cursor: pointer;
  transition: background var(--ease-fast);
}

.data-table tbody tr:hover  { background: var(--bg-hover); }
.data-table tbody tr:active { background: var(--bg-active); }

.data-table td {
  padding: 0 var(--space-4);
  font-size: 13px;
  text-align: right;
  white-space: nowrap;
}

.data-table td:first-child,
.data-table td:nth-child(2) { text-align: left; }

/* Numeric cells */
.data-table td.num { font-family: var(--font-data); }
```

---

## 8. Empty & Error States

### 8.1 No Alerts Today

```
           ∅

   No VCP alerts today

   SET market may be in downtrend,
   or no stocks passed all filters.

   [View Yesterday's Alerts →]
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  color: var(--text-tertiary);
}
.empty-state .icon  { font-size: 40px; margin-bottom: 16px; opacity: 0.4; }
.empty-state .title { font: 500 15px var(--font-ui); color: var(--text-secondary); margin-bottom: 8px; }
.empty-state .body  { font: 400 13px var(--font-ui); max-width: 280px; line-height: 1.6; }
```

### 8.2 Scan Running

```css
.scan-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 400 12px var(--font-ui);
  color: var(--text-secondary);
}
.scan-status .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--orange-500);
  animation: alert-pulse 1.2s ease infinite;
}
```

---

## 9. Responsive Breakpoints

```css
/* Desktop first — trader dashboard */
@media (max-width: 1280px) {
  /* Collapse sidebar to icon-only */
  .sidebar { width: 60px; }
  .sidebar .nav-label { display: none; }
}

@media (max-width: 1024px) {
  /* Hide "Name" column in table */
  .col-name { display: none; }
}

@media (max-width: 768px) {
  /* Stack layout — sidebar becomes bottom nav */
  .layout { flex-direction: column; }
  .sidebar { width: 100%; height: 52px; flex-direction: row; }
  /* Simplify table — show only essential cols */
  .col-vcp, .col-pivot { display: none; }
}
```

---

## 10. Iconography

ใช้ [Phosphor Icons](https://phosphoricons.com/) หรือ [Tabler Icons](https://tabler.io/icons) — outline style เท่านั้น

| Context | Icon | Size |
|---|---|---|
| Alert HIGH | `🔥` emoji (เพราะ emoji มีน้ำหนักสี) | 16px |
| Alert MEDIUM | `⚡` emoji | 16px |
| Alert WATCH | `📌` emoji | 16px |
| Sort ascending | `ph-arrow-up` | 12px |
| Sort descending | `ph-arrow-down` | 12px |
| Detail open | `ph-arrow-right` | 14px |
| Settings | `ph-gear` | 18px |
| Notification | `ph-bell` | 18px |
| Star/Watch | `ph-star` | 14px |
| Refresh | `ph-arrows-clockwise` | 14px |
| Discord | `ph-discord-logo` | 16px |
| Email | `ph-envelope` | 16px |
| Calendar | `ph-calendar` | 14px |

---

## 11. Accessibility Minimum

```
- Color ไม่ใช่ signal เดียว: ต้องมี icon หรือ text label ประกอบเสมอ
- Focus ring: 2px solid var(--orange-400), offset 2px (สำหรับ keyboard nav)
- Font size minimum: 11px (labels), 13px (body)
- Color contrast minimum: WCAG AA (4.5:1 สำหรับ text บน dark bg)
- aria-label บน icon-only buttons
- role="status" บน live data regions (scan status, alert count)
```

---

## 12. Implementation Stack Recommendation

```
Frontend Framework:  React + Vite  (หรือ SvelteKit ถ้าต้องการเบากว่า)
Styling:             CSS Variables + CSS Modules  (ไม่ใช้ Tailwind — ต้องการ control สูง)
Charts:              TradingView Lightweight Charts  (ฟรี, เร็วมาก, dark mode native)
                     หรือ uPlot (ultra-lightweight)
Table:               TanStack Table v8  (virtual scrolling, sorting, filtering)
State:               Zustand  (เบา, ไม่ verbose)
Data Fetching:       TanStack Query  (cache + background refetch)
Icons:               Phosphor React
Fonts:               Google Fonts (JetBrains Mono + Inter)
Build:               Vite + brotli compression
```

---

## 13. Performance Budget

```
Initial Load:        < 200KB JS (gzipped)
Time to Interactive: < 1.5s (cached data)
Table render (100 rows): < 16ms (60fps)
API response:        < 100ms (SQLite local query)
Chart render:        < 50ms (lightweight charts)

Techniques:
- Virtual scrolling สำหรับ history table
- HTTP cache headers บน GET /api/alerts (ETag)
- WebSocket (optional) สำหรับ real-time scan status
- Preload fonts ด้วย <link rel="preload">
- Code split: detail panel lazy load
```

---

*"Good design is as little design as possible."*  
*— Dieter Rams (but we added orange)*
