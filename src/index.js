require('dotenv').config();
const { client } = require('./whatsapp');

console.log('🚀 Star Academy Bot Starting...');

if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY missing in .env');
  process.exit(1);
}

client.initialize();