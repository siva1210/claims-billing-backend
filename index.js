import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import claimsRouter from './routes/claims.js';
import rulesRouter from './routes/rules.js';
import ediRouter from './routes/edi.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/requireAuth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);

app.use('/claims', requireAuth, claimsRouter);
app.use('/rules', requireAuth, rulesRouter);
app.use('/edi', requireAuth, ediRouter);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});