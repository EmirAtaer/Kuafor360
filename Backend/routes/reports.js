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

// EN ÇOK SATILAN ÜRÜNLER
router.get('/popular-products', (_req, res) => {
  const query = `
    SELECT p.name, COALESCE(SUM(ap.quantity), 0) AS count
    FROM appointment_products ap
    JOIN products p ON ap.product_id = p.id
    GROUP BY p.name
    ORDER BY count DESC;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// HAFTALIK YOĞUN GÜNLER
router.get('/peak-days', (_req, res) => {
  const query = `
    SELECT DAYNAME(a.date) AS weekday, COUNT(a.id) AS bookings
    FROM appointments a
    GROUP BY DAYNAME(a.date)
    ORDER BY bookings DESC;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// HAFTALIK YOĞUNLUK (GÜN & SAAT)
router.get('/peak-times', (_req, res) => {
  const query = `
    SELECT
      DAYNAME(a.date) AS weekday,
      HOUR(STR_TO_DATE(a.start_time, '%H:%i')) AS hour,
      COUNT(a.id) AS bookings
    FROM appointments a
    GROUP BY DAYNAME(a.date), HOUR(STR_TO_DATE(a.start_time, '%H:%i'))
    ORDER BY bookings DESC;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// HİZMET + ÜRÜN GELİR ÖZETİ
router.get('/revenue-summary', (_req, res) => {
  const query = `
    WITH dates AS (
      SELECT DATE(date) AS date FROM appointments GROUP BY DATE(date)
    ),
    service_income AS (
      SELECT DATE(a.date) AS date, SUM(s.price) AS total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      GROUP BY DATE(a.date)
    ),
    product_income AS (
      SELECT DATE(a.date) AS date, SUM(p.price * ap.quantity) AS total
      FROM appointments a
      JOIN appointment_products ap ON ap.appointment_id = a.id
      JOIN products p ON ap.product_id = p.id
      GROUP BY DATE(a.date)
    )
    SELECT
      d.date,
      COALESCE(s.total, 0) AS service_income,
      COALESCE(p.total, 0) AS product_income,
      COALESCE(s.total, 0) + COALESCE(p.total, 0) AS total_income
    FROM dates d
    LEFT JOIN service_income s ON d.date = s.date
    LEFT JOIN product_income p ON d.date = p.date
    ORDER BY d.date;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;
