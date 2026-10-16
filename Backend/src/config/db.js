// Configurazione della connessione al database MySQL 

const mysql = require('mysql2/promise');// async/await.

const pool = mysql.createPool({ //cosi evitiamo di aprire ogni volta nuove connessioni.
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,//dati necessari per colleg.al db.
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, // Attende se non ci sono connessioni disponibili
  connectionLimit: 10, // Limite massimo di connessioni simultanee al database
  queueLimit: 0 // Nessun limite alla coda di connessioni in attesa 
});

module.exports = pool;