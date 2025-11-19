const express = require('express');
const router = express.Router();
const db = require('../db');

const OPENING_MINUTES = 10 * 60; // 10:00
const CLOSING_MINUTES = 22 * 60; // 22:00
const SLOT_DURATION = 60; // dakika

const timeToMinutes = (timeString = '') => {
  const [hours, minutes] = timeString.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minutePart = String(minutes % 60).padStart(2, '0');
  return `${hours}:${minutePart}`;
};

const validateSlot = (startTime) => {
  const start = timeToMinutes(startTime);
  const end = start + SLOT_DURATION;

  if (Number.isNaN(start)) {
    return { valid: false, message: 'Saat formatı HH:MM olmalı (örn: 10:00).' };
  }

  if (end - start !== SLOT_DURATION) {
    return { valid: false, message: 'Her randevu 60 dakikalık olmalı.' };
  }

  if (start < OPENING_MINUTES || end > CLOSING_MINUTES) {
    return { valid: false, message: 'Çalışma saatleri 10:00 - 22:00 arasında.' };
  }

  if ((start - OPENING_MINUTES) % SLOT_DURATION !== 0) {
    return { valid: false, message: 'Randevular saat başı olacak şekilde ayarlanmalı (10:00, 11:00...).' };
  }

  return { valid: true, endTime: minutesToTime(end) };
};

const hasConflict = (existingAppointments, startTime, endTime) => {
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  return existingAppointments.some(({ start_time: existingStart, end_time: existingEnd }) => {
    const currentStart = timeToMinutes(String(existingStart));
    const currentEnd = timeToMinutes(String(existingEnd));

    return currentStart < requestedEnd && currentEnd > requestedStart;
  });
};

const buildDailySlots = (appointments = []) => {
  const slots = [];

  for (let start = OPENING_MINUTES; start < CLOSING_MINUTES; start += SLOT_DURATION) {
    const end = start + SLOT_DURATION;
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);

    if (!hasConflict(appointments, startTime, endTime)) {
      slots.push({ start_time: startTime, end_time: endTime });
    }
  }

  return slots;
};

// RANDEVU OLUŞTURMA
router.post('/', (req, res) => {
  const { customer_id, service_id, date, start_time } = req.body;

  if (!customer_id || !service_id || !date || !start_time) {
    return res.status(400).json({ message: 'customer_id, service_id, date ve start_time alanları zorunlu.' });
  }

  const validation = validateSlot(start_time);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const end_time = validation.endTime;

  const checkQuery = `
    SELECT start_time, end_time FROM appointments
    WHERE date = ?
  `;

  db.query(checkQuery, [date], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (hasConflict(results, start_time, end_time)) {
      return res.status(400).json({ message: 'Bu saat dolu, başka bir zaman seçiniz.' });
    }

    const insertQuery = `
      INSERT INTO appointments (customer_id, service_id, date, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;

    db.query(insertQuery, [customer_id, service_id, date, start_time, end_time], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.json({ message: 'Randevu başarıyla eklendi!', id: result.insertId, start_time, end_time });
    });
  });
});

// TÜM RANDEVULARI LİSTELE
router.get('/', (req, res) => {
  db.query('SELECT * FROM appointments', (err, results) => {
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

  const query = 'SELECT start_time, end_time FROM appointments WHERE date = ?';

  db.query(query, [date], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    const availableSlots = buildDailySlots(results);
    res.json({ date, available_slots: availableSlots });
  });
});

module.exports = router;
