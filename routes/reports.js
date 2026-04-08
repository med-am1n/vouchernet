const router = require('express').Router();
const api    = require('../lib/adapter');

// GET /api/reports/sales?days=7
router.get('/sales', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 90);
  try {
    const data = await api.getSalesReport(days);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
