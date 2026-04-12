import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import cron from 'node-cron';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- DB Init ---
async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_subscribers (
      id SERIAL PRIMARY KEY,
      chat_id BIGINT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS bot_activity (
      id SERIAL PRIMARY KEY,
      chat_id BIGINT,
      username TEXT,
      first_name TEXT,
      action TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// --- Health ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// --- Store Settings ---
app.get('/api/settings', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch {
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
  } catch {
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
  } catch {
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
    const savedPrice = result.rows[0];
    res.json(savedPrice);

    // Auto-broadcast to all Telegram subscribers (fire and forget)
    broadcastPriceUpdate(savedPrice).catch(err =>
      console.error('Broadcast error:', err)
    );
  } catch {
    res.status(500).json({ error: 'خطأ في حفظ السعر' });
  }
});

app.delete('/api/gold-prices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM gold_prices WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch {
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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'خطأ في حفظ الرسالة' });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ في حذف الرسالة' });
  }
});

// --- Bot Stats API ---
app.get('/api/bot/stats', async (_req, res) => {
  try {
    const [subs, activity, lastPrice] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM bot_subscribers WHERE is_active = TRUE'),
      pool.query('SELECT * FROM bot_activity ORDER BY created_at DESC LIMIT 10'),
      pool.query('SELECT * FROM bot_activity WHERE action = \'broadcast\' ORDER BY created_at DESC LIMIT 1'),
    ]);
    res.json({
      subscriber_count: parseInt(subs.rows[0].count),
      recent_activity: activity.rows,
      last_broadcast: lastPrice.rows[0]?.created_at || null,
    });
  } catch {
    res.status(500).json({ error: 'خطأ في جلب إحصائيات البوت' });
  }
});

// Manual broadcast endpoint
app.post('/api/bot/broadcast', async (_req, res) => {
  try {
    const priceResult = await pool.query('SELECT * FROM gold_prices ORDER BY created_at DESC LIMIT 1');
    if (priceResult.rows.length === 0) {
      return res.status(400).json({ error: 'لا توجد أسعار للبث' });
    }
    const count = await broadcastPriceUpdate(priceResult.rows[0]);
    res.json({ success: true, sent_to: count });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في البث' });
  }
});

// --- AI Message Generation ---
function buildTemplate(body: {
  sell_price: string; buy_price: string; karat: string; currency: string;
  note?: string; store_name?: string; branches?: string; contacts?: string;
  group_link?: string; date: string; time: string;
}) {
  return `✨ ${body.store_name || 'مجوهرات بابل'} ✨\n\nأسعار الذهب لهذا اليوم:\nالعيار: ${body.karat}\nسعر البيع: ${body.sell_price} ${body.currency} للغرام\nسعر الشراء: ${body.buy_price} ${body.currency} للغرام\n\n${body.note ? `📌 ${body.note}\n\n` : ''}📅 التاريخ: ${body.date}\n⏰ الوقت: ${body.time}\n\n📍 فروعنا:\n${body.branches || 'لم يتم تحديد الفروع'}\n\n📞 للتواصل:\n${body.contacts || 'لم يتم تحديد أرقام التواصل'}\n\n💎 نسعد بخدمتكم دائماً!\n\n🔗 انضموا لمجموعتنا:\n${body.group_link || ''}`;
}

