const express = require('express');
const router = express.Router();
const db = require('../db');

// TÜM HİZMETLERİ GETİR
router.get('/', (req, res) => {
  db.query('SELECT * FROM services', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// YENİ HİZMET EKLE
router.post('/', (req, res) => {
  const { name, price } = req.body;
  db.query('INSERT INTO services (name, price) VALUES (?, ?)', [name, price], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Hizmet eklendi', id: result.insertId });
  });
});

module.exports = router;
