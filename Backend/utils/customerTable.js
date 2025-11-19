const db = require('../db');

let initialized = false;

const ensureCustomerTable = () => {
  if (initialized) return;
  initialized = true;

  db.query(
    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
};

module.exports = ensureCustomerTable;
