import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
dotenv.config();

async function testTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing');
    return;
  }
  try {
    const bot = new TelegramBot(token, { polling: false });
    const me = await bot.getMe();
    console.log('✅ Telegram Bot Identity:', me.username);
  } catch (err) {
    console.error('❌ Telegram Error:', err);
  }
}

testTelegram();
