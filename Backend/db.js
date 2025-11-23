const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',       
  database: 'kuafor360',   
  port: 3306
});

module.exports = db;
