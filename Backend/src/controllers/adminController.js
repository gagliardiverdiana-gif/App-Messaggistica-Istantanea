const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const getPendingRegistrationRequests = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id,
        email,
        first_name,
        last_name,
        username AS requested_username,
        phone,
        address,
        profile_image AS requested_profile_image,
        status,
        created_at
      FROM users
      WHERE status = 'pending'
      ORDER BY created_at DESC`,
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il recupero delle richieste pending",
    });
  }
};

const approveRegistrationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const [users] = await pool.execute(
      `SELECT id, email, first_name, last_name, status
       FROM users
       WHERE id = ? AND status = 'pending'`,
      [requestId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Richiesta non trovata oppure già gestita",
      });
    }

    const approvedUser = users[0];

    const temporaryPassword = crypto.randomBytes(8).toString("hex") + "A1!";
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await pool.execute(
      `UPDATE users
       SET password_hash = ?,
           status = 'approved',
           must_change_password = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [hashedPassword, requestId],
    );

    await pool.execute(
      `INSERT INTO user_status (user_id, status, last_seen_at)
       VALUES (?, 'offline', NOW())
       ON DUPLICATE KEY UPDATE
         status = 'offline',
         last_seen_at = NOW()`,
      [requestId],
    );

    try {
      await sendEmail({
        to: approvedUser.email,
        subject: "Account approvato - Credenziali di accesso",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <h2>Ciao ${approvedUser.first_name || ""}, il tuo account è stato approvato</h2>
            <p>Puoi accedere alla Chat App con queste credenziali temporanee:</p>
            <p><strong>Email:</strong> ${approvedUser.email}</p>
            <p><strong>Password temporanea:</strong> ${temporaryPassword}</p>
            <p>Al primo accesso ti verrà richiesto di cambiare la password.</p>
            <p>Grazie.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Errore invio email approvazione:", emailError);
    }

    res.status(200).json({
      message: "Richiesta approvata con successo",
      userId: Number(requestId),
      temporaryPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante l'approvazione della richiesta",
    });
  }
};

const rejectRegistrationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const [result] = await pool.execute(
      `UPDATE users
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [requestId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Richiesta pending non trovata.",
      });
    }

    return res.status(200).json({
      message: "Richiesta rifiutata con successo.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Errore server durante il rifiuto della richiesta.",
    });
  }
};

const getAllUsersForAdmin = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        users.id,
        users.email,
        users.first_name,
        users.last_name,
        users.username,
        users.phone,
        users.address,
        users.profile_image,
        users.role,
        users.must_change_password,
        users.status,
        users.created_at,
        COALESCE(user_status.status, 'offline') AS realtime_status,
        user_status.last_seen_at,
        user_status.updated_at
      FROM users
      LEFT JOIN user_status ON users.id = user_status.user_id
      ORDER BY users.created_at DESC`,
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il recupero della lista utenti",
    });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      username,
      phone,
      address,
      profile_image,
      role,
    } = req.body;

    if (!email || !password || !first_name || !last_name || !username) {
      return res.status(400).json({
        message: "Email, password, nome, cognome e username sono obbligatori.",
      });
    }

    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: "Email già registrata.",
      });
    }

    const allowedRole = role === "admin" ? "admin" : "user";
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users
      (email, password_hash, first_name, last_name, username, phone, address, profile_image, role, must_change_password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'approved')`,
      [
        email,
        hashedPassword,
        first_name,
        last_name,
        username,
        phone || null,
        address || null,
        profile_image || null,
        allowedRole,
      ],
    );

    await pool.execute(
      `INSERT INTO user_status (user_id, status, last_seen_at)
       VALUES (?, 'offline', NOW())`,
      [result.insertId],
    );

    res.status(201).json({
      message: "Utente creato con successo.",
      userId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante la creazione dell'utente.",
    });
  }
};

const deleteUserByAdmin = async (req, res) => {
  let connection;

  try {
    const { userId } = req.params;

    if (Number(userId) === req.user.id) {
      return res.status(400).json({
        message: "Non puoi eliminare il tuo stesso account admin.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.execute(
      "SELECT id FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Utente non trovato.",
      });
    }

    await connection.execute(
      "DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?",
      [userId, userId],
    );

    await connection.execute("DELETE FROM user_status WHERE user_id = ?", [
      userId,
    ]);

    await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

    await connection.commit();

    res.status(200).json({
      message: "Utente eliminato con successo.",
    });
  } catch (error) {
    console.error(error);
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      message: "Errore durante l'eliminazione dell'utente.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  getPendingRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  getAllUsersForAdmin,
  createUserByAdmin,
  deleteUserByAdmin,
};