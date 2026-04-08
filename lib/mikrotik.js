/**
 * lib/mikrotik.js
 * ─────────────────────────────────────────────────────────────────
 *  Real MikroTik RouterOS API layer using routeros-client.
 *  Every method has an identical signature to lib/mock.js so the
 *  two are 100% interchangeable.
 *
 *  RouterOS binary API runs on port 8728 (plain) / 8729 (TLS).
 *  Requires: npm install routeros-client
 * ─────────────────────────────────────────────────────────────────
 */

const { RouterOSAPI, Channel, Receiver } = require('routeros-client');

// Compatibility patch:
// Some RouterOS v7 commands may return `!empty` when no rows exist.
// Older node-routeros versions treat this as unknown and throw.
if (Channel && !Channel.prototype.__voucherNetEmptyReplyPatched) {
  const originalProcessPacket = Channel.prototype.processPacket;
  Channel.prototype.processPacket = function patchedProcessPacket(packet) {
    if (Array.isArray(packet) && packet[0] === '!empty') packet[0] = '!done';
    return originalProcessPacket.call(this, packet);
  };
  Channel.prototype.__voucherNetEmptyReplyPatched = true;
}

// Compatibility patch:
// Some RouterOS replies may arrive after a channel/tag is already closed.
// Older node-routeros throws UNREGISTEREDTAG and crashes the process.
if (Receiver && !Receiver.prototype.__voucherNetUnregisteredTagPatched) {
  const originalSendTagData = Receiver.prototype.sendTagData;
  Receiver.prototype.sendTagData = function patchedSendTagData(currentTag) {
    const tag = this.tags && this.tags.get ? this.tags.get(currentTag) : null;
    if (!tag) {
      this.cleanUp();
      return;
    }
    return originalSendTagData.call(this, currentTag);
  };
  Receiver.prototype.__voucherNetUnregisteredTagPatched = true;
}

// ── Connection singleton ─────────────────────────────────────────
let _client  = null;
let _promise = null;

async function getClient() {
  if (_client && _client.connected) return _client;

  if (_promise) return _promise;   // already connecting, wait

  _promise = (async () => {
    const cfg = {
      host:     process.env.MIKROTIK_HOST     || '192.168.88.1',
      port:     parseInt(process.env.MIKROTIK_PORT || '8728'),
      user:     process.env.MIKROTIK_USER     || 'admin',
      password: process.env.MIKROTIK_PASSWORD || '',
      timeout:  parseInt(process.env.MIKROTIK_TIMEOUT || '10000'),
      keepalive: true,
    };

    _client = new RouterOSAPI(cfg);
    await _client.connect();
    console.log(`[mikrotik] Connected to ${cfg.host}:${cfg.port}`);

    _client.on('close',  () => { console.warn('[mikrotik] Connection closed'); _client = null; _promise = null; });
    _client.on('error',  err => { console.error('[mikrotik] Error:', err.message); _client = null; _promise = null; });

    return _client;
  })();

  try {
    const c = await _promise;
    _promise = null;
    return c;
  } catch (err) {
    _promise = null;
    throw err;
  }
}

// ── Helper: write a command and return array of result objects ───
async function write(cmd, params = []) {
  const client = await getClient();
  return client.write(cmd, params);
}

// ── Helper: random code ─────────────────────────────────────────
const rnd = n => Math.random().toString(36).substr(2, n).toUpperCase();

// ── Sales report (derived — reads hotspot log) ───────────────────
async function buildSalesReport(days) {
  // RouterOS API: /log/print — filter hotspot-account entries
  // In production you'd parse /log/print entries with topic=info
  // and match "logged in" messages to reconstruct per-day counts.
  // For now we return placeholder data from the active users table.
  const vouchers = await write('/ip/hotspot/user/print');
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayVouchers = vouchers.filter(v => {
      if (!v.comment) return false;
      return v.comment.startsWith(dateStr);
    });
    out.push({
      date:     dateStr,
      label:    d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      revenue:  dayVouchers.length * 300,   // placeholder pricing
      vouchers: dayVouchers.length,
    });
  }
  return out;
}

