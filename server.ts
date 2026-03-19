import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import cron from 'node-cron';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- Health ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// --- Store Settings ---
app.get('/api/settings', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

app.put('/api/settings', async (req, res) => {
  const { name, contacts, branches, group_link } = req.body;
  try {
    const result = await pool.query(
      `UPDATE store_settings SET name=$1, contacts=$2, branches=$3, group_link=$4, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [name, contacts, branches, group_link]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات' });
  }
});

// --- Gold Prices History ---
app.get('/api/gold-prices', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gold_prices ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الأسعار' });
  }
});

app.post('/api/gold-prices', async (req, res) => {
  const { buy_price, sell_price, karat, currency, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO gold_prices (buy_price, sell_price, karat, currency, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [buy_price, sell_price, karat, currency, note || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ السعر' });
  }
});

app.delete('/api/gold-prices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM gold_prices WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف السعر' });
  }
});

// --- Messages History ---
app.get('/api/messages', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الرسائل' });
  }
});

app.post('/api/messages', async (req, res) => {
  const { content, gold_price_id, image_data } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO messages (content, gold_price_id, image_data)
       VALUES ($1, $2, $3) RETURNING *`,
      [content, gold_price_id || null, image_data || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الرسالة' });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الرسالة' });
  }
});

// --- Live Gold Price (International Spot Price) ---
app.get('/api/gold-price/live', async (_req, res) => {
  try {
    const response = await fetch('https://api.metals.live/v1/spot/gold');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json() as { price?: number }[];
    const priceUSD = data[0]?.price;
    if (!priceUSD) throw new Error('No price data');
    res.json({
      price_usd_per_oz: priceUSD,
      price_usd_per_gram: +(priceUSD / 31.1035).toFixed(2),
      note: 'السعر الدولي للذهب عيار 24 بالدولار الأمريكي للغرام',
    });
  } catch (err) {
    res.status(503).json({ error: 'تعذّر جلب السعر الدولي الآن. حاول لاحقاً.' });
  }
});

// --- Scheduled Tasks ---
app.get('/api/schedule', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scheduled_tasks ORDER BY id LIMIT 1');
    res.json(result.rows[0] || { time_hour: 9, time_minute: 0, is_active: false });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب إعدادات الجدولة' });
  }
});

app.put('/api/schedule', async (req, res) => {
  const { time_hour, time_minute, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE scheduled_tasks SET time_hour=$1, time_minute=$2, is_active=$3
       WHERE id=(SELECT id FROM scheduled_tasks ORDER BY id LIMIT 1)`,
      [time_hour, time_minute, is_active]
    );
    setupCronJob(time_hour, time_minute, is_active);
    res.json({ success: true, time_hour, time_minute, is_active });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ إعدادات الجدولة' });
  }
});

// --- Cron Job ---
let currentCronJob: ReturnType<typeof cron.schedule> | null = null;

function setupCronJob(hour: number, minute: number, isActive: boolean) {
  if (currentCronJob) {
    currentCronJob.stop();
    currentCronJob = null;
  }
  if (!isActive) {
    console.log('⏱ الجدولة التلقائية غير مفعّلة');
    return;
  }
  const cronExpr = `${minute} ${hour} * * *`;
  currentCronJob = cron.schedule(cronExpr, () => {
    console.log(`⏰ [${new Date().toISOString()}] تذكير: حان وقت نشر تحديث الأسعار اليومي!`);
  }, { timezone: 'Asia/Aden' });
  console.log(`✅ الجدولة مفعّلة: كل يوم الساعة ${hour}:${String(minute).padStart(2, '0')}`);
}

async function initCronFromDB() {
  try {
    const result = await pool.query('SELECT * FROM scheduled_tasks ORDER BY id LIMIT 1');
    if (result.rows.length > 0) {
      const { time_hour, time_minute, is_active } = result.rows[0];
      setupCronJob(time_hour, time_minute, is_active);
    }
  } catch (err) {
    console.error('خطأ في تهيئة الجدولة:', err);
  }
}

// --- Start Server ---
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  await initCronFromDB();
});

export default app;
