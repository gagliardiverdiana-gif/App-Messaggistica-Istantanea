import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import AdminUsersPage from "./pages/AdminUsersPage";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return "register";

    try {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser.must_change_password ? "change-password" : "chat";
    } catch (error) {
      console.error("Errore parsing user da localStorage:", error);
      localStorage.removeItem("user");
      return "register";
    }
  });

  const [loggedUser, setLoggedUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        console.error("Errore parsing user da localStorage:", error);
        localStorage.removeItem("user");
      }
    }

    return null;
  });

  const inactivityTimerRef = useRef(null);
  const currentStatusRef = useRef(loggedUser ? "online" : "offline");

  const refreshLoggedUserFromStorage = useCallback(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      setLoggedUser(null);
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      setLoggedUser(parsedUser);
    } catch (error) {
      console.error("Errore parsing user da localStorage:", error);
      localStorage.removeItem("user");
      setLoggedUser(null);
    }
  }, []);

  const handleLoginSuccess = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setLoggedUser(user);

    if (
      user.must_change_password === true ||
      user.forcePasswordChange === true
    ) {
      setCurrentPage("change-password");
    } else {
      setCurrentPage("chat");
    }

    currentStatusRef.current = "online";
  };

  useEffect(() => {
    if (!loggedUser) return;

    socket.emit("register_user", { userId: loggedUser.id });
  }, [loggedUser]);

  const updateStatus = useCallback(
    async (status) => {
      const token = localStorage.getItem("token");
      if (!token || !loggedUser) return;
      if (currentStatusRef.current === status) return;

      try {
        await fetch("http://localhost:5000/api/auth/status", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });

        currentStatusRef.current = status;

        socket.emit("user_status_changed", {
          userId: loggedUser.id,
          status,
        });
      } catch (error) {
        console.error("Errore aggiornamento status:", error);
      }
    },
    [loggedUser],
  );

  useEffect(() => {
    if (!loggedUser) return;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimerRef.current);

      if (currentStatusRef.current === "away") {
        updateStatus("online");
      }

      inactivityTimerRef.current = setTimeout(() => {
        updateStatus("away");
      }, 10000);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];

    resetInactivityTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      clearTimeout(inactivityTimerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [loggedUser, updateStatus]);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (loggedUser) {
        socket.emit("user_status_changed", {
          userId: loggedUser.id,
          status: "offline",
        });
      }
    } catch (error) {
      console.error("Errore durante il logout:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      currentStatusRef.current = "offline";
      setLoggedUser(null);
      setCurrentPage("login");
    }
  };

  const handleUserUpdate = useCallback((updatedUser) => {
    setLoggedUser(updatedUser);
  }, []);

  return (
    <>
      <h1
        style={{
          textAlign: "center",
          marginBottom: "24px",
          fontSize: "32px",
          fontWeight: "800",
          letterSpacing: "-0.03em",
          color: "#0f172a",
        }}
      >
        Chat App
      </h1>

      {loggedUser ? (
        currentPage === "change-password" ? (
          <ProfilePage
            onBack={() => {
              refreshLoggedUserFromStorage();
              setCurrentPage("chat");
            }}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />
        ) : currentPage === "profile" ? (
          <ProfilePage
            onBack={() => {
              refreshLoggedUserFromStorage();
              setCurrentPage("chat");
            }}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />
        ) : currentPage === "admin" && loggedUser.role === "admin" ? (
          <AdminPage
            onBack={() => setCurrentPage("chat")}
            onLogout={handleLogout}
            onOpenUsersList={() => setCurrentPage("admin-users")}
          />
        ) : currentPage === "admin-users" && loggedUser.role === "admin" ? (
          <AdminUsersPage
            onBack={() => setCurrentPage("admin")}
            onLogout={handleLogout}
          />
        ) : (
          <ChatPage
            loggedUser={loggedUser}
            onLogout={handleLogout}
            onOpenProfile={() => setCurrentPage("profile")}
            onOpenAdmin={() => setCurrentPage("admin")}
          />
        )
      ) : (
        <div>
          {currentPage === "register" ? (
            <RegisterPage
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
        </div>
      )}
    </>
  );
}

export default App;