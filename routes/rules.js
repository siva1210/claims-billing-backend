import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, payer, level, type, code FROM rules ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { payer, level, type, code } = req.body;

  if (!payer || !level || !type || !code) {
    return res.status(400).json({ error: 'payer, level, type, and code are all required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rules (payer, level, type, code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, payer, level, type, code`,
      [payer, level, type, code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM rules WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No rule found with id ${req.params.id}` });
    }

    res.json({ deleted: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;