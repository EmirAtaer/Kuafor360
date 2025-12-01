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

// ÖNE ÇIKAN EKSTRA ÜRÜN GRUPLARI
router.get('/featured', (_req, res) => {
  const extras = [
    {
      category: 'Şekillendirme',
      items: ['Wax / Jöle', 'Pudra', 'Saç Spreyi'],
      note: 'Randevu oluştururken adede göre ekleyebilirsiniz.',
    },
    {
      category: 'Bakım',
      items: ['Saç Kremi', 'Saç Maskesi / Serum', 'Keratin Destek'],
      note: 'Bakım paketleriyle kombinleyebilirsiniz.',
    },
    {
      category: 'Ekipman',
      items: ['Fön Makinesi', 'Fırça Seti'],
      note: 'Stok takibi yapılmaz, sadece satış kaydı tutulur.',
    },
  ];

  res.json({ extras });
});

// YENİ ÜRÜN EKLE
router.post('/', (req, res) => {
  const { name, price } = req.body;
  db.query('INSERT INTO products (name, price) VALUES (?, ?)', [name, price], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Ürün eklendi', id: result.insertId });
  });
});

// ÜRÜN GÜNCELLE
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;

  db.query(
    'UPDATE products SET name = COALESCE(?, name), price = COALESCE(?, price) WHERE id = ?',
    [name, price, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Ürün güncellendi', affectedRows: result.affectedRows });
    }
  );
});

// ÜRÜN SİL
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Ürün silindi', affectedRows: result.affectedRows });
  });
});

module.exports = router;
