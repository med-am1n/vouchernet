const router = require('express').Router();
const api    = require('../lib/adapter');

// GET /api/plans
router.get('/', async (req, res) => {
  try {
    const plans = await api.getPlans();
    res.json({ ok: true, data: plans });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/plans
// Body: { name, rate-limit, session-timeout, shared-users, price }
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'name is required' });

  try {
    const plan = await api.createPlan(req.body);
    res.json({ ok: true, data: plan });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/plans/:id
router.delete('/:id', async (req, res) => {
  try {
    await api.deletePlan(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
