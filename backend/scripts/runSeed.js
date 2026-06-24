const https = require('https');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
let supabaseUrl = '', serviceKey = '';
for (const line of envContent.split(/\r?\n/)) {
  const parts = line.split('=');
  const k = parts[0].trim();
  const v = parts.slice(1).join('=').trim();
  if (k === 'EXPO_PUBLIC_SUPABASE_URL') supabaseUrl = v;
  if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = v;
}

const sql = fs.readFileSync(path.join(__dirname, 'seedAdminGaps.sql'), 'utf8');

// Supabase allows executing raw SQL via the pg endpoint (service role only)
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

const postData = Buffer.from(sql, 'utf8');
const options = {
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey,
    'Content-Type': 'text/plain',
    'Content-Length': postData.length
  }
};

// Use the /pg endpoint for raw SQL (requires service role)
const url = `${supabaseUrl}/pg`;
const req = https.request(url, options, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    if (res.statusCode >= 400) {
      console.error('Error HTTP', res.statusCode, ':', body.substring(0, 2000));
    } else {
      console.log('Success:', body.substring(0, 2000));
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(postData);
req.end();
