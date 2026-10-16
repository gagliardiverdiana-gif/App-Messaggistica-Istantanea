require("dotenv").config(); //carico le variabili d'ambiente da .env cosi il server sa su che porta lavorare, colleg.db, e key per i token
//file da cui parte il server vero  e proprio, definisco le rotte,connessione al db, socket.io 
const express = require("express");
const cors = require("cors"); //cross origin resource sharing, due porte diverse...
const http = require("http");
const { Server } = require("socket.io");

const pool = require("./config/db");
const registrationRequestRoutes = require("./routes/registrationRequestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");//importo le route separate.
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = http.createServer(app);//non solo app.listen uso questa funzione perche socket.io ha bisogno del server http per gestire il realtime.

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PATCH"],
  },
});

const socketToUser = new Map();
const userToSockets = new Map();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/registration-requests", registrationRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API Applicazione_web attiva" });
});


function getPrivateRoomId(userId1, userId2) { //crea un id unico per la chat privata tra due utenti.
  return [Number(userId1), Number(userId2)]
    .sort((a, b) => a - b)
    .join("_");
}

async function saveUserStatus(userId, status) {//aggiorna lo stato utente in user_status o lo crea.
  await pool.execute(
    `INSERT INTO user_status (user_id, status, last_seen_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       last_seen_at = NOW()`,
    [userId, status]
  );
}

function broadcastUserStatus(userId, status) {//invia via socket.io agg.realtime a tutti i client.
  io.emit("user_status_updated", {
    userId: Number(userId),
    status,
  });
}

io.on("connection", (socket) => {//punto dove viene gestita la connessione di un client.
  console.log("Nuovo client connesso:", socket.id);

  socket.on("register_user", async ({ userId }) => { //associa utente, online.
    try {
      const normalizedUserId = Number(userId);
      if (!normalizedUserId) return;

      socket.userId = normalizedUserId;
      socketToUser.set(socket.id, normalizedUserId);

      const userSockets = userToSockets.get(normalizedUserId) || new Set();
      userSockets.add(socket.id);
      userToSockets.set(normalizedUserId, userSockets);

      socket.join(`user_${normalizedUserId}`);

      await saveUserStatus(normalizedUserId, "online");
      broadcastUserStatus(normalizedUserId, "online");

      console.log(
        `Utente ${normalizedUserId} registrato sul socket ${socket.id}. Socket attivi: ${userSockets.size}`
      );
    } catch (error) {
      console.error(error);
      console.error("Errore register_user:", error);
    }
  });

  socket.on("user_status_changed", async ({ userId, status }) => {// aggiornamento realtime stato.
    try {
      const normalizedUserId = Number(userId);
      if (!normalizedUserId) return;

      await saveUserStatus(normalizedUserId, status);
      broadcastUserStatus(normalizedUserId, status);

      console.log(`Status aggiornato realtime: utente ${normalizedUserId} -> ${status}`);
    } catch (error) {
      console.error(error);
      console.error("Errore aggiornamento realtime status:", error);
    }
  });

  socket.on("join_private_chat", ({ userId1, userId2 }) => {//socket in stanza privata
    const roomId = getPrivateRoomId(userId1, userId2);

    socket.join(roomId);

    console.log(`Socket ${socket.id} entrato nella room ${roomId}`);
    console.log("Rooms attuali del socket:", Array.from(socket.rooms));
  });

  socket.on("send_private_message", (data) => {// gestione messaggi e videochiamata.
    const { senderId, receiverId, message_text, id } = data;

    console.log("Evento send_private_message ricevuto:", data);
    console.log(`Invio evento receive_private_message a user_${receiverId}`);

    io.to(`user_${receiverId}`).emit("receive_private_message", {
      id,
      senderId,
      receiverId,
      message_text,
    });
  });

  socket.on("call_user", (data) => {
    const { callerId, receiverId, callerName } = data;
    const roomId = getPrivateRoomId(callerId, receiverId);

    console.log("Evento call_user ricevuto:", data);

    socket.join(roomId);

    io.to(`user_${receiverId}`).emit("incoming_call", {
      callerId,
      callerName,
      roomId,
    });
  });

  socket.on("accept_call", (data) => {
    const { callerId, receiverId } = data;
    const roomId = getPrivateRoomId(callerId, receiverId);

    console.log("Evento accept_call ricevuto:", data);

    socket.join(roomId);

    io.to(roomId).emit("call_accepted", {
      callerId,
      receiverId,
    });
  });

  socket.on("reject_call", (data) => {
    const { callerId, receiverId } = data;
    const roomId = getPrivateRoomId(callerId, receiverId);

    console.log("Evento reject_call ricevuto:", data);

    io.to(roomId).emit("call_rejected", {
      callerId,
      receiverId,
    });
  });

  socket.on("webrtc_offer", (data) => {
    const { senderId, receiverId, offer } = data;
    const roomId = getPrivateRoomId(senderId, receiverId);

    console.log("Evento webrtc_offer ricevuto");

    socket.to(roomId).emit("webrtc_offer", {
      senderId,
      receiverId,
      offer,
    });
  });

  socket.on("webrtc_answer", (data) => {
    const { senderId, receiverId, answer } = data;
    const roomId = getPrivateRoomId(senderId, receiverId);

    console.log("Evento webrtc_answer ricevuto");

    socket.to(roomId).emit("webrtc_answer", {
      senderId,
      receiverId,
      answer,
    });
  });

  socket.on("webrtc_ice_candidate", (data) => {
    const { senderId, receiverId, candidate } = data;
    const roomId = getPrivateRoomId(senderId, receiverId);

    console.log("Evento webrtc_ice_candidate ricevuto");

    socket.to(roomId).emit("webrtc_ice_candidate", {
      senderId,
      receiverId,
      candidate,
    });
  });

  socket.on("end_call", (data) => {
    const { senderId, receiverId } = data;
    const roomId = getPrivateRoomId(senderId, receiverId);

    console.log("Evento end_call ricevuto:", data);

    io.to(roomId).emit("call_ended", {
      senderId,
      receiverId,
    });
  });

  socket.on("disconnect", async () => {//rimozione socket e offline.
    console.log("Socket disconnesso:", socket.id);

    const userId = socketToUser.get(socket.id);

    if (!userId) return;

    try {
      const userSockets = userToSockets.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          userToSockets.delete(userId);
          await saveUserStatus(userId, "offline");
          broadcastUserStatus(userId, "offline");
          console.log(`Utente ${userId} impostato offline (ultimo socket chiuso)`);
        } else {
          userToSockets.set(userId, userSockets);
          console.log(
            `Socket rimosso per utente ${userId}. Socket ancora attivi: ${userSockets.size}`
          );
        }
      }
    } catch (error) {
      console.error(error);
      console.error("Errore aggiornamento offline su disconnect:", error);
    } finally {
      socketToUser.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});