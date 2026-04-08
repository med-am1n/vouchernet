/**
 * lib/mock.js
 * ─────────────────────────────────────────────────────────────────
 *  Mock data layer — identical interface to lib/mikrotik.js
 *  Used when:
 *    1. USE_MOCK=true in .env
 *    2. AUTO_FALLBACK_TO_MOCK=true and router is unreachable
 *
 *  RouterOS response shapes are preserved exactly so switching to
 *  real hardware requires zero frontend/route changes.
 * ─────────────────────────────────────────────────────────────────
 */

const rnd   = n  => Math.random().toString(36).substr(2, n).toUpperCase();
const delay = ms => new Promise(r => setTimeout(r, ms || 120));
const gb    = n  => String(Math.floor(n * 1073741824));
const mb    = n  => String(Math.floor(n * 1048576));

// ── Stable seed data ────────────────────────────────────────────
const PLANS = [
  { '.id':'*1', name:'1-Hour',  'rate-limit':'2M/2M',    'session-timeout':'01:00:00', 'shared-users':'1', 'address-pool':'hs-pool', price:100  },
  { '.id':'*2', name:'3-Hours', 'rate-limit':'3M/3M',    'session-timeout':'03:00:00', 'shared-users':'1', 'address-pool':'hs-pool', price:250  },
  { '.id':'*3', name:'Daily',   'rate-limit':'5M/5M',    'session-timeout':'1d00:00:00','shared-users':'2', 'address-pool':'hs-pool', price:500  },
  { '.id':'*4', name:'Weekly',  'rate-limit':'10M/10M',  'session-timeout':'7d00:00:00','shared-users':'3', 'address-pool':'hs-pool', price:2000 },
  { '.id':'*5', name:'Monthly', 'rate-limit':'20M/20M',  'session-timeout':'30d00:00:00','shared-users':'5','address-pool':'hs-pool', price:5000 },
];

let _vouchers = [
  { '.id':'*a1', name:'HSP-A3F9K2', password:'XK9MP2', profile:'1-Hour',  disabled:'false', uptime:'0s',      'bytes-in':'0',         'bytes-out':'0',         comment:'',      createdAt:'2026-04-07T08:00:00Z' },
  { '.id':'*b2', name:'HSP-B7L4N8', password:'QR5JW1', profile:'3-Hours', disabled:'false', uptime:'0s',      'bytes-in':'0',         'bytes-out':'0',         comment:'',      createdAt:'2026-04-07T09:15:00Z' },
  { '.id':'*c3', name:'HSP-C2M6P1', password:'YT8HV4', profile:'Daily',   disabled:'true',  uptime:'23:14:05','bytes-in': mb(512),    'bytes-out': mb(200),    comment:'',      createdAt:'2026-04-06T10:00:00Z' },
  { '.id':'*d4', name:'HSP-D5R3Q7', password:'NZ6BX3', profile:'1-Hour',  disabled:'false', uptime:'0s',      'bytes-in':'0',         'bytes-out':'0',         comment:'T5',    createdAt:'2026-04-07T10:30:00Z' },
  { '.id':'*e5', name:'HSP-E8S1T4', password:'MU2CY7', profile:'Weekly',  disabled:'false', uptime:'2d05:11:20','bytes-in':gb(2),     'bytes-out':gb(1),       comment:'',      createdAt:'2026-04-05T12:00:00Z' },
  { '.id':'*f6', name:'HSP-F1K8N3', password:'PL4ZW9', profile:'Daily',   disabled:'false', uptime:'0s',      'bytes-in':'0',         'bytes-out':'0',         comment:'',      createdAt:'2026-04-08T06:00:00Z' },
];

let _sessions = [
  { '.id':'*s1', user:'HSP-A3F9K2', address:'192.168.99.101', 'mac-address':'AA:BB:CC:11:22:33', uptime:'00:23:14', 'bytes-in': mb(15), 'bytes-out': mb(5),  server:'hotspot1', profile:'1-Hour',  host:'Android',      status:'online' },
  { '.id':'*s2', user:'HSP-E8S1T4', address:'192.168.99.102', 'mac-address':'DD:EE:FF:44:55:66', uptime:'02:15:40', 'bytes-in': gb(2),  'bytes-out': gb(1),  server:'hotspot1', profile:'Weekly',  host:'iPhone',       status:'online' },
  { '.id':'*s3', user:'HSP-B7L4N8', address:'192.168.99.103', 'mac-address':'77:88:99:AA:BB:CC', uptime:'00:45:22', 'bytes-in': mb(30), 'bytes-out': mb(10), server:'hotspot1', profile:'3-Hours', host:'Windows PC',   status:'online' },
];

