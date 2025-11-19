const mysql = require('mysql2');
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234', // kendi MySQL şifreni yaz buraya
    database: 'kuafor360'
});
module.exports = db;
