-- Messaggistica Istantanea: struttura del database
-- Uso: mysql -u TUO_UTENTE -p < database.sql
-- Il nome del database deve coincidere con DB_NAME nel file .env

CREATE DATABASE IF NOT EXISTS messaggistica_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE messaggistica_db;

-- Utenti e richieste di registrazione
-- status: 'pending' (in attesa), 'approved' (approvato), 'rejected' (rifiutato)
-- role:   'user' oppure 'admin'
CREATE TABLE IF NOT EXISTS users (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NULL,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  username              VARCHAR(100) NOT NULL,
  phone                 VARCHAR(30)  NULL,
  address               VARCHAR(255) NULL,
  profile_image         LONGTEXT     NULL,
  role                  VARCHAR(20)  NOT NULL DEFAULT 'user',
  must_change_password  TINYINT(1)   NOT NULL DEFAULT 0,
  status                VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP
);

-- Stato online/offline degli utenti
CREATE TABLE IF NOT EXISTS user_status (
  user_id       INT PRIMARY KEY,
  status        VARCHAR(20) NOT NULL DEFAULT 'offline',
  last_seen_at  DATETIME    NULL,
  CONSTRAINT fk_user_status_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messaggi privati tra due utenti
CREATE TABLE IF NOT EXISTS messages (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id     INT       NOT NULL,
  receiver_id   INT       NOT NULL,
  message_text  TEXT      NOT NULL,
  is_read       TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversazione (sender_id, receiver_id, created_at),
  INDEX idx_non_letti (receiver_id, is_read),
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
