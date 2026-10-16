import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/components/ChatPage.css";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function ChatPage({ loggedUser, onLogout, onOpenProfile, onOpenAdmin }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatusMessage, setCallStatusMessage] = useState("");
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const fetchMessages = useCallback(async (userId) => {
    try {
      setLoadingMessages(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:5000/api/messages/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const formattedMessages = response.data.map((message) => ({
        id: message.id,
        text: message.message_text,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        timestamp: new Date(message.created_at).toLocaleString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Errore nel recupero messaggi:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:5000/api/messages/unread-counts",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const countsMap = {};
      response.data.forEach((row) => {
        countsMap[row.sender_id] = Number(row.unread_count);
      });

      setUnreadCounts(countsMap);
    } catch (error) {
      console.error("Errore recupero unread counts:", error);
      setUnreadCounts({});
    }
  }, []);

  const fetchLastMessageForUser = useCallback(async (userId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:5000/api/messages/last-message/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setLastMessages((prev) => ({
        ...prev,
        [userId]: response.data.message_text || "",
      }));
    } catch (error) {
      console.error("Errore recupero ultimo messaggio:", error);
    }
  }, []);

  const cleanupCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setLocalStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((track) => track.stop());
      }
      return null;
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsCallModalOpen(false);
    setIncomingCall(null);
    setIsInCall(false);
    setIsMicEnabled(true);
    setIsCameraEnabled(true);
  }, []);

  const createPeerConnection = useCallback(
    (otherUserId, streamParam) => {
      const streamToUse = streamParam || localStream;
      const pc = new RTCPeerConnection(rtcConfig);

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc_ice_candidate", {
            senderId: loggedUser.id,
            receiverId: otherUserId,
            candidate: event.candidate,
          });
        }
      };

      if (streamToUse) {
        streamToUse.getTracks().forEach((track) => {
          pc.addTrack(track, streamToUse);
        });
      }

      peerConnectionRef.current = pc;
      return pc;
    },
    [localStream, loggedUser.id],
  );

  const startLocalMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
    setIsCallModalOpen(true);
    setIsMicEnabled(true);
    setIsCameraEnabled(true);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    return stream;
  }, []);

  useEffect(() => {
    const onConnect = () => {
      console.log("Socket client connesso:", socket.id);

      if (loggedUser?.id) {
        socket.emit("register_user", { userId: loggedUser.id });
      }
    };

    socket.on("connect", onConnect);

    if (socket.connected && loggedUser?.id) {
      socket.emit("register_user", { userId: loggedUser.id });
    }

    return () => {
      socket.off("connect", onConnect);
    };
  }, [loggedUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get("http://localhost:5000/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const otherUsers = response.data.filter(
          (user) => user.id !== loggedUser.id,
        );

        setUsers(otherUsers);

        await Promise.all(
          otherUsers.map((user) => fetchLastMessageForUser(user.id)),
        );

        await fetchUnreadCounts();
      } catch (error) {
        console.error("Errore nel recupero utenti:", error);
      }
    };

    fetchUsers();
  }, [loggedUser.id, fetchLastMessageForUser, fetchUnreadCounts]);

  useEffect(() => {
    const handleUserStatusUpdated = ({ userId, status }) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === Number(userId)
            ? { ...user, realtime_status: status }
            : user,
        ),
      );

      setSelectedUser((prevSelectedUser) => {
        if (!prevSelectedUser) return prevSelectedUser;

        return prevSelectedUser.id === Number(userId)
          ? { ...prevSelectedUser, realtime_status: status }
          : prevSelectedUser;
      });
    };

    socket.on("user_status_updated", handleUserStatusUpdated);

    return () => {
      socket.off("user_status_updated", handleUserStatusUpdated);
    };
  }, []);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    const handleReceiveMessage = async (data) => {
      const currentSelectedUser = selectedUserRef.current;

      setLastMessages((prev) => ({
        ...prev,
        [data.senderId]: data.message_text,
      }));

      const isCurrentConversation =
        currentSelectedUser &&
        ((data.senderId === loggedUser.id &&
          data.receiverId === currentSelectedUser.id) ||
          (data.senderId === currentSelectedUser.id &&
            data.receiverId === loggedUser.id));

      if (isCurrentConversation) {
        try {
          const token = localStorage.getItem("token");

          await axios.patch(
            `http://localhost:5000/api/messages/read/${data.senderId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
        } catch (error) {
          console.error("Errore aggiornamento lettura realtime:", error);
        }

        await fetchMessages(currentSelectedUser.id);
        await fetchUnreadCounts();
      } else if (data.receiverId === loggedUser.id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("receive_private_message", handleReceiveMessage);

    return () => {
      socket.off("receive_private_message", handleReceiveMessage);
    };
  }, [fetchMessages, fetchUnreadCounts, loggedUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!callStatusMessage) return;

    const timeoutId = setTimeout(() => {
      setCallStatusMessage("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [callStatusMessage]);

  useEffect(() => {
    if (isCallModalOpen && localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.error("Errore play video locale:", err);
      });
    }
  }, [isCallModalOpen, localStream]);

  useEffect(() => {
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
    };

    const handleCallAccepted = async () => {
      try {
        if (!selectedUserRef.current) return;
        if (!localStream) return;

        const pc = createPeerConnection(
          selectedUserRef.current.id,
          localStream,
        );
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("webrtc_offer", {
          senderId: loggedUser.id,
          receiverId: selectedUserRef.current.id,
          offer,
        });

        setIsInCall(true);
      } catch (error) {
        console.error("Errore creazione offer:", error);
      }
    };

    const handleWebrtcOffer = async (data) => {
      try {
        const pc =
          peerConnectionRef.current ||
          createPeerConnection(data.senderId, localStream);

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          senderId: loggedUser.id,
          receiverId: data.senderId,
          answer,
        });
      } catch (error) {
        console.error("Errore gestione offer:", error);
      }
    };

    const handleWebrtcAnswer = async (data) => {
      try {
        if (!peerConnectionRef.current) return;

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer),
        );
      } catch (error) {
        console.error("Errore gestione answer:", error);
      }
    };

    const handleIceCandidate = async (data) => {
      try {
        if (!peerConnectionRef.current) return;
        if (!data.candidate) return;

        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate),
        );
      } catch (error) {
        console.error("Errore aggiunta ICE candidate:", error);
      }
    };

    const handleCallRejected = () => {
      setCallStatusMessage("La chiamata è stata rifiutata.");
      cleanupCall();
    };

    const handleCallEnded = () => {
      setCallStatusMessage("La chiamata è terminata.");
      cleanupCall();
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("webrtc_offer", handleWebrtcOffer);
    socket.on("webrtc_answer", handleWebrtcAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("webrtc_offer", handleWebrtcOffer);
      socket.off("webrtc_answer", handleWebrtcAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
    };
  }, [cleanupCall, createPeerConnection, localStream, loggedUser.id]);

  const getStatusColor = (status) => {
    if (status === "online") return "green";
    if (status === "away") return "gold";
    return "red";
  };

  const toggleMicrophone = () => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMicEnabled(audioTrack.enabled);
  };

  const toggleCamera = () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraEnabled(videoTrack.enabled);
  };

  const startCall = async () => {
    if (!selectedUser) return;

    try {
      const stream = localStream || (await startLocalMedia());
      setCallStatusMessage("");

      socket.emit("call_user", {
        callerId: loggedUser.id,
        receiverId: selectedUser.id,
        callerName: loggedUser.username,
      });

      setLocalStream(stream);
    } catch (error) {
      console.error("Errore avvio chiamata:", error);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      const stream = await startLocalMedia();

      const callerUser = users.find((u) => u.id === incomingCall.callerId);
      if (callerUser) {
        setSelectedUser(callerUser);
        selectedUserRef.current = callerUser;
      }
      setCallStatusMessage("");

      socket.emit("accept_call", {
        callerId: incomingCall.callerId,
        receiverId: loggedUser.id,
      });

      setLocalStream(stream);
      setIncomingCall(null);
      setIsInCall(true);
    } catch (error) {
      console.error("Errore accettazione chiamata:", error);
    }
  };

  const rejectIncomingCall = () => {
    if (!incomingCall) return;

    socket.emit("reject_call", {
      callerId: incomingCall.callerId,
      receiverId: loggedUser.id,
    });

    setIncomingCall(null);
  };

  const closeCallModal = () => {
    if (selectedUserRef.current) {
      socket.emit("end_call", {
        senderId: loggedUser.id,
        receiverId: selectedUserRef.current.id,
      });
    }

    cleanupCall();
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    selectedUserRef.current = user;
    setNewMessage("");

    socket.emit("join_private_chat", {
      userId1: loggedUser.id,
      userId2: user.id,
    });

    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `http://localhost:5000/api/messages/read/${user.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setUnreadCounts((prev) => ({
        ...prev,
        [user.id]: 0,
      }));
    } catch (error) {
      console.error("Errore aggiornamento lettura:", error);
    }

    await fetchMessages(user.id);
    await fetchUnreadCounts();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/messages",
        {
          receiver_id: selectedUser.id,
          message_text: newMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const payload = {
        id: response.data.messageId,
        senderId: loggedUser.id,
        receiverId: selectedUser.id,
        message_text: newMessage,
      };

      setLastMessages((prev) => ({
        ...prev,
        [selectedUser.id]: newMessage,
      }));

      socket.emit("send_private_message", payload);

      await fetchMessages(selectedUser.id);
      setNewMessage("");
    } catch (error) {
      console.error("Errore invio messaggio:", error);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <div className="chat-page-title-wrap">
          <p>
            Benvenuto, {loggedUser.username} · Ruolo: {loggedUser.role}
          </p>
        </div>

        <div className="chat-page-actions">
          <button className="chat-top-btn" onClick={onOpenProfile}>
            Profilo
          </button>

          {loggedUser.role === "admin" && (
            <button className="chat-top-btn" onClick={onOpenAdmin}>
              Admin
            </button>
          )}

          <button
            className="chat-top-btn chat-top-btn-danger"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {callStatusMessage && (
        <div className="chat-status-alert">{callStatusMessage}</div>
      )}

      {incomingCall && (
        <div className="incoming-call-box">
          <p>Chiamata in arrivo da {incomingCall.callerName}</p>

          <div className="incoming-call-actions">
            <button
              className="incoming-call-accept"
              onClick={acceptIncomingCall}
            >
              Accetta
            </button>

            <button
              className="incoming-call-reject"
              onClick={rejectIncomingCall}
            >
              Rifiuta
            </button>
          </div>
        </div>
      )}

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>Utenti</h3>
          </div>

          <div className="chat-users-list">
            {users.length === 0 ? (
              <p className="chat-empty-sidebar">Nessun utente disponibile</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`chat-user-card ${selectedUser?.id === user.id ? "chat-user-card-active" : ""
                    }`}
                >
                  <div className="chat-user-main-row">
                    <span
                      className="chat-user-status"
                      style={{
                        backgroundColor: getStatusColor(user.realtime_status),
                      }}
                    ></span>

                    <img
                      src={
                        user.profile_image || "https://i.pravatar.cc/100?img=12"
                      }
                      alt={`Profilo di ${user.username}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage(
                          user.profile_image ||
                          "https://i.pravatar.cc/100?img=12",
                        );
                      }}
                      className="chat-user-avatar"
                    />

                    <p
                      className={`chat-user-username ${unreadCounts[user.id] > 0
                        ? "chat-user-username-unread"
                        : ""
                        }`}
                    >
                      <strong>
                        {user.username}
                        {unreadCounts[user.id] > 0
                          ? ` [${unreadCounts[user.id]}]`
                          : ""}
                      </strong>
                    </p>
                  </div>

                  <p className="chat-user-name">
                    {user.first_name} {user.last_name}
                  </p>

                  <p
                    className={`chat-user-last-message ${unreadCounts[user.id] > 0
                      ? "chat-user-last-message-unread"
                      : ""
                      }`}
                  >
                    {lastMessages[user.id]
                      ? lastMessages[user.id]
                      : "Nessun messaggio ancora"}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="chat-conversation">
          {selectedUser ? (
            <>
              <div className="chat-conversation-header">
                <div className="chat-conversation-user">
                  <img
                    src={
                      selectedUser.profile_image ||
                      "https://i.pravatar.cc/100?img=12"
                    }
                    alt={`Profilo di ${selectedUser.username}`}
                    onClick={() =>
                      setZoomedImage(
                        selectedUser.profile_image ||
                        "https://i.pravatar.cc/100?img=12",
                      )
                    }
                    className="chat-conversation-avatar"
                  />

                  <div>
                    <h3>Chat con {selectedUser.username}</h3>
                    <p>
                      {selectedUser.first_name} {selectedUser.last_name} -{" "}
                      {selectedUser.email}
                    </p>
                  </div>
                </div>

                <button className="chat-call-btn" onClick={startCall}>
                  Videochiamata
                </button>
              </div>

              <div className="chat-messages-box">
                {loadingMessages ? (
                  <p className="chat-placeholder-text">
                    Caricamento messaggi...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="chat-placeholder-text">
                    Inizia la conversazione con {selectedUser.username}.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-message-row ${message.senderId === loggedUser.id
                        ? "chat-message-row-own"
                        : "chat-message-row-other"
                        }`}
                    >
                      <div
                        className={`chat-message-bubble ${message.senderId === loggedUser.id
                          ? "chat-message-bubble-own"
                          : "chat-message-bubble-other"
                          }`}
                      >
                        {message.text}
                      </div>

                      <div className="chat-message-time">
                        {message.timestamp}
                      </div>
                    </div>
                  ))
                )}

                <div ref={messagesEndRef}></div>
              </div>

              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Scrivi un messaggio..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  className="chat-message-input"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!selectedUser || !newMessage.trim()}
                  className="chat-send-btn"
                >
                  Invia
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty-state">
              <h3>Nessuna conversazione selezionata</h3>
              <p>
                Seleziona un utente dalla colonna a sinistra per iniziare a
                chattare.
              </p>
            </div>
          )}
        </section>
      </div>

      {zoomedImage && (
        <div
          className="chat-image-modal-overlay"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Immagine profilo ingrandita"
            onClick={(e) => e.stopPropagation()}
            className="chat-image-modal-content"
          />
        </div>
      )}

      {isCallModalOpen && (
        <div className="chat-call-modal-overlay">
          <div className="chat-call-modal">
            <div className="chat-call-modal-header">
              <h2>Videochiamata con {selectedUser?.username}</h2>

              <button
                onClick={closeCallModal}
                className={`chat-call-close-btn ${isInCall ? "chat-call-close-btn-danger" : ""
                  }`}
              >
                {isInCall ? "Termina videochiamata" : "Chiudi"}
              </button>
            </div>

            <div className="chat-call-videos">
              <div className="chat-call-video-card">
                <p>Video locale</p>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="chat-call-video"
                />
              </div>

              <div className="chat-call-video-card">
                <p>Video remoto</p>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="chat-call-video"
                />
              </div>
            </div>

            <div className="chat-call-controls">
              <button
                onClick={toggleMicrophone}
                className={`chat-call-control-btn ${!isMicEnabled ? "chat-call-control-btn-off" : ""
                  }`}
              >
                {isMicEnabled ? "Disattiva microfono" : "Attiva microfono"}
              </button>

              <button
                onClick={toggleCamera}
                className={`chat-call-control-btn ${!isCameraEnabled ? "chat-call-control-btn-off" : ""
                  }`}
              >
                {isCameraEnabled ? "Disattiva fotocamera" : "Attiva fotocamera"}
              </button>
            </div>

            <div className="chat-call-footer">
              <p>{isInCall ? "Chiamata attiva" : "Connessione in corso..."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;