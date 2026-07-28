import { pool } from '../../db.js';

// Atomically increments and returns the next control number, backed by
// Postgres instead of localStorage. The UPDATE...RETURNING is atomic,
// so concurrent requests can't both get the same number.
export async function getNextControlNumber() {
  const result = await pool.query(
    `UPDATE edi_control_number
     SET current_value = current_value + 1
     WHERE id = 1
     RETURNING current_value`
  );
  return result.rows[0].current_value;
}