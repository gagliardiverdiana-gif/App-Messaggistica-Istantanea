import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/components/ProfilePage.css";

function ProfilePage({ onBack, onLogout, onUserUpdate }) {
    const [profileData, setProfileData] = useState({
        email: "",
        first_name: "",
        last_name: "",
        username: "",
        phone: "",
        address: "",
        profile_image: "",
        role: "",
        must_change_password: false,
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [loading, setLoading] = useState(true);
    const [profileMessage, setProfileMessage] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [profileError, setProfileError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    useEffect(() => {
        const fetchMyProfile = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await axios.get("http://localhost:5000/api/users/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setProfileData({
                    email: response.data.email || "",
                    first_name: response.data.first_name || "",
                    last_name: response.data.last_name || "",
                    username: response.data.username || "",
                    phone: response.data.phone || "",
                    address: response.data.address || "",
                    profile_image: response.data.profile_image || "",
                    role: response.data.role || "",
                    must_change_password: Boolean(response.data.must_change_password),
                });
            } catch (error) {
                console.error("Errore caricamento profilo:", error);
                setProfileError("Impossibile caricare il profilo.");
            } finally {
                setLoading(false);
            }
        };

        fetchMyProfile();
    }, []);

    useEffect(() => {
        if (!profileMessage) return;

        const timeoutId = setTimeout(() => {
            setProfileMessage("");
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [profileMessage]);

    useEffect(() => {
        if (!passwordMessage) return;

        const timeoutId = setTimeout(() => {
            setPasswordMessage("");
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [passwordMessage]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileError("");
        setProfileMessage("");

        try {
            const token = localStorage.getItem("token");

            await axios.put(
                "http://localhost:5000/api/users/me",
                {
                    first_name: profileData.first_name,
                    last_name: profileData.last_name,
                    username: profileData.username,
                    phone: profileData.phone,
                    address: profileData.address,
                    profile_image: profileData.profile_image,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

            const updatedUser = {
                ...storedUser,
                username: profileData.username,
                profile_image: profileData.profile_image,
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));

            if (onUserUpdate) {
                onUserUpdate(updatedUser);
            }

            setProfileMessage("Profilo aggiornato con successo.");
        } catch (error) {
            console.error("Errore aggiornamento profilo:", error);
            setProfileError(
                error.response?.data?.message ||
                "Errore durante il salvataggio del profilo.",
            );
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordMessage("");

        if (
            !passwordData.currentPassword ||
            !passwordData.newPassword ||
            !passwordData.confirmPassword
        ) {
            setPasswordError("Compila tutti i campi password.");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError("La nuova password deve contenere almeno 6 caratteri.");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("La conferma password non corrisponde.");
            return;
        }

        try {
            const token = localStorage.getItem("token");

            await axios.patch(
                "http://localhost:5000/api/auth/change-password",
                {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setPasswordMessage("Password aggiornata con successo.");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            setProfileData((prev) => ({
                ...prev,
                must_change_password: false,
            }));

            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

            const updatedUser = {
                ...storedUser,
                must_change_password: false,
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));

            if (onUserUpdate) {
                onUserUpdate(updatedUser);
            }
        } catch (error) {
            console.error("Errore cambio password:", error);
            setPasswordError(
                error.response?.data?.message || "Errore durante il cambio password.",
            );
        }
    };

    if (loading) {
        return <div style={{ padding: "20px" }}>Caricamento profilo...</div>;
    }

    return (
        <div className="profile-page">
            <div className="profile-wrapper">
                <div className="profile-header">
                    <h1 className="profile-title">Profilo utente</h1>

                    <div className="profile-top-actions">
                        {!profileData.must_change_password && (
                            <button className="profile-top-btn" onClick={onBack}>
                                Torna alla chat
                            </button>
                        )}
                        <button
                            className="profile-top-btn profile-top-btn-logout"
                            onClick={onLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {profileData.must_change_password && (
                    <div className="profile-message error">
                        Devi cambiare la password temporanea prima di continuare a usare
                        l’account.
                    </div>
                )}

                {profileError && (
                    <div className="profile-message error">{profileError}</div>
                )}

                {profileMessage && (
                    <div className="profile-message success">{profileMessage}</div>
                )}

                <div className="profile-grid">
                    <div className="profile-card">
                        <h2 className="profile-card-title">Dati profilo</h2>

                        <form onSubmit={handleSaveProfile} className="profile-form">
                            <div className="profile-field">
                                <label className="profile-label">Email</label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    disabled
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Nome</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={profileData.first_name}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Cognome</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={profileData.last_name}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={profileData.username}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Telefono</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Indirizzo</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={profileData.address}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Immagine profilo (URL)</label>
                                <input
                                    type="text"
                                    name="profile_image"
                                    value={profileData.profile_image}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Ruolo</label>
                                <input
                                    type="text"
                                    value={profileData.role}
                                    disabled
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-section-actions">
                                <button type="submit" className="profile-primary-btn">
                                    Salva profilo
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="profile-card">
                        <h2 className="profile-card-title">Cambia password</h2>

                        {(passwordError || passwordMessage) && (
                            <div
                                className={`profile-message ${passwordError ? "error" : "success"
                                    }`}
                                style={{
                                    marginTop: "8px",
                                    marginBottom: "14px",
                                    padding: "10px 12px",
                                    fontSize: "14px",
                                    borderRadius: "10px",
                                    width: "100%",
                                }}
                            >
                                {passwordError || passwordMessage}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="profile-form">
                            <div className="profile-field">
                                <label className="profile-label">Password attuale</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Nuova password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Conferma nuova password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    className="profile-input"
                                />
                            </div>

                            <div className="profile-section-actions">
                                <button type="submit" className="profile-primary-btn">
                                    Aggiorna password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;