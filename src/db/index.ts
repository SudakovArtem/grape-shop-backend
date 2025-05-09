import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import 'dotenv/config'

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=no-verify`

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Для локальной разработки, если используется самоподписанный сертификат
  }
})

export const db = drizzle(pool, { schema })
