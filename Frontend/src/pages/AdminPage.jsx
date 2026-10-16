import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/components/AdminShared.css";
import "../styles/components/AdminPage.css";

function AdminPage({ onBack, onLogout, onOpenUsersList }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [copyMessage, setCopyMessage] = useState("");

    useEffect(() => {
        let ignore = false;

        async function loadPendingRequests() {
            try {
                setLoading(true);
                setErrorMessage("");

                const token = localStorage.getItem("token");

                const response = await axios.get(
                    "http://localhost:5000/api/admin/registration-requests/pending",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                if (!ignore) {
                    setRequests(response.data);
                }
            } catch (error) {
                if (!ignore) {
                    console.error("Errore caricamento richieste pending:", error);
                    setErrorMessage(
                        error.response?.data?.message ||
                        "Impossibile caricare le richieste pending.",
                    );
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadPendingRequests();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!successMessage) return;

        const timeoutId = setTimeout(() => {
            setSuccessMessage("");
        }, 15000);

        return () => clearTimeout(timeoutId);
    }, [successMessage]);

    useEffect(() => {
        if (!errorMessage) return;

        const timeoutId = setTimeout(() => {
            setErrorMessage("");
        }, 4000);

        return () => clearTimeout(timeoutId);
    }, [errorMessage]);

    const handleApproveRequest = async (requestId) => {
        try {
            setErrorMessage("");
            setSuccessMessage("");
            setGeneratedPassword("");

            const token = localStorage.getItem("token");

            const response = await axios.put(
                `http://localhost:5000/api/admin/registration-requests/${requestId}/approve`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setSuccessMessage("Richiesta approvata con successo.");
            setGeneratedPassword(response.data.temporaryPassword || "");

            setRequests((prev) => prev.filter((request) => request.id !== requestId));
        } catch (error) {
            console.error("Errore approvazione richiesta:", error);
            setErrorMessage(
                error.response?.data?.message ||
                "Errore durante l'approvazione della richiesta.",
            );
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            setErrorMessage("");
            setSuccessMessage("");
            setGeneratedPassword("");

            const token = localStorage.getItem("token");

            const response = await axios.put(
                `http://localhost:5000/api/admin/registration-requests/${requestId}/reject`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setSuccessMessage(
                response.data.message || "Richiesta rifiutata con successo.",
            );
            setRequests((prev) => prev.filter((request) => request.id !== requestId));
        } catch (error) {
            console.error("Errore rifiuto richiesta:", error);
            setErrorMessage(
                error.response?.data?.message ||
                "Errore durante il rifiuto della richiesta.",
            );
        }
    };

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setCopyMessage("Password copiata negli appunti.");

            setTimeout(() => {
                setCopyMessage("");
            }, 3000);
        } catch (error) {
            console.error("Errore copia password:", error);
            setCopyMessage("Impossibile copiare la password.");
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header-bar">
                    <h1 className="admin-page-heading">Dashboard Admin</h1>

                    <div className="admin-actions">
                        <button className="admin-btn" onClick={onBack}>
                            Torna alla chat
                        </button>

                        <button className="admin-btn" onClick={onOpenUsersList}>
                            Lista Utenti
                        </button>

                        <button
                            className="admin-btn admin-btn-danger"
                            onClick={onLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {successMessage && (
                    <div className="admin-alert admin-alert-success">
                        <div>{successMessage}</div>

                        {generatedPassword && (
                            <div className="admin-password-box">
                                <div>
                                    Password temporanea generata:{" "}
                                    <strong>{generatedPassword}</strong>
                                </div>

                                <button onClick={handleCopyPassword} className="admin-copy-btn">
                                    Copia password
                                </button>

                                {copyMessage && (
                                    <div className="admin-copy-feedback">{copyMessage}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {errorMessage && (
                    <div className="admin-alert admin-alert-error">
                        {errorMessage}
                    </div>
                )}

                <div className="admin-panel">
                    <h2 className="admin-panel-title">
                        Richieste di registrazione pending
                    </h2>

                    {loading ? (
                        <p className="admin-loading-text">Caricamento richieste...</p>
                    ) : requests.length === 0 ? (
                        <p className="admin-empty-text">
                            Nessuna richiesta pending al momento.
                        </p>
                    ) : (
                        <div className="admin-request-list">
                            {requests.map((request) => (
                                <div key={request.id} className="admin-request-card">
                                    <p>
                                        <strong>ID:</strong> {request.id}
                                    </p>
                                    <p>
                                        <strong>Email:</strong> {request.email}
                                    </p>
                                    <p>
                                        <strong>Nome:</strong> {request.first_name}
                                    </p>
                                    <p>
                                        <strong>Cognome:</strong> {request.last_name}
                                    </p>
                                    <p>
                                        <strong>Username richiesto:</strong>{" "}
                                        {request.requested_username}
                                    </p>
                                    <p>
                                        <strong>Telefono:</strong> {request.phone || "-"}
                                    </p>
                                    <p>
                                        <strong>Indirizzo:</strong> {request.address || "-"}
                                    </p>
                                    <p>
                                        <strong>Stato:</strong> {request.status}
                                    </p>

                                    <div className="admin-request-actions">
                                        <button
                                            onClick={() => handleApproveRequest(request.id)}
                                            className="admin-request-btn admin-request-btn-approve"
                                        >
                                            Approva
                                        </button>

                                        <button
                                            onClick={() => handleRejectRequest(request.id)}
                                            className="admin-request-btn admin-request-btn-reject"
                                        >
                                            Rifiuta
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminPage;