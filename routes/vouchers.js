const router = require('express').Router();
const api    = require('../lib/adapter');

// GET /api/vouchers
router.get('/', async (req, res) => {
  try {
    const vouchers = await api.getVouchers();
    res.json({ ok: true, data: vouchers });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/vouchers/generate
// Body: { profile, count, prefix, comment }
router.post('/generate', async (req, res) => {
  const { profile, count = 1, prefix = 'HSP', comment = '' } = req.body;

  if (!profile)         return res.status(400).json({ ok: false, error: 'profile is required' });
  if (count < 1 || count > 100) return res.status(400).json({ ok: false, error: 'count must be 1–100' });

  try {
    const batch = await api.createVouchers({ profile, count: parseInt(count), prefix, comment });
    res.json({ ok: true, data: batch });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/vouchers/:id
router.delete('/:id', async (req, res) => {
  try {
    await api.deleteVoucher(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
