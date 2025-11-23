const db = require('../db');

let initialized = false;

const logInitError = (label, err) => {
  console.error(
    `⚠️  '${label}' tablosu oluşturulamadı. Lütfen MySQL servisinizin aktif olduğundan ve Backend/db.js içindeki bilgilerin doğru olduğundan emin olun.`,
    err?.message || err
  );
};

const ensureScheduleTables = () => {
  if (initialized) return;
  initialized = true;

  db.query(
    `CREATE TABLE IF NOT EXISTS closed_days (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      note VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    (err) => err && logInitError('closed_days', err)
  );

  db.query(
    `CREATE TABLE IF NOT EXISTS blocked_slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      start_time VARCHAR(5) NOT NULL,
      end_time VARCHAR(5) NOT NULL,
      UNIQUE KEY uniq_slot (date, start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    (err) => err && logInitError('blocked_slots', err)
  );
};

module.exports = ensureScheduleTables;
