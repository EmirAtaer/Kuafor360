const db = require('../db');

let initialized = false;

const ensureScheduleTables = () => {
  if (initialized) return;
  initialized = true;

  db.query(
    `CREATE TABLE IF NOT EXISTS closed_days (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      note VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  db.query(
    `CREATE TABLE IF NOT EXISTS blocked_slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      start_time VARCHAR(5) NOT NULL,
      end_time VARCHAR(5) NOT NULL,
      UNIQUE KEY uniq_slot (date, start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
};

module.exports = ensureScheduleTables;
