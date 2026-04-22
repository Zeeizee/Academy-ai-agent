const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: true,
      executablePath: null  // Auto detect karega
    }
  });

let isReady = false;

client.on('qr', (qr) => {
  console.log('\n=== QR CODE SCAN KARO ===\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  console.log('\n✅ WhatsApp Connected!');
  console.log('🤖 Bot Ready!\n');
});

async function safeReply(msg, text, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
        await msg.react('👍');
      await msg.reply(text);
      return;
    } catch (error) {
      const message = error?.message || '';
      const isNavigationError =
        message.includes('Execution context was destroyed') ||
        message.includes('Cannot find context with specified id');

      if (!isNavigationError || attempt === retries) {
        throw error;
      }

      console.warn(`⚠️ WhatsApp reloading, retrying reply (${attempt + 1}/${retries + 1})...`);
      await sleep(1000);
    }
  }
}

client.on('message', async (msg) => {
  if (msg.from.includes('@g.us')) return;
  if (!isReady) {
    console.log('⏳ Message received before ready, skipping.');
    return;
  }

  const text = (msg.body || '').trim();
  console.log('📱 Message:', text || '[non-text message]');

  try {
    await safeReply(msg, '✅ Bot working!');
  } catch (error) {
    console.error('❌ Failed to reply:', error.message);
  }
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.log('❌ Disconnected:', reason);
});

module.exports = { client };