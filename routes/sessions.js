const router = require('express').Router();
const api    = require('../lib/adapter');

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await api.getActiveSessions();
    res.json({ ok: true, data: sessions });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/sessions/:id  — kick a user
router.delete('/:id', async (req, res) => {
  try {
    await api.kickSession(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
