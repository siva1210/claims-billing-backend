import bcrypt from 'bcrypt';
import { pool } from './db.js';

const username = 'admin';
const plainPassword = '26081210'; // change this before running, or after logging in once

async function seed() {
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [username, passwordHash]
  );
  console.log(`Seeded user "${username}"`);
  process.exit(0);
}

seed();