import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date
// objects, to avoid timezone-shift bugs when serializing to JSON.
pg.types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});