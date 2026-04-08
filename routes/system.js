const router = require('express').Router();
const api    = require('../lib/adapter');

// GET /api/system/info
router.get('/info', async (req, res) => {
  try {
    const [sysinfo, identity, hotspots] = await Promise.all([
      api.getSystemInfo(),
      api.getIdentity(),
      api.getHotspots(),
    ]);
    res.json({ ok: true, data: { sysinfo, identity, hotspots } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/system/status  — lightweight: returns adapter mode + router identity
router.get('/status', async (req, res) => {
  try {
    const mode     = api.status();
    const identity = await api.getIdentity();
    res.json({ ok: true, data: { mode, identity } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/system/neighbors  — discover MikroTik devices on the LAN
router.get('/neighbors', async (req, res) => {
  try {
    const neighbors = await api.discoverRouters();
    res.json({ ok: true, data: neighbors });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/system/connect  — (re)connect with new credentials
// Body: { host, port, user, password }
router.post('/connect', async (req, res) => {
  const { host, port, user, password } = req.body;
  if (!host) return res.status(400).json({ ok: false, error: 'host is required' });

  // Patch env vars so the adapter picks them up on reconnect
  if (host)     process.env.MIKROTIK_HOST     = host;
  if (port)     process.env.MIKROTIK_PORT     = String(port);
  if (user)     process.env.MIKROTIK_USER     = user;
  if (password) process.env.MIKROTIK_PASSWORD = password;

  process.env.USE_MOCK = 'false';  // force live attempt

  api.reset();   // drop cached adapter so next call reconnects

  try {
    const [sysinfo, identity] = await Promise.all([
      api.getSystemInfo(),
      api.getIdentity(),
    ]);
    const mode = api.status();
    res.json({ ok: true, data: { mode, sysinfo, identity } });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message, data: { mode: api.status() } });
  }
});

module.exports = router;
