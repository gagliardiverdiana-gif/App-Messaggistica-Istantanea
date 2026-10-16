const pool = require("../config/db");

const getApprovedUsers = async (req, res) => {
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
      WHERE users.status = 'approved'
      ORDER BY users.created_at DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il recupero degli utenti",
    });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        email,
        first_name,
        last_name,
        username,
        phone,
        address,
        profile_image,
        role,
        must_change_password,
        status,
        created_at,
        updated_at
      FROM users
      WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante il recupero del profilo",
    });
  }
};

const updateMyProfile = async (req, res) => {
  const {
    first_name,
    last_name,
    username,
    phone,
    address,
    profile_image,
  } = req.body;

  try {
    await pool.execute(
      `UPDATE users
       SET first_name = ?,
           last_name = ?,
           username = ?,
           phone = ?,
           address = ?,
           profile_image = ?
       WHERE id = ?`,
      [
        first_name,
        last_name,
        username,
        phone || null,
        address || null,
        profile_image || null,
        req.user.id,
      ]
    );

    res.status(200).json({ message: "Profilo aggiornato con successo" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante l'aggiornamento del profilo",
    });
  }
};

module.exports = {
  getApprovedUsers,
  getMyProfile,
  updateMyProfile,
};