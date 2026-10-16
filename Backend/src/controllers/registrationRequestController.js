const pool = require("../config/db");

const createRegistrationRequest = async (req, res) => {
  try {
    const {
      email,
      first_name,
      last_name,
      requested_username,
      phone,
      address,
      requested_profile_image,
    } = req.body;

    if (!email || !first_name || !last_name || !requested_username) {
      return res.status(400).json({
        message: "Email, nome, cognome e username richiesto sono obbligatori",
      });
    }

    const [existingUsers] = await pool.execute(
      "SELECT id, status FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: "Esiste già un account o una richiesta associata a questa email",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO users
      (email, password_hash, first_name, last_name, username, phone, address, profile_image, role, must_change_password, status)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'user', 0, 'pending')`,
      [
        email,
        first_name,
        last_name,
        requested_username,
        phone || null,
        address || null,
        requested_profile_image || null,
      ]
    );

    res.status(201).json({
      message: "Richiesta di registrazione inviata con successo",
      userId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante la creazione della richiesta di registrazione",
    });
  }
};

module.exports = {
  createRegistrationRequest,
};