const SYSINFO = {
  'board-name':        'CHR',
  'version':           '7.14.3 (stable)',
  'build-time':        'Jan/09/2026 07:00:00',
  uptime:              '5d02h14m33s',
  'cpu-load':          '12',
  'cpu-count':         '2',
  'cpu-frequency':     '2400',
  'free-memory':       String(256 * 1048576),
  'total-memory':      String(512 * 1048576),
  'free-hdd-space':    gb(2),
  'total-hdd-space':   gb(5),
  'architecture-name': 'x86_64',
  platform:            'MikroTik',
  'bad-blocks':        '0',
};

const IDENTITY = { name: 'CHR-Mock' };

const HOTSPOTS = [
  { '.id':'*h1', name:'hotspot1', interface:'bridge-local', 'address-pool':'hs-pool', profile:'hsprof1', disabled:'false' },
];

const NEIGHBORS = [
  { '.id':'*n1', address:'192.168.88.1', identity:'CHR-Mock', 'board':'CHR', version:'7.14.3 (stable)', interface:'ether1', 'mac-address':'AA:BB:CC:DD:EE:FF', platform:'MikroTik' },
];

// ── Sales data helper ────────────────────────────────────────────
function makeSalesData(days) {
  const out = [];
  const seed = 42;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const pseudo = Math.abs(Math.sin(i * seed) * 10000);
    out.push({
      date:     d.toISOString().split('T')[0],
      label:    d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      revenue:  Math.floor(pseudo % 3200) + 400,
      vouchers: Math.floor((pseudo % 28)) + 4,
    });
  }
  return out;
}

// ── ID generator ─────────────────────────────────────────────────
let _seq = 100;
const nextId = () => '*m' + (++_seq);

// ── Exported API (same shape as lib/mikrotik.js) ─────────────────
const Mock = {
  isMock: true,

  // /ip/hotspot/user/print
  async getVouchers() {
    await delay();
    return [..._vouchers];
  },

  // /ip/hotspot/user/add
  async createVouchers({ profile, count, prefix, comment }) {
    await delay(300);
    const batch = [];
    for (let i = 0; i < count; i++) {
      const v = {
        '.id':       nextId(),
        name:        `${prefix}-${rnd(6)}`,
        password:    rnd(8),
        profile,
        disabled:    'false',
        uptime:      '0s',
        'bytes-in':  '0',
        'bytes-out': '0',
        comment:     comment || '',
        createdAt:   new Date().toISOString(),
      };
      _vouchers.unshift(v);
      batch.push(v);
    }
    return batch;
  },

  // /ip/hotspot/user/remove
  async deleteVoucher(id) {
    await delay();
    _vouchers = _vouchers.filter(v => v['.id'] !== id);
    return true;
  },

  // /ip/hotspot/active/print
  async getActiveSessions() {
    await delay();
    // Simulate slight uptime change each call
    return _sessions.map(s => ({
      ...s,
      'bytes-in': String(parseInt(s['bytes-in']) + Math.floor(Math.random() * 65536)),
    }));
  },

  // /ip/hotspot/active/remove
  async kickSession(id) {
    await delay();
    _sessions = _sessions.filter(s => s['.id'] !== id);
    return true;
  },

  // /ip/hotspot/user/profile/print
  async getPlans() {
    await delay();
    return [...PLANS];
  },

  // /ip/hotspot/user/profile/add
  async createPlan(plan) {
    await delay();
    const p = { '.id': nextId(), ...plan };
    PLANS.push(p);
    return p;
  },

  // /ip/hotspot/user/profile/remove
  async deletePlan(id) {
    await delay();
    const i = PLANS.findIndex(p => p['.id'] === id);
    if (i !== -1) PLANS.splice(i, 1);
    return true;
  },

  // /system/resource/print
  async getSystemInfo() {
    await delay();
    return {
      ...SYSINFO,
      'cpu-load': String(Math.floor(Math.random() * 30) + 5),
    };
  },

  // /system/identity/print
  async getIdentity() {
    await delay();
    return { ...IDENTITY };
  },

  // /ip/hotspot/print
  async getHotspots() {
    await delay();
    return [...HOTSPOTS];
  },

  // /ip/neighbor/print
  async discoverRouters() {
    await delay(500);
    return [...NEIGHBORS];
  },

  // Aggregated sales (derived from voucher log in real impl)
  async getSalesReport(days = 7) {
    await delay(200);
    return makeSalesData(days);
  },

  // Not needed in mock but exposed for interface parity
  async connect() { return true; },
  async disconnect() { return true; },
};

module.exports = Mock;
