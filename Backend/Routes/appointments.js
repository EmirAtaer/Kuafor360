const express = require('express');
const router = express.Router();
const db = require('../db');

// RANDEVU OLUŞTURMA
router.post('/', (req, res) => {
  const { customer_id, service_id, date, start_time, end_time } = req.body;

  // ÇAKIŞMA KONTROLÜ
  const checkQuery = `
    SELECT * FROM appointments 
    WHERE date = ? 
    AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
  `;

  db.query(checkQuery, [date, start_time, start_time, end_time, end_time], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length > 0) {
      return res.status(400).json({ message: 'Bu saat dolu kardeşim, başka zaman seç 😎' });
    }

    // MÜSAİTSE KAYDET
    const insertQuery = `
      INSERT INTO appointments (customer_id, service_id, date, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    db.query(insertQuery, [customer_id, service_id, date, start_time, end_time], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.json({ message: 'Randevu başarıyla eklendi!', id: result.insertId });
    });
  });
});

// TÜM RANDEVULARI LİSTELE
router.get('/', (req, res) => {
  db.query('SELECT * FROM appointments', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;
