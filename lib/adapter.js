/**
 * lib/adapter.js
 * ─────────────────────────────────────────────────────────────────
 *  Resolves which data source to use:
 *    1. USE_MOCK=true           → always Mock
 *    2. USE_MOCK=false          → try real MikroTik, throw on fail
 *    3. AUTO_FALLBACK_TO_MOCK   → try real, silently fall back to Mock
 *
 *  Usage anywhere in the app:
 *    const api = require('./lib/adapter');
 *    const vouchers = await api.getVouchers();
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const Mock     = require('./mock');
const Mikrotik = require('./mikrotik');

const USE_MOCK     = process.env.USE_MOCK            === 'true';
const AUTO_FALLBACK = process.env.AUTO_FALLBACK_TO_MOCK !== 'false'; // default true

let _resolved = null;     // cached after first successful connect
let _status   = 'unknown'; // 'mock' | 'live' | 'unknown'

async function resolve() {
  if (_resolved) return _resolved;

  if (USE_MOCK) {
    console.log('[adapter] Mode: MOCK (USE_MOCK=true)');
    _status   = 'mock';
    _resolved = Mock;
    return Mock;
  }

  // Try real router
  try {
    await Mikrotik.connect();
    console.log('[adapter] Mode: LIVE (real MikroTik connected)');
    _status   = 'live';
    _resolved = Mikrotik;
    return Mikrotik;
  } catch (err) {
    if (AUTO_FALLBACK) {
      console.warn(`[adapter] Router unreachable (${err.message}) — falling back to MOCK`);
      _status   = 'mock';
      _resolved = Mock;
      return Mock;
    }
    throw err;
  }
}

// Reset so the next call tries to reconnect (called by /api/router/connect)
function reset() {
  _resolved = null;
  _status   = 'unknown';
  try { Mikrotik.disconnect(); } catch (_) {}
}

// Proxy: forwards every method call through the resolved adapter
// with automatic reconnect on transient failures
const handler = {
  get(_, prop) {
    if (prop === 'status') return () => _status;
    if (prop === 'reset')  return reset;

    return async (...args) => {
      const api = await resolve();
      try {
        return await api[prop](...args);
      } catch (err) {
        // On live connection drop, try once more via mock if fallback enabled
        if (_status === 'live' && AUTO_FALLBACK) {
          console.warn(`[adapter] Live call failed (${err.message}) — retrying via mock`);
          _resolved = null;
          _status   = 'unknown';
          const fallback = await resolve();
          return fallback[prop](...args);
        }
        throw err;
      }
    };
  },
};

module.exports = new Proxy({}, handler);
