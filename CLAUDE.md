# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> อ่านทุกครั้งก่อน session — ห้าม skip

---

## Project Status

โปรเจค VCP Scanner อยู่ในช่วง **pre-implementation** — มีเฉพาะ architecture docs และ design system
ยังไม่มี source code, package.json, หรือ directory structure จริง

**Document hierarchy (อ่านตามลำดับนี้):**
1. `CLAUDE.md` — คุณกำลังอ่านอยู่ (rules, conventions, workflow)
2. `ARCHITECTURE-v2.md` — tech stack, project structure, abstractions, database schema, implementation phases
3. `DESIGN.md` — UI design system (blur.io aesthetic: colors, typography, components, layouts)

---

## 🔴 IRON RULES — ห้ามละเมิด

### Rule 1: VCP Algorithm เป็น Immutable
```
server/strategies/vcp-minervini.ts   ← ห้ามเปลี่ยน scoring logic
server/strategies/_shared/vcp-detector.ts   ← ห้ามเปลี่ยน detect_vcp()
server/strategies/_shared/sepa-criteria.ts  ← ห้ามเปลี่ยน 7 criteria
```
logic port มาจาก `sepa_scanner.py` แบบ 1:1 — ถ้าไม่แน่ใจ → อ่าน BLUEPRINT.md Section 1 ก่อนเสมอ

### Rule 2: ต้อง Validate ทุกครั้งหลัง touch logic
```bash
bun run validate PTT AOT CPALL BANPU DELTA
# ต้อง pass ทั้งหมดก่อน commit
```

### Rule 3: No Evidence No Claim
ห้ามพูดว่า "tests pass", "bug fixed", "output matches" โดยไม่รันจริงก่อน
รัน → อ่าน output ทั้งหมด → verify → แล้วค่อยบอก

---

## ⚡ Commands (planned — ตาม ARCHITECTURE-v2.md Phase 1-6)

```bash
bun install             # install deps
bun run dev             # start server + frontend (dev)
bun run scan            # manual scan ทันที
bun run test            # run all tests (Vitest)
bun run validate PTT    # compare TS output vs Python for 1 symbol
bun run build           # production build
bun run generate        # generate Drizzle migration from schema change
bun run migrate         # run DB migrations
bun run seed            # seed SET symbols
bun run check           # biome lint + typecheck + test + validate (CI gate)
bun run typecheck:server  # typecheck server/ only
bun run typecheck:web     # typecheck web/ only
```

---

## 🏗️ Architecture

ดูรายละเอียดเต็มใน `ARCHITECTURE-v2.md` — สรุปสั้น:

**3-Axis Abstraction:**
```
Market × Strategy × Provider = ทุก combination ใช้ได้
Market:    SET (.BK), NASDAQ, NYSE, HKEX  →  server/markets/
Strategy:  VCP Minervini, (future)         →  server/strategies/
Provider:  Yahoo Finance, (future)         →  server/providers/
```

- **เพิ่มตลาด:** สร้าง `server/markets/{id}.ts` implement `Market` interface
- **เพิ่ม strategy:** สร้าง `server/strategies/{id}.ts` implement `Strategy` interface
- ห้าม hardcode market-specific logic นอก `markets/` directory

**Key interfaces** อยู่ใน `server/core/types.ts`: Market, DataProvider, Strategy, PriceData, Fundamentals, StrategyResult

---

## 📐 Code Conventions

### TypeScript
- strict types + Zod validation at API boundary
- explicit return types บนทุก function ใน `server/`
- `Result<T>` type แทน throw ใน business logic
- ห้าม `any`, `as any`, `@ts-ignore` โดยไม่มีเหตุผล
- ห้าม non-null assertion `!` ยกเว้นมั่นใจ 100%

### Error Handling
- Server: return HTTP error, log, continue
- Scanner: 1 symbol fail → log + skip → ไม่ crash loop ทั้งหมด
- ห้าม unhandled promise rejection

