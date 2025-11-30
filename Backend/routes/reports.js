const express = require('express');
const router = express.Router();
const db = require('../db');

const PERIOD_CONDITIONS = {
  daily: 'DATE(a.date) = CURDATE()',
  weekly: "YEARWEEK(a.date, 1) = YEARWEEK(CURDATE(), 1)",
  monthly: 'YEAR(a.date) = YEAR(CURDATE()) AND MONTH(a.date) = MONTH(CURDATE())',
};

const WEEKDAY_TR_MAP = {
  Sunday: 'Pazar',
  Monday: 'Pazartesi',
  Tuesday: 'Salı',
  Wednesday: 'Çarşamba',
  Thursday: 'Perşembe',
  Friday: 'Cuma',
  Saturday: 'Cumartesi',
};

const getDateCondition = (period) => PERIOD_CONDITIONS[period] || '';

const translateWeekday = (weekday) => WEEKDAY_TR_MAP[weekday] || weekday;

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
  const condition = getDateCondition(req.query.period);
  const where = condition ? `WHERE ${condition}` : '';
  const query = `
    SELECT s.name, COUNT(a.id) AS count
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    ${where}
    GROUP BY s.name
    ORDER BY count DESC;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// EN ÇOK SATILAN ÜRÜNLER
router.get('/popular-products', (req, res) => {
  const condition = getDateCondition(req.query.period);
  const where = condition ? `WHERE ${condition}` : '';
  const query = `
    SELECT p.name, COALESCE(SUM(ap.quantity), 0) AS count
    FROM appointment_products ap
    JOIN appointments a ON ap.appointment_id = a.id
    JOIN products p ON ap.product_id = p.id
    ${where}
    GROUP BY p.name
    ORDER BY count DESC;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// HAFTALIK YOĞUN GÜNLER
router.get('/peak-days', (req, res) => {
  const condition = getDateCondition(req.query.period);
  const where = condition ? `WHERE ${condition}` : '';
  const query = `
    SELECT DAYNAME(a.date) AS weekday, COUNT(a.id) AS bookings
    FROM appointments a
    ${where}
    GROUP BY DAYNAME(a.date)
    ORDER BY bookings DESC;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    const localized = (results || []).map((row) => ({ ...row, weekday: translateWeekday(row.weekday) }));
    res.json(localized);
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

// GÜNLÜK / HAFTALIK / AYLIK GELİR ÖZETİ
router.get('/revenue-periods', (_req, res) => {
  const periods = [
    { label: 'Günlük', condition: 'DATE(a.date) = CURDATE()' },
    { label: 'Haftalık', condition: "YEARWEEK(a.date, 1) = YEARWEEK(CURDATE(), 1)" },
    { label: 'Aylık', condition: 'YEAR(a.date) = YEAR(CURDATE()) AND MONTH(a.date) = MONTH(CURDATE())' },
  ];

  const buildIncomePromise = ({ label, condition }) => {
    const serviceQuery = `
      SELECT COALESCE(SUM(s.price), 0) AS total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE ${condition};
    `;

    const productQuery = `
      SELECT COALESCE(SUM(p.price * ap.quantity), 0) AS total
      FROM appointment_products ap
      JOIN appointments a ON ap.appointment_id = a.id
      JOIN products p ON ap.product_id = p.id
      WHERE ${condition};
    `;

    const servicePromise = new Promise((resolve, reject) => {
      db.query(serviceQuery, (err, rows) => {
        if (err) return reject(err);
        resolve(rows?.[0]?.total || 0);
      });
    });

    const productPromise = new Promise((resolve, reject) => {
      db.query(productQuery, (err, rows) => {
        if (err) return reject(err);
        resolve(rows?.[0]?.total || 0);
      });
    });

    return Promise.all([servicePromise, productPromise]).then(([service, product]) => ({
      period: label,
      service_income: Number(service) || 0,
      product_income: Number(product) || 0,
      total_income: (Number(service) || 0) + (Number(product) || 0),
    }));
  };

  Promise.all(periods.map(buildIncomePromise))
    .then((rows) => res.json(rows))
    .catch((err) => res.status(500).json({ error: err }));
});

module.exports = router;
