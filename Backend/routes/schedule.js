const express = require('express');
const router = express.Router();
const db = require('../db');
const ensureScheduleTables = require('../utils/scheduleTables');
const { validateSlot } = require('../utils/slots');

ensureScheduleTables();

router.get('/day/:date', (req, res) => {
  const { date } = req.params;
  if (!date) return res.status(400).json({ message: 'date parametresi zorunludur.' });

  db.query('SELECT note FROM closed_days WHERE date = ? LIMIT 1', [date], (err, closedRows) => {
    if (err) return res.status(500).json({ error: err });

    db.query('SELECT start_time, end_time FROM blocked_slots WHERE date = ?', [date], (err2, blockedRows) => {
      if (err2) return res.status(500).json({ error: err2 });

      res.json({
        date,
        closed: Boolean(closedRows.length),
        note: closedRows.length ? closedRows[0].note : null,
        blocked_slots: blockedRows,
      });
    });
  });
});

router.get('/closed-days', (_req, res) => {
  db.query('SELECT date, note FROM closed_days ORDER BY date ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

router.post('/closed-days', (req, res) => {
  const { date, note } = req.body;
  if (!date) return res.status(400).json({ message: 'date alanı zorunlu.' });

  const query = `INSERT INTO closed_days (date, note) VALUES (?, ?) ON DUPLICATE KEY UPDATE note = VALUES(note)`;
  db.query(query, [date, note || null], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Gün kapalı olarak işaretlendi.', date, note: note || null });
  });
});

router.delete('/closed-days/:date', (req, res) => {
  const { date } = req.params;
  db.query('DELETE FROM closed_days WHERE date = ?', [date], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: result.affectedRows ? 'Gün yeniden açıldı.' : 'Belirtilen gün bulunamadı.' });
  });
});

router.post('/blocked-slots', (req, res) => {
  const { date, start_time } = req.body;
  if (!date || !start_time) {
    return res.status(400).json({ message: 'date ve start_time alanları zorunludur.' });
  }

  const validation = validateSlot(start_time);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const query = 'INSERT INTO blocked_slots (date, start_time, end_time) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE start_time = VALUES(start_time)';
  db.query(query, [date, start_time, validation.endTime], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Saat dilimi bloke edildi.', date, start_time, end_time: validation.endTime });
  });
});

router.delete('/blocked-slots/:date/:start', (req, res) => {
  const { date, start } = req.params;
  db.query('DELETE FROM blocked_slots WHERE date = ? AND start_time = ?', [date, start], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: result.affectedRows ? 'Saat tekrar açıldı.' : 'Saat dilimi bulunamadı.' });
  });
});

module.exports = router;