app.post('/api/generate-message', async (req, res) => {
  const { buy_price, sell_price, karat, currency, note, store_name, branches, contacts, group_link, is_regenerate } = req.body;
  if (!buy_price || !sell_price) return res.status(400).json({ error: 'يرجى إدخال السعرين' });

  const now = new Date();
  const date = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
  const templateData = { sell_price, buy_price, karat, currency, note, store_name, branches, contacts, group_link, date, time };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ message: buildTemplate(templateData), ai_used: false });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `أنت مدير حسابات تواصل اجتماعي محترف لشركة مجوهرات راقية تُدعى "${store_name || 'مجوهرات بابل'}".
قم بصياغة رسالة واتساب تسويقية، جذابة، وأنيقة لتحديث الزبائن بأسعار الذهب اليوم.
استخدم المعلومات التالية حصراً:
- سعر البيع: ${sell_price} ${currency} للغرام
- سعر الشراء: ${buy_price} ${currency} للغرام
- العيار: ${karat}
- التاريخ: ${date}
- الوقت: ${time}
- ملاحظة: ${note || 'لا توجد ملاحظات إضافية'}
- فروعنا: ${branches || 'غير محدد'}
- أرقام التواصل: ${contacts || 'غير محدد'}
الرابط الثابت: ${group_link || ''}
الشروط: نبرة فخمة، ذكر اسم المحل، إيموجي مناسبة ✨💎👑📍📞، تنسيق مريح.
${is_regenerate ? 'ملاحظة: إعادة صياغة بأسلوب مختلف.' : ''}
أخرج النص النهائي فقط بدون مقدمات.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    res.json({ message: response.text || buildTemplate(templateData), ai_used: true });
  } catch (err) {
    console.error('Gemini error:', err);
    res.json({ message: buildTemplate(templateData), ai_used: false });
  }
});

// --- Live Gold Price ---
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
  } catch {
    res.status(503).json({ error: 'تعذّر جلب السعر الدولي الآن. حاول لاحقاً.' });
  }
});

// --- Scheduled Tasks ---
app.get('/api/schedule', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scheduled_tasks ORDER BY id LIMIT 1');
    res.json(result.rows[0] || { time_hour: 9, time_minute: 0, is_active: false });
  } catch {
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
  } catch {
    res.status(500).json({ error: 'خطأ في حفظ إعدادات الجدولة' });
  }
});

// --- Cron Job ---
let currentCronJob: ReturnType<typeof cron.schedule> | null = null;

function setupCronJob(hour: number, minute: number, isActive: boolean) {
  if (currentCronJob) { currentCronJob.stop(); currentCronJob = null; }
  if (!isActive) { console.log('⏱ الجدولة التلقائية غير مفعّلة'); return; }
  const cronExpr = `${minute} ${hour} * * *`;
  currentCronJob = cron.schedule(cronExpr, () => {
    console.log(`⏰ [${new Date().toISOString()}] حان وقت نشر تحديث الأسعار اليومي!`);
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

// --- Telegram Bot ---
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = 'babel120_bot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

let telegramBot: TelegramBot | null = null;

const PRICE_KEYWORDS = [
  'سعر', 'أسعار', 'اسعار', 'ذهب', 'عيار', 'gold', 'price',
  'كم', 'بكم', 'غرام', 'بيع', 'شراء', 'اليوم', 'الان', 'الآن', 'احدث',
];

function containsPriceKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return PRICE_KEYWORDS.some(kw => lower.includes(kw));
}

async function getLatestPriceMessage(): Promise<string> {
  const [pricesResult, settingsResult] = await Promise.all([
    pool.query('SELECT * FROM gold_prices ORDER BY created_at DESC LIMIT 1'),
    pool.query('SELECT * FROM store_settings WHERE id = 1'),
  ]);
  const settings = settingsResult.rows[0] || {};
  const storeName = settings.name || 'مجوهرات بابل';
  const contacts = settings.contacts || '';
  const branches = settings.branches || '';
  const groupLink = settings.group_link || '';

  if (pricesResult.rows.length === 0) {
    return `💎 *${storeName}*\n\nعذراً، لا توجد أسعار محدَّثة حالياً.\nتواصل معنا:\n${contacts || 'راجع قناتنا'}`;
  }

  const price = pricesResult.rows[0];
  return formatPriceMessage(price, { storeName, contacts, branches, groupLink, isUpdate: false });
}

function formatPriceMessage(price: {
  sell_price: string; buy_price: string; karat: string; currency: string; note?: string;
}, opts: { storeName: string; contacts: string; branches: string; groupLink: string; isUpdate: boolean }): string {
  const now = new Date();
  const date = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });

  let msg = opts.isUpdate
    ? `🔔 *تحديث أسعار الذهب*\n\n`
    : `💰 *أسعار الذهب*\n\n`;

  msg += `✨ *${opts.storeName}* ✨\n\n`;
  msg += `🏅 العيار: *${price.karat}*\n`;
  msg += `📈 سعر البيع: *${price.sell_price} ${price.currency}* للغرام\n`;
  msg += `📉 سعر الشراء: *${price.buy_price} ${price.currency}* للغرام\n`;
  if (price.note) msg += `\n📌 ${price.note}\n`;
  msg += `\n📅 ${date}  ⏰ ${time}\n`;
  if (opts.branches) msg += `\n📍 *فروعنا:*\n${opts.branches}\n`;
  if (opts.contacts) msg += `\n📞 *للتواصل:*\n${opts.contacts}\n`;
  msg += `\n💎 نسعد بخدمتكم دائماً!`;
  if (opts.groupLink) msg += `\n\n🔗 ${opts.groupLink}`;
  return msg;
}

async function broadcastPriceUpdate(price: {
  sell_price: string; buy_price: string; karat: string; currency: string; note?: string;
}): Promise<number> {
  if (!telegramBot) return 0;

  const [subscribersResult, settingsResult] = await Promise.all([
    pool.query('SELECT chat_id FROM bot_subscribers WHERE is_active = TRUE'),
    pool.query('SELECT * FROM store_settings WHERE id = 1'),
  ]);

  if (subscribersResult.rows.length === 0) {
    console.log('📭 لا يوجد مشتركون لإرسال التحديث إليهم');
    return 0;
  }

  const settings = settingsResult.rows[0] || {};
  const message = formatPriceMessage(price, {
    storeName: settings.name || 'مجوهرات بابل',
    contacts: settings.contacts || '',
    branches: settings.branches || '',
    groupLink: settings.group_link || '',
    isUpdate: true,
  });

  let sentCount = 0;
  for (const row of subscribersResult.rows) {
    try {
      await telegramBot.sendMessage(row.chat_id, message, { parse_mode: 'Markdown' });
      sentCount++;
    } catch (err) {
      const errMsg = (err as Error).message || '';
      if (errMsg.includes('blocked') || errMsg.includes('chat not found') || errMsg.includes('deactivated')) {
        await pool.query('UPDATE bot_subscribers SET is_active=FALSE WHERE chat_id=$1', [row.chat_id]);
      }
      console.error(`خطأ في إرسال لـ ${row.chat_id}:`, errMsg);
    }
  }

  // Log broadcast activity
  await pool.query(
    `INSERT INTO bot_activity (action, chat_id, first_name) VALUES ('broadcast', 0, $1)`,
    [`تم الإرسال لـ ${sentCount} مشترك`]
  );

  console.log(`📢 تم البث لـ ${sentCount} من أصل ${subscribersResult.rows.length} مشترك`);
  return sentCount;
}

async function saveSubscriber(chatId: number, username: string | undefined, firstName: string | undefined) {
  await pool.query(
    `INSERT INTO bot_subscribers (chat_id, username, first_name, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (chat_id) DO UPDATE SET is_active=TRUE, username=$2, first_name=$3`,
    [chatId, username || null, firstName || null]
  );
  await pool.query(
    `INSERT INTO bot_activity (chat_id, username, first_name, action)
     VALUES ($1, $2, $3, 'subscribe')`,
    [chatId, username || null, firstName || null]
  );
}

async function logPriceRequest(chatId: number, username: string | undefined, firstName: string | undefined) {
  await pool.query(
    `INSERT INTO bot_activity (chat_id, username, first_name, action)
     VALUES ($1, $2, $3, 'price_request')`,
    [chatId, username || null, firstName || null]
  );
}

function initTelegramBot() {
  if (!TELEGRAM_TOKEN) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN غير محدد — البوت غير مفعّل');
    return;
  }

  telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  // /start command
  telegramBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'عزيزنا';
    try {
      await saveSubscriber(chatId, msg.from?.username, msg.from?.first_name);
    } catch {}

    const welcomeMsg =
      `مرحباً ${firstName}! 👋\n\n` +
      `أنا بوت *مجوهرات بابل* 💎\n\n` +
      `✅ تم تفعيل الاشتراك في تحديثات الأسعار!\n` +
      `ستصلك رسالة تلقائية في كل مرة يتم فيها تحديث سعر الذهب.\n\n` +
      `يمكنك أيضاً السؤال عن السعر في أي وقت:\n` +
      `_"كم سعر الذهب اليوم؟"_\n` +
      `_"أسعار الذهب"_\n\n` +
      `📌 أوامر أخرى:\n` +
      `/unsubscribe — إيقاف الاشتراك\n` +
      `/price — آخر سعر للذهب\n\n` +
      `💎 شكراً لاختياركم مجوهرات بابل!`;
    await telegramBot!.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
  });

  // /price command
  telegramBot.onText(/\/price/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await telegramBot!.sendChatAction(chatId, 'typing');
      const priceMsg = await getLatestPriceMessage();
      await telegramBot!.sendMessage(chatId, priceMsg, { parse_mode: 'Markdown' });
      await logPriceRequest(chatId, msg.from?.username, msg.from?.first_name);
    } catch (err) {
      console.error('خطأ في /price:', err);
    }
  });

  // /unsubscribe command
  telegramBot.onText(/\/unsubscribe/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await pool.query('UPDATE bot_subscribers SET is_active=FALSE WHERE chat_id=$1', [chatId]);
      await telegramBot!.sendMessage(
        chatId,
        '❌ تم إيقاف الاشتراك.\nلن تصلك تحديثات الأسعار بعد الآن.\n\nللعودة: /start',
        { parse_mode: 'Markdown' }
      );
    } catch {}
  });

  // General messages (non-commands)
  telegramBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    if (text.startsWith('/')) return;

    if (containsPriceKeyword(text)) {
      try {
        await telegramBot!.sendChatAction(chatId, 'typing');
        const priceMsg = await getLatestPriceMessage();
        await telegramBot!.sendMessage(chatId, priceMsg, { parse_mode: 'Markdown' });
        await logPriceRequest(chatId, msg.from?.username, msg.from?.first_name).catch(() => {});
      } catch (err) {
        console.error('خطأ في إرسال رسالة البوت:', err);
      }
      return;
    }

    const hint =
      `💬 شكراً على تواصلك!\n\n` +
      `لمعرفة أسعار الذهب، اكتب:\n` +
      `*"سعر الذهب"* أو اضغط /price\n\n` +
      `للاشتراك في التحديثات التلقائية: /start\n\n` +
      `💎 نسعد بخدمتكم!`;
    await telegramBot!.sendMessage(chatId, hint, { parse_mode: 'Markdown' });
  });

  telegramBot.on('polling_error', (err) => {
    console.error('Telegram polling error:', (err as Error).message);
  });

  console.log(`🤖 بوت تيليجرام مفعّل: @${BOT_USERNAME}`);
  console.log(`🔗 رابط البوت: ${BOT_LINK}`);
}

// --- Start Server ---
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  await initDatabase();
  await initCronFromDB();
  initTelegramBot();
});

export default app;
