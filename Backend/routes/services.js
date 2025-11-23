const express = require('express');
const router = express.Router();
const db = require('../db');

// TÜM HİZMETLERİ GETİR
router.get('/', (req, res) => {
  const seedServices = [
    ['Saç Kesimi', 0],
    ['Sakal Kesimi', 0],
    ['Saç + Sakal', 0],
  ];

  db.query('SELECT * FROM services', (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length) {
      return res.json(results);
    }

    db.query('INSERT INTO services (name, price) VALUES ?', [seedServices], (insertErr) => {
      if (insertErr) return res.status(500).json({ error: insertErr });
      db.query('SELECT * FROM services', (reloadErr, seededResults) => {
        if (reloadErr) return res.status(500).json({ error: reloadErr });
        res.json(seededResults);
      });
    });
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

module.exports = router;