### Database
- Drizzle query builder เสมอ — ห้าม raw SQL ยกเว้น migration
- UPSERT เสมอ (ไม่ใช่ INSERT) สำหรับ alerts + cache
- Schema แก้ผ่าน `bun run generate` + `bun run migrate` เท่านั้น

### Frontend
- CSS Variables จาก `tokens.css` เท่านั้น (ดู `DESIGN.md`) — ห้าม hardcode สี
- TanStack Query สำหรับ data fetching ทั้งหมด
- Zustand สำหรับ UI state เท่านั้น (filter, sort, selected)
- Virtual scroll สำหรับ list > 50 items
- ห้าม `useState` ที่ควรเป็น TanStack Query
- ห้าม `useEffect` สำหรับ data fetching
- ห้าม localStorage/sessionStorage

---

## 🤖 Custom Agents

มี specialized agents ใน `.claude/agents/` — ใช้ตาม context:

| Agent | ใช้เมื่อ | ห้ามใช้เมื่อ |
|---|---|---|
| `vcp-porter` | port/debug SEPA criterion, VCP detection | frontend, DB schema |
| `validator` | verify TS output = Python output | implement ใหม่ (ใช้ vcp-porter) |
| `frontend-engineer` | UI component, chart, table, styling | backend logic, scanner |
| `market-builder` | เพิ่มตลาดใหม่, symbol list, test provider | VCP logic, frontend |
| `db-architect` | schema, migrations, query optimization | business logic, frontend |

---

## 🔧 Auto-Hooks (configured in `.claude/settings.json`)

hooks เหล่านี้รันอัตโนมัติ — **ไม่ต้องรันเอง:**

| Trigger | Hook | Action |
|---|---|---|
| Write/Edit `.ts/.tsx` | Biome format | auto-format |
| Write/Edit `server/**/*.ts` | typecheck:server | type check server |
| Write/Edit `web/src/**/*.{ts,tsx}` | typecheck:web | type check frontend |
| Write/Edit VCP/SEPA logic files | Iron Rule warning | เตือนให้ run validate |
| Write/Edit `schema.ts` | Migration reminder | เตือนให้ run generate + migrate |

**Blocked commands** (hook จะ block): `npm`, `npx`, `pip`, `python` — ใช้ `bun` เท่านั้น

---

## 🧪 Testing Mandate

### Unit Tests (Vitest)
- `server/strategies/vcp-minervini.test.ts` — ทุก criterion
- `server/strategies/_shared/vcp-detector.test.ts` — ทุก edge case
- `server/indicators/*.test.ts` — indicator helpers

### Validation Tests (Python ↔ TypeScript)
```bash
bun run validate [SYMBOL...]  # default: PTT AOT CPALL BANPU DELTA SCC
```
diff > 0.1 คะแนน = fail — ต้อง investigate ก่อน commit

### CI Gate
```bash
bun run check   # biome lint + typecheck + test + validate
```

---

## 🚫 DO NOT

```
❌ ใช้ Python ในโปรเจคนี้ (ยกเว้น validate script)
❌ ใช้ npm/npx แทน bun
❌ ใช้ any type โดยไม่มีเหตุผล
❌ เขียน raw SQL ใน application code
❌ เปลี่ยน VCP/SEPA scoring logic โดยไม่มี BLUEPRINT.md รองรับ
❌ Hardcode market-specific rules นอก markets/ directory
❌ ใช้ localStorage, sessionStorage ใน frontend
❌ ส่ง notification (Discord/Email) — ตัดออกจาก scope
❌ rm -rf, sudo, curl | bash
```

---

## 🗓️ Context Compaction Note

เมื่อ context compact ให้ preserve:
- Rule ที่กำลัง implement (SEPA criterion อะไร)
- Test cases ที่กำลัง validate
- Diff ระหว่าง TS และ Python output ล่าสุด
- Files ที่ถูกแก้ไขใน session นี้
