const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234', // kendi MySQL şifreni yaz
  database: process.env.DB_NAME || 'kuafor360',
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL bağlantısı kurulamadı. "npm run start" komutunun çalışması için yerel veritabanını başlatmalısın.', err.message);
    console.error('Hızlı çözüm: `mysql -u root -p` ile giriş yapıp `CREATE DATABASE kuafor360;` komutunu çalıştır ve Backend/db.js içindeki bilgilerle eşleştir.');
    return;
  }

  console.log('MySQL havuzu hazır.');
  connection.release();
});

module.exports = db;
