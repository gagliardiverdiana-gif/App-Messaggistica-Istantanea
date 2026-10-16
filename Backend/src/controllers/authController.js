const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const user = rows[0];

    if (user.status !== "approved") {
      if (user.status === "pending") {
        return res.status(403).json({
          message: "Il tuo account è in attesa di approvazione da parte dell'admin",
        });
      }

      if (user.status === "rejected") {
        return res.status(403).json({
          message: "La tua richiesta di registrazione è stata rifiutata",
        });
      }

      return res.status(403).json({
        message: "Account non autorizzato all'accesso",
      });
    }

    if (!user.password_hash) {
      return res.status(403).json({
        message: "Password non ancora impostata. Contatta l'amministratore",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    await pool.execute(
      `INSERT INTO user_status (user_id, status, last_seen_at)
       VALUES (?, 'online', NOW())
       ON DUPLICATE KEY UPDATE
         status = 'online',
         last_seen_at = NOW()`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login effettuato con successo",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        must_change_password: Boolean(user.must_change_password),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il login",
    });
  }
};

const logout = async (req, res) => {
  try {
    await pool.execute(
      `INSERT INTO user_status (user_id, status, last_seen_at)
       VALUES (?, 'offline', NOW())
       ON DUPLICATE KEY UPDATE
         status = 'offline',
         last_seen_at = NOW()`,
      [req.user.id]
    );

    res.json({ message: "Logout effettuato con successo" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il logout",
    });
  }
};

const updateMyStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["online", "away", "offline"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Status non valido" });
  }

  try {
    await pool.execute(
      `INSERT INTO user_status (user_id, status, last_seen_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         last_seen_at = NOW()`,
      [req.user.id, status]
    );

    res.json({ message: "Status aggiornato con successo" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante l'aggiornamento dello status",
    });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Password attuale e nuova password sono obbligatorie",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      message: "La nuova password deve contenere almeno 6 caratteri",
    });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        message: "La password attuale non è corretta",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.execute(
      `UPDATE users
       SET password_hash = ?,
           must_change_password = 0
       WHERE id = ?`,
      [hashedPassword, req.user.id]
    );

    res.status(200).json({
      message: "Password aggiornata con successo",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il cambio password",
    });
  }
};

module.exports = {
  login,
  logout,
  updateMyStatus,
  changePassword,
};