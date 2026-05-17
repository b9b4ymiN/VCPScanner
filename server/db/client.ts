import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

const DB_PATH = process.env.DB_PATH ?? 'data/vcp.db'

const sqlite = new Database(DB_PATH, { create: true })

// Performance pragmas
sqlite.exec('PRAGMA journal_mode=WAL')
sqlite.exec('PRAGMA synchronous=NORMAL')
sqlite.exec('PRAGMA cache_size=-65536') // 64MB
sqlite.exec('PRAGMA mmap_size=268435456') // 256MB
sqlite.exec('PRAGMA temp_store=MEMORY')
sqlite.exec('PRAGMA foreign_keys=ON')

export const db = drizzle(sqlite, { schema })

export type DB = typeof db
