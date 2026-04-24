// src/sheets.js

require('dotenv').config();
const { google } = require('googleapis');

// Google Sheets connection banao
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

// Sheet ID .env se lo
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Sheets client banao
async function getSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// ================================
// FUNCTION 1: Admission Save Karo
// ================================
async function saveAdmission(data) {
  try {
    const sheets = await getSheetsClient();

    // Unique ID banao — timestamp se
    const id = Date.now().toString();

    // Row banao jo sheet mein jayegi
    const row = [
      id,                    // ID
      data.name,             // Student Name
      data.phone,            // Phone
      data.studentClass,     // Class
      data.subject,          // Subject
      'Pending',             // Status
      new Date().toLocaleDateString('en-PK') // Date
    ];

    // ADMISSIONS sheet mein add karo
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'ADMISSIONS!A:G',
      valueInputOption: 'RAW',
      resource: { values: [row] }
    });

    console.log('✅ Admission saved:', data.name);
    return true;

  } catch (error) {
    console.error('❌ Admission save error:', error.message);
    return false;
  }
}

// ================================
// FUNCTION 2: Inquiry Save Karo
// ================================
async function saveInquiry(data) {
  try {
    const sheets = await getSheetsClient();

    const id = Date.now().toString();

    const row = [
      id,                    // ID
      data.name,             // Name
      data.phone,            // Phone
      data.question,         // Question
      new Date().toLocaleDateString('en-PK') // Date
    ];

    // INQUIRIES sheet mein add karo
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'INQUIRIES!A:E',
      valueInputOption: 'RAW',
      resource: { values: [row] }
    });

    console.log('✅ Inquiry saved:', data.question);
    return true;

  } catch (error) {
    console.error('❌ Inquiry save error:', error.message);
    return false;
  }
}

// ================================
// FUNCTION 3: Trial Class Book Karo
// ================================
async function saveTrialClass(data) {
  try {
    const sheets = await getSheetsClient();

    const id = Date.now().toString();

    const row = [
      id,                    // ID
      data.name,             // Name
      data.phone,            // Phone
      data.date,             // Date
      data.time,             // Time
      'Booked'               // Status
    ];

    // TRIAL_CLASSES sheet mein add karo
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'TRIAL_CLASSES!A:F',
      valueInputOption: 'RAW',
      resource: { values: [row] }
    });

    console.log('✅ Trial class saved:', data.name);
    return true;

  } catch (error) {
    console.error('❌ Trial class save error:', error.message);
    return false;
  }
}

// ================================
// FUNCTION 4: Saari Admissions Lo
// ================================
async function getAllAdmissions() {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'ADMISSIONS!A:G'
    });

    return response.data.values || [];

  } catch (error) {
    console.error('❌ Get admissions error:', error.message);
    return [];
  }
}

module.exports = {
  saveAdmission,
  saveInquiry,
  saveTrialClass,
  getAllAdmissions
};