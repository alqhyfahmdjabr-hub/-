
import * as dotenv from 'dotenv';
dotenv.config();
const token = process.env.TELEGRAM_BOT_TOKEN;

async function checkBot() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    console.log('Bot Info:', JSON.stringify(data, null, 2));

    const webhook = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const webhookData = await webhook.json();
    console.log('Webhook Info:', JSON.stringify(webhookData, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBot();
