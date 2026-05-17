import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './worker/src/schema.ts',
  out: './worker/drizzle',
  dialect: 'sqlite',
})
