const express = require('express');
const router = express.Router();
const db = require('../db');
const ensureCustomerTable = require('../utils/customerTable');

ensureCustomerTable();

router.post('/login', (req, res) => {
  const { full_name, phone } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ message: 'Ad soyad ve telefon zorunludur.' });
  }

  const sanitizedPhone = String(phone).replace(/\s+/g, '');

  const query = `
    INSERT INTO customers (full_name, phone)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
  `;

  db.query(query, [full_name, sanitizedPhone], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.insertId) {
      return res.json({ id: result.insertId, full_name, phone: sanitizedPhone });
    }

    db.query('SELECT id, full_name, phone FROM customers WHERE phone = ?', [sanitizedPhone], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2 });
      if (!rows.length) return res.status(404).json({ message: 'Müşteri bulunamadı.' });
      res.json(rows[0]);
    });
  });
});

module.exports = router;
