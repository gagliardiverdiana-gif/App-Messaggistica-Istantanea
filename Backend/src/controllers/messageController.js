const pool = require("../config/db");

const sendMessage = async (req, res) => {
  const { receiver_id, message_text } = req.body;
  const sender_id = req.user.id;

  try {
    if (!receiver_id || !message_text) {
      return res.status(400).json({
        message: "receiver_id e message_text sono obbligatori",
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO messages (sender_id, receiver_id, message_text, is_read) VALUES (?, ?, ?, ?)",
      [sender_id, receiver_id, message_text, 0],
    );

    res.status(201).json({
      message: "Messaggio inviato con successo",
      messageId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore durante l'invio del messaggio",
    });
  }
};

const getMessages = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = Number(req.params.receiverId);

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM (
        SELECT * FROM messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC
        LIMIT 30
      ) AS last_messages
      ORDER BY created_at ASC`,
      [senderId, receiverId, receiverId, senderId],
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore nel recupero messaggi",
    });
  }
};

const getUnreadCounts = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.execute(
      `SELECT sender_id, COUNT(*) AS unread_count
       FROM messages
       WHERE receiver_id = ? AND is_read = 0
       GROUP BY sender_id`,
      [userId],
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore nel recupero conteggi non letti",
    });
  }
};

const getLastMessage = async (req, res) => {
  const loggedUserId = req.user.id;
  const otherUserId = Number(req.params.userId);

  try {
    const [rows] = await pool.execute(
      `SELECT message_text
       FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [loggedUserId, otherUserId, otherUserId, loggedUserId],
    );

    if (rows.length === 0) {
      return res.json({ message_text: "" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore nel recupero ultimo messaggio",
    });
  }
};

const markMessagesAsRead = async (req, res) => {
  const receiverId = req.user.id;
  const senderId = Number(req.params.senderId);

  try {
    await pool.execute(
      `UPDATE messages
       SET is_read = 1
       WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
      [senderId, receiverId],
    );

    res.json({
      message: "Messaggi segnati come letti",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Errore aggiornamento lettura messaggi",
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUnreadCounts,
  getLastMessage,
  markMessagesAsRead,
};