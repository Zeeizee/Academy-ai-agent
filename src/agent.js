// src/agent.js

require('dotenv').config();
const Groq = require('groq-sdk');
const { ACADEMY_PROMPT } = require('./prompts');

// Groq client banao
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Har user ki conversation history
// Phone number ke hisaab se alag alag store hogi
const conversationHistory = {};

async function askAgent(userPhone, userMessage) {
  try {

    // Agar is number ki history nahi
    // toh empty array banao
    if (!conversationHistory[userPhone]) {
      conversationHistory[userPhone] = [];
    }

    // User ka message history mein add karo
    conversationHistory[userPhone].push({
      role: "user",
      content: userMessage
    });

    // Sirf last 10 messages rakho
    // Memory zyada na bhare
    if (conversationHistory[userPhone].length > 10) {
      conversationHistory[userPhone] = 
        conversationHistory[userPhone].slice(-10);
    }

    // Groq API call karo
    // llama3-8b-8192 decommissioned — see https://console.groq.com/docs/deprecations
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [
        // System prompt — Agent ka brain
        {
          role: "system",
          content: ACADEMY_PROMPT
        },
        // Poori conversation history
        ...conversationHistory[userPhone]
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    // AI ka reply nikalo
    const aiReply = response.choices[0].message.content;

    // AI reply bhi history mein save karo
    conversationHistory[userPhone].push({
      role: "assistant",
      content: aiReply
    });

    return aiReply;

  } catch (error) {
    console.error("Agent Error:", error.message);
    return "Maafi chahta hun, abhi " +
           "technical masla hai. " +
           "Thodi der baad try karein. 🙏";
  }
}

// Conversation reset karna
function resetConversation(userPhone) {
  conversationHistory[userPhone] = [];
  return "Conversation reset ho gayi! " +
         "Nayi baat shuru karein. 😊";
}

module.exports = { askAgent, resetConversation };