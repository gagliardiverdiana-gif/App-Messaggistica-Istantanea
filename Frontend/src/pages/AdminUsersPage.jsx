import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "../styles/components/AdminShared.css";
import "../styles/components/AdminUsersPage.css";

function AdminUsersPage({ onBack, onLogout }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        username: "",
        phone: "",
        address: "",
        profile_image: "",
        role: "user",
    });

    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const roleDropdownRef = useRef(null);

    const roleOptions = [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
    ];

    useEffect(() => {
        let ignore = false;

        async function loadUsers() {
            try {
                setLoading(true);
                setErrorMessage("");

                const token = localStorage.getItem("token");

                const response = await axios.get(
                    "http://localhost:5000/api/admin/users",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                if (!ignore) {
                    setUsers(response.data);
                }
            } catch (error) {
                if (!ignore) {
                    console.error("Errore caricamento utenti:", error);
                    setErrorMessage(
                        error.response?.data?.message ||
                        "Errore durante il caricamento utenti.",
                    );
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadUsers();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!successMessage) return;

        const timeoutId = setTimeout(() => {
            setSuccessMessage("");
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [successMessage]);

    useEffect(() => {
        if (!errorMessage) return;

        const timeoutId = setTimeout(() => {
            setErrorMessage("");
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [errorMessage]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                roleDropdownRef.current &&
                !roleDropdownRef.current.contains(event.target)
            ) {
                setIsRoleDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectRole = (role) => {
        setFormData((prev) => ({
            ...prev,
            role,
        }));
        setIsRoleDropdownOpen(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        try {
            setErrorMessage("");
            setSuccessMessage("");

            const token = localStorage.getItem("token");

            const response = await axios.post(
                "http://localhost:5000/api/admin/users",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setSuccessMessage(response.data.message || "Utente creato con successo.");

            setFormData({
                email: "",
                password: "",
                first_name: "",
                last_name: "",
                username: "",
                phone: "",
                address: "",
                profile_image: "",
                role: "user",
            });

            setIsRoleDropdownOpen(false);

            const usersResponse = await axios.get(
                "http://localhost:5000/api/admin/users",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setUsers(usersResponse.data);
        } catch (error) {
            console.error("Errore creazione utente:", error);
            setErrorMessage(
                error.response?.data?.message ||
                "Errore durante la creazione dell'utente.",
            );
        }
    };

    const handleDeleteUser = async (userId) => {
        const confirmDelete = window.confirm(
            "Sei sicuro di voler eliminare questo utente?",
        );

        if (!confirmDelete) return;

        try {
            setErrorMessage("");
            setSuccessMessage("");

            const token = localStorage.getItem("token");

            const response = await axios.delete(
                `http://localhost:5000/api/admin/users/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setSuccessMessage(
                response.data.message || "Utente eliminato con successo.",
            );

            setUsers((prev) => prev.filter((user) => user.id !== userId));
        } catch (error) {
            console.error("Errore eliminazione utente:", error);
            setErrorMessage(
                error.response?.data?.message ||
                "Errore durante l'eliminazione dell'utente.",
            );
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header-bar">
                    <h1 className="admin-page-heading">Lista utenti admin</h1>

                    <div className="admin-actions">
                        <button className="admin-btn" onClick={onBack}>
                            Torna admin dashboard
                        </button>

                        <button className="admin-btn admin-btn-danger" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                </div>

                {successMessage && (
                    <div className="admin-alert admin-alert-success">
                        {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="admin-alert admin-alert-error">{errorMessage}</div>
                )}

                <div className="admin-panel">
                    <h2 className="admin-panel-title">Crea nuovo utente</h2>

                    <form onSubmit={handleCreateUser} className="admin-users-form">
                        <input
                            className="admin-users-form-input"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            type="password"
                            name="password"
                            placeholder="Password iniziale"
                            value={formData.password}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            name="first_name"
                            placeholder="Nome"
                            value={formData.first_name}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            name="last_name"
                            placeholder="Cognome"
                            value={formData.last_name}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            name="username"
                            placeholder="Username"
                            value={formData.username}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            name="phone"
                            placeholder="Telefono"
                            value={formData.phone}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            name="address"
                            placeholder="Indirizzo"
                            value={formData.address}
                            onChange={handleChange}
                        />

                        <input
                            className="admin-users-form-input"
                            name="profile_image"
                            placeholder="URL immagine profilo"
                            value={formData.profile_image}
                            onChange={handleChange}
                        />

                        <div className="admin-users-role-dropdown" ref={roleDropdownRef}>
                            <button
                                type="button"
                                className={`admin-users-role-trigger ${isRoleDropdownOpen ? "open" : ""
                                    }`}
                                onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                            >
                                <span>
                                    {roleOptions.find((option) => option.value === formData.role)
                                        ?.label || "Seleziona ruolo"}
                                </span>

                                <span className="admin-users-role-chevron">▾</span>
                            </button>

                            {isRoleDropdownOpen && (
                                <div className="admin-users-role-menu">
                                    {roleOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`admin-users-role-option ${formData.role === option.value ? "active" : ""
                                                }`}
                                            onClick={() => handleSelectRole(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="admin-btn admin-users-create-btn">
                            Crea utente
                        </button>
                    </form>
                </div>

                <div className="admin-panel">
                    <h2 className="admin-panel-title">Utenti esistenti</h2>

                    {loading ? (
                        <p className="admin-loading-text">Caricamento utenti...</p>
                    ) : users.length === 0 ? (
                        <p className="admin-empty-text">Nessun utente trovato.</p>
                    ) : (
                        <div className="admin-users-list">
                            {users.map((user) => (
                                <div key={user.id} className="admin-user-card">
                                    <p>
                                        <strong>ID:</strong> {user.id}
                                    </p>
                                    <p>
                                        <strong>Email:</strong> {user.email}
                                    </p>
                                    <p>
                                        <strong>Nome:</strong> {user.first_name}
                                    </p>
                                    <p>
                                        <strong>Cognome:</strong> {user.last_name}
                                    </p>
                                    <p>
                                        <strong>Username:</strong> {user.username}
                                    </p>
                                    <p>
                                        <strong>Ruolo:</strong> {user.role}
                                    </p>
                                    <p>
                                        <strong>Telefono:</strong> {user.phone || "-"}
                                    </p>
                                    <p>
                                        <strong>Indirizzo:</strong> {user.address || "-"}
                                    </p>
                                    <p>
                                        <strong>Stato approvazione:</strong> {user.status || "-"}
                                    </p>
                                    <p>
                                        <strong>Stato presenza:</strong>{" "}
                                        {user.realtime_status || "offline"}
                                    </p>
                                    <p>
                                        <strong>Cambio password obbligatorio:</strong>{" "}
                                        {user.must_change_password ? "Sì" : "No"}
                                    </p>

                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="admin-user-delete-btn"
                                    >
                                        Elimina utente
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminUsersPage;