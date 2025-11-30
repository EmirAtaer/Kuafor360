const express = require('express');
const router = express.Router();
const db = require('../db');
const ensureScheduleTables = require('../utils/scheduleTables');
const ensureCustomerTable = require('../utils/customerTable');
const { validateSlot, hasConflict, buildDailySlots } = require('../utils/slots');

ensureScheduleTables();
ensureCustomerTable();

// RANDEVU OLUŞTURMA
router.post('/', (req, res) => {
  const { customer_id, service_id, date, start_time, products = [], notes } = req.body;

  const parsedCustomerId = Number(customer_id);
  const parsedServiceId = Number(service_id);

  if (!parsedCustomerId || !parsedServiceId || !date || !start_time) {
    return res.status(400).json({ message: 'customer_id, service_id, date ve start_time alanları zorunlu.' });
  }

  const validation = validateSlot(start_time);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const end_time = validation.endTime;

  db.query('SELECT date FROM closed_days WHERE date = ? LIMIT 1', [date], (closedErr, closedRows) => {
    if (closedErr) return res.status(500).json({ error: closedErr });
    if (closedRows.length) {
      return res.status(400).json({ message: 'Bu gün kapalı olarak işaretlenmiş.' });
    }

    db.query('SELECT start_time, end_time FROM blocked_slots WHERE date = ?', [date], (blockErr, blockedRows) => {
      if (blockErr) return res.status(500).json({ error: blockErr });

      const checkQuery = `
        SELECT start_time, end_time FROM appointments
        WHERE date = ?
      `;

      db.query(checkQuery, [date], (err, results) => {
        if (err) return res.status(500).json({ error: err });

        if (hasConflict([...results, ...blockedRows], start_time, end_time)) {
          return res.status(400).json({ message: 'Bu saat dolu veya bloke edilmiş, başka bir zaman seçiniz.' });
        }

        const insertQuery = `
          INSERT INTO appointments (customer_id, service_id, date, start_time, end_time, status, notes)
          VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `;

        db.query(
          insertQuery,
          [parsedCustomerId, parsedServiceId, date, start_time, end_time, notes || null],
          (err2, result) => {
            if (err2) return res.status(500).json({ error: err2 });

            const appointmentId = result.insertId;
            const sanitizedProducts = Array.isArray(products)
              ? products
                  .filter((p) => p && p.product_id)
                  .map((p) => ({
                    product_id: Number(p.product_id),
                    quantity: Number(p.quantity) > 0 ? Number(p.quantity) : 1,
                  }))
              : [];

            if (!sanitizedProducts.length) {
              return res.json({
                message: 'Randevu başarıyla eklendi!',
                id: appointmentId,
                start_time,
                end_time,
              });
            }

            const productValues = sanitizedProducts.map((p) => [appointmentId, p.product_id, p.quantity]);
            const productQuery = 'INSERT INTO appointment_products (appointment_id, product_id, quantity) VALUES ?';

            db.query(productQuery, [productValues], (err3) => {
              if (err3) return res.status(500).json({ error: err3 });
              res.json({
                message: 'Randevu ve ekstra ürünler eklendi!',
                id: appointmentId,
                start_time,
                end_time,
                products: sanitizedProducts,
              });
            });
          }
        );
      });
    });
  });
});

// TÜM RANDEVULARI LİSTELE (admin panel için)
router.get('/', (req, res) => {
  const query = `
    SELECT a.*, s.name AS service_name, c.full_name AS customer_name, c.phone AS customer_phone
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    LEFT JOIN customers c ON a.customer_id = c.id
    ORDER BY a.date ASC, a.start_time ASC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// SON 20 RANDEVU (bildirim ve özet için)
router.get('/recent', (_req, res) => {
  const query = `
    SELECT a.*, s.name AS service_name, c.full_name AS customer_name, c.phone AS customer_phone
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    LEFT JOIN customers c ON a.customer_id = c.id
    ORDER BY a.date DESC, a.start_time DESC
    LIMIT 20
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// BELİRLİ BİR GÜNÜN RANDEVULARI
router.get('/day/:date', (req, res) => {
  const { date } = req.params;
  const query = `
    SELECT a.*, s.name AS service_name, c.full_name AS customer_name, c.phone AS customer_phone
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    LEFT JOIN customers c ON a.customer_id = c.id
    WHERE a.date = ?
    ORDER BY a.start_time ASC
  `;

  db.query(query, [date], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// MÜSAİT SAATLERİ GETİR
router.get('/available', (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: 'date parametresi zorunludur (YYYY-MM-DD).' });
  }

  db.query('SELECT date, note FROM closed_days WHERE date = ? LIMIT 1', [date], (closedErr, closedRows) => {
    if (closedErr) return res.status(500).json({ error: closedErr });

    db.query('SELECT start_time, end_time FROM blocked_slots WHERE date = ?', [date], (blockErr, blockedRows) => {
      if (blockErr) return res.status(500).json({ error: blockErr });

      const query = 'SELECT start_time, end_time FROM appointments WHERE date = ?';

      db.query(query, [date], (err, results) => {
        if (err) return res.status(500).json({ error: err });

        if (closedRows.length) {
          return res.json({
            date,
            closed: true,
            note: closedRows[0].note || null,
            available_slots: [],
            blocked_slots: blockedRows,
          });
        }

        const availableSlots = buildDailySlots([...(results || []), ...(blockedRows || [])]);
        res.json({ date, closed: false, available_slots: availableSlots, blocked_slots: blockedRows });
      });
    });
  });
});

// RANDEVU DETAYI (müşteri ve admin için)
router.get('/detail/:id', (req, res) => {
  const { id } = req.params;

  const appointmentQuery = `
    SELECT a.*, s.name AS service_name, s.price AS service_price, c.full_name AS customer_name, c.phone AS customer_phone
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    LEFT JOIN customers c ON a.customer_id = c.id
    WHERE a.id = ?
  `;

  const productsQuery = `
    SELECT p.name, p.price, ap.quantity
    FROM appointment_products ap
    JOIN products p ON ap.product_id = p.id
    WHERE ap.appointment_id = ?
  `;

  db.query(appointmentQuery, [id], (err, appointmentResults) => {
    if (err) return res.status(500).json({ error: err });
    if (!appointmentResults.length) {
      return res.status(404).json({ message: 'Randevu bulunamadı.' });
    }

    db.query(productsQuery, [id], (err2, productResults) => {
      if (err2) return res.status(500).json({ error: err2 });
      const appointment = appointmentResults[0];
      const productTotal = productResults.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
      const total = Number(appointment.service_price) + productTotal;

      res.json({
        ...appointment,
        products: productResults,
        total_price: total,
      });
    });
  });
});

// RANDEVU İPTAL ET (admin için)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Randevu ID zorunludur.' });
  }

  db.query('DELETE FROM appointment_products WHERE appointment_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });

    db.query('DELETE FROM appointments WHERE id = ?', [id], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2 });
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Randevu bulunamadı.' });
      }

      res.json({ message: 'Randevu iptal edildi.', removed: result.affectedRows });
    });
  });
});

module.exports = router;
