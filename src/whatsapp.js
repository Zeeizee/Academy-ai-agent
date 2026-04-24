// src/whatsapp.js

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { askAgent, resetConversation } = require('./agent');
const { saveAdmission, saveInquiry, saveTrialClass } = require('./sheets');

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
    executablePath: null
  }
});

let isReady = false;

// ================================
// QR CODE
// ================================
client.on('qr', (qr) => {
  console.log('\n=== QR CODE SCAN KARO ===\n');
  qrcode.generate(qr, { small: true });
});

// ================================
// CONNECTED
// ================================
client.on('ready', () => {
  isReady = true;
  console.log('\n✅ WhatsApp Connected!');
  console.log('🤖 Star Academy Bot Ready!\n');
});

// ================================
// SAFE REPLY FUNCTION
// ================================
async function safeReply(msg, text, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await msg.reply(text);
      return;
    } catch (error) {
      const message = error?.message || '';
      const isNavigationError =
        message.includes('Execution context was destroyed') ||
        message.includes('Cannot find context with specified id');
      const isSendSeenBug =
        message.includes('getLastMsgKeyForAction is not a function') ||
        message.includes("Cannot read properties of undefined (reading 'description')");

      // WA Web updates kabhi kabhi reply flow tod deti hain (sendSeen path).
      // Fallback: direct send without seen/typing dependency.
      if (isSendSeenBug) {
        try {
          await client.sendMessage(msg.from, text, { sendSeen: false });
          return;
        } catch (fallbackError) {
          if (attempt === retries) throw fallbackError;
          console.warn(`⚠️ Fallback send failed, retrying (${attempt + 1}/${retries + 1})...`);
          await sleep(1000);
          continue;
        }
      }

      if (!isNavigationError || attempt === retries) {
        throw error;
      }

      console.warn(`⚠️ Retrying reply (${attempt + 1}/${retries + 1})...`);
      await sleep(1000);
    }
  }
}

// ================================
// SAVE DATA EXTRACT KARO
// ================================
async function extractAndSave(aiReply, userPhone) {
  try {

    // ADMISSION data check karo
    if (aiReply.includes('SAVE_ADMISSION:')) {

      // JSON part nikalo
      const jsonStr = aiReply
        .split('SAVE_ADMISSION:')[1]
        .split('\n')[0]
        .trim();

      const data = JSON.parse(jsonStr);
      data.phone = data.phone || userPhone;

      // Sheets mein save karo
      const saved = await saveAdmission(data);

      if (saved) {
        console.log('✅ Admission saved to sheets:', data);
      }

      // SAVE_ line reply se hatao
      return aiReply
        .split('SAVE_ADMISSION:')[0]
        .trim();
    }

    // TRIAL data check karo
    if (aiReply.includes('SAVE_TRIAL:')) {

      const jsonStr = aiReply
        .split('SAVE_TRIAL:')[1]
        .split('\n')[0]
        .trim();

      const data = JSON.parse(jsonStr);
      data.phone = data.phone || userPhone;

      const saved = await saveTrialClass(data);

      if (saved) {
        console.log('✅ Trial class saved to sheets:', data);
      }

      // SAVE_ line reply se hatao
      return aiReply
        .split('SAVE_TRIAL:')[0]
        .trim();
    }

    // Koi save nahi — normal reply
    return aiReply;

  } catch (error) {
    console.error('❌ Extract/Save error:', error.message);
    // Error pe bhi clean reply do
    return aiReply
      .replace(/SAVE_ADMISSION:.*$/m, '')
      .replace(/SAVE_TRIAL:.*$/m, '')
      .trim();
  }
}

// ================================
// RESET DETECT KARO
// ================================
function isResetCommand(message) {
  return message.toLowerCase().trim() === 'reset';
}

// ================================
// MAIN MESSAGE HANDLER
// ================================
client.on('message', async (msg) => {

  // Groups ignore karo
  if (msg.from.includes('@g.us')) return;

  // Bot ready nahi toh skip
  if (!isReady) {
    console.log('⏳ Bot not ready yet, skipping.');
    return;
  }

  const userPhone = msg.from;
  const userMessage = (msg.body || '').trim();

  // Empty message ignore karo
  if (!userMessage) return;

  console.log(`\n📱 From: ${userPhone}`);
  console.log(`💬 Message: ${userMessage}`);

  try {

    // Typing indicator
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    // Reset check karo
    if (isResetCommand(userMessage)) {
      const reply = resetConversation(userPhone);
      await safeReply(msg, reply);
      return;
    }

    // AI se reply lo
    const rawReply = await askAgent(userPhone, userMessage);
    console.log(`🤖 Raw Reply: ${rawReply}`);

    // Data extract karo aur save karo
    const cleanReply = await extractAndSave(rawReply, userPhone);
    console.log(`📤 Clean Reply: ${cleanReply}`);

    // Clean reply bhejo
    await safeReply(msg, cleanReply);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await safeReply(
      msg,
      'Maafi chahta hun, abhi technical masla hai. ' +
      'Thodi der baad try karein. 🙏'
    );
  }
});

// ================================
// DISCONNECTED
// ================================
client.on('disconnected', (reason) => {
  isReady = false;
  console.log('❌ Disconnected:', reason);
});

module.exports = { client };