/**
 * server.js — VoucherNet API Server
 * ─────────────────────────────────
 * Start:        node server.js
 * Mock mode:    USE_MOCK=true node server.js   (or npm run mock)
 * Dev watch:    npx nodemon server.js
 */

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev-friendly) ───────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms  = Date.now() - start;
    const col = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${col}${req.method}\x1b[0m ${req.url} \x1b[2m${res.statusCode} ${ms}ms\x1b[0m`);
  });
  next();
});

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/plans',    require('./routes/plans'));
app.use('/api/system',   require('./routes/system'));
app.use('/api/reports',  require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), ts: new Date().toISOString() });
});

// ── Static frontend ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback — serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const mock = process.env.USE_MOCK === 'true';
  console.log('\n  \x1b[36m⚡ VoucherNet\x1b[0m  WiFi Hotspot Manager');
  console.log(`  \x1b[2mListening on\x1b[0m  http://localhost:${PORT}`);
  console.log(`  \x1b[2mData source  \x1b[0m  ${mock ? '\x1b[33mMOCK\x1b[0m (no router needed)' : '\x1b[32mLIVE\x1b[0m (will connect to MikroTik)'}`);
  console.log(`  \x1b[2mRouter host  \x1b[0m  ${process.env.MIKROTIK_HOST || '192.168.88.1'}`);
  if (process.env.AUTO_FALLBACK_TO_MOCK !== 'false') {
    console.log('  \x1b[2mFallback     \x1b[0m  Auto-fallback to mock if router unreachable\n');
  }
});
