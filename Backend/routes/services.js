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

// HAZIR HİZMET PAKETLERİ
router.get('/packages', (_req, res) => {
  const packages = [
    {
      id: 'sac-sakal',
      name: 'Saç + Sakal Paketi',
      description: 'Saç kesimi + şekillendirme ve sakal bakımı',
      duration_minutes: 60,
      price_hint: 'Gösterim amaçlı - admin panelinden fiyatlayın',
      services: ['Saç Kesimi', 'Sakal Bakımı'],
    },
    {
      id: 'bakim',
      name: 'Saç Bakım Paketi',
      description: 'Keratin veya onarıcı bakım, maske ve fön',
      duration_minutes: 60,
      price_hint: 'Gösterim amaçlı - admin panelinden fiyatlayın',
      services: ['Keratin Bakım', 'Saç Maskesi', 'Fön / Şekillendirme'],
    },
    {
      id: 'renk',
      name: 'Boyama + Şekillendirme',
      description: 'Boyama, tonlama ve sonrasında fön',
      duration_minutes: 90,
      price_hint: 'Gösterim amaçlı - admin panelinden fiyatlayın',
      services: ['Boyama', 'Tonlama', 'Fön / Şekillendirme'],
    },
  ];

  res.json({ packages });
});

// YENİ HİZMET EKLE
router.post('/', (req, res) => {
  const { name, price } = req.body;
  db.query('INSERT INTO services (name, price) VALUES (?, ?)', [name, price], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Hizmet eklendi', id: result.insertId });
  });
});

// HİZMET GÜNCELLE
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;

  db.query(
    'UPDATE services SET name = COALESCE(?, name), price = COALESCE(?, price) WHERE id = ?',
    [name, price, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Hizmet güncellendi', affectedRows: result.affectedRows });
    }
  );
});

// HİZMET SİL
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM services WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Hizmet silindi', affectedRows: result.affectedRows });
  });
});

module.exports = router;
