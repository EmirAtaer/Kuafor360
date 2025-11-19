const express = require('express');
const router = express.Router();
const db = require('../db');

// TÜM ÜRÜNLERİ GETİR
router.get('/', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// YENİ ÜRÜN EKLE
router.post('/', (req, res) => {
  const { name, price } = req.body;
  db.query('INSERT INTO products (name, price) VALUES (?, ?)', [name, price], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Ürün eklendi', id: result.insertId });
  });
});

module.exports = router;