// ── Exported API ─────────────────────────────────────────────────
const Mikrotik = {
  isMock: false,

  async connect() {
    return getClient();
  },

  async disconnect() {
    if (_client) { try { await _client.close(); } catch (_) {} _client = null; }
  },

  // /ip/hotspot/user/print
  async getVouchers() {
    const rows = await write('/ip/hotspot/user/print');
    return rows.map(r => ({
      '.id':       r['.id'],
      name:        r.name,
      password:    r.password || '',
      profile:     r.profile || '',
      disabled:    r.disabled || 'false',
      uptime:      r.uptime   || '0s',
      'bytes-in':  r['bytes-in']  || '0',
      'bytes-out': r['bytes-out'] || '0',
      comment:     r.comment || '',
      createdAt:   r.comment && r.comment.includes('created:')
                     ? r.comment.split('created:')[1].trim()
                     : new Date().toISOString(),
    }));
  },

  // /ip/hotspot/user/add  (batch)
  async createVouchers({ profile, count, prefix, comment }) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      const name     = `${prefix}-${rnd(6)}`;
      const password = rnd(8);
      const created  = new Date().toISOString();
      const fullComment = [comment, `created:${created}`].filter(Boolean).join(' | ');

      const res = await write('/ip/hotspot/user/add', [
        `=name=${name}`,
        `=password=${password}`,
        `=profile=${profile}`,
        `=comment=${fullComment}`,
      ]);

      batch.push({
        '.id':       res[0]?.['.id'] || '*new',
        name,
        password,
        profile,
        disabled:    'false',
        uptime:      '0s',
        'bytes-in':  '0',
        'bytes-out': '0',
        comment,
        createdAt:   created,
      });
    }
    return batch;
  },

  // /ip/hotspot/user/remove
  async deleteVoucher(id) {
    await write('/ip/hotspot/user/remove', [`=.id=${id}`]);
    return true;
  },

  // /ip/hotspot/active/print
  async getActiveSessions() {
    const rows = await write('/ip/hotspot/active/print');
    return rows.map(r => ({
      '.id':          r['.id'],
      user:           r.user,
      address:        r.address,
      'mac-address':  r['mac-address'] || '',
      uptime:         r.uptime         || '0s',
      'bytes-in':     r['bytes-in']    || '0',
      'bytes-out':    r['bytes-out']   || '0',
      server:         r.server         || '',
      profile:        r.profile        || '',
      host:           r.host           || '',
      status:         'online',
    }));
  },

  // /ip/hotspot/active/remove
  async kickSession(id) {
    await write('/ip/hotspot/active/remove', [`=.id=${id}`]);
    return true;
  },

  // /ip/hotspot/user/profile/print
  async getPlans() {
    const rows = await write('/ip/hotspot/user/profile/print');
    return rows.map(r => ({
      '.id':            r['.id'],
      name:             r.name,
      'rate-limit':     r['rate-limit']     || '',
      'session-timeout':r['session-timeout']|| '',
      'shared-users':   r['shared-users']   || '1',
      'address-pool':   r['address-pool']   || '',
      price:            parseInt(r.comment?.match(/price:(\d+)/)?.[1] || '0'),
    }));
  },

  // /ip/hotspot/user/profile/add
  async createPlan(plan) {
    const comment = `price:${plan.price || 0}`;
    const res = await write('/ip/hotspot/user/profile/add', [
      `=name=${plan.name}`,
      `=rate-limit=${plan['rate-limit'] || ''}`,
      `=session-timeout=${plan['session-timeout'] || ''}`,
      `=shared-users=${plan['shared-users'] || '1'}`,
      `=comment=${comment}`,
    ]);
    return { '.id': res[0]?.['.id'] || '*new', ...plan };
  },

  // /ip/hotspot/user/profile/remove
  async deletePlan(id) {
    await write('/ip/hotspot/user/profile/remove', [`=.id=${id}`]);
    return true;
  },

  // /system/resource/print
  async getSystemInfo() {
    const [res] = await write('/system/resource/print');
    return res;
  },

  // /system/identity/print
  async getIdentity() {
    const [res] = await write('/system/identity/print');
    return { name: res.name };
  },

  // /ip/hotspot/print
  async getHotspots() {
    return write('/ip/hotspot/print');
  },

  // /ip/neighbor/print
  async discoverRouters() {
    const rows = await write('/ip/neighbor/print');
    return rows.map(r => ({
      '.id':          r['.id'],
      address:        r.address,
      identity:       r.identity     || '',
      board:          r['board-name']|| '',
      version:        r.version      || '',
      interface:      r.interface    || '',
      'mac-address':  r['mac-address']|| '',
      platform:       r.platform     || '',
    }));
  },

  async getSalesReport(days = 7) {
    return buildSalesReport(days);
  },
};

module.exports = Mikrotik;
