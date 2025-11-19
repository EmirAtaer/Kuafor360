const express = require('express');
const router = express.Router();
const db = require('../db');

// GELİR RAPORU
router.get('/income', (req, res) => {
  const query = `
    SELECT 
      DATE(a.date) AS date,
      SUM(s.price) AS total_income
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    GROUP BY DATE(a.date)
    ORDER BY a.date;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// EN ÇOK TERCİH EDİLEN HİZMETLER
router.get('/popular-services', (req, res) => {
  const query = `
    SELECT s.name, COUNT(a.id) AS count
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    GROUP BY s.name
    ORDER BY count DESC;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;
