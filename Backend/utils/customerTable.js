const db = require('../db');

let initialized = false;

const logInitError = (label, err) => {
  console.error(
    `⚠️  '${label}' tablosu oluşturulamadı. MySQL hizmetinin çalıştığından ve bağlantı bilgilerini Backend/db.js dosyasında güncellediğinden emin olun.`,
    err?.message || err
  );
};

const ensureCustomerTable = () => {
  if (initialized) return;
  initialized = true;

  db.query(
    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    (err) => err && logInitError('customers', err)
  );
};

module.exports = ensureCustomerTable;
