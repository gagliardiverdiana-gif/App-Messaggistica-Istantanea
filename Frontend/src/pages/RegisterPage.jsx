import { useState } from "react";
import { createRegistrationRequest } from "../services/authService";
import "../styles/components/RegisterPage.css";

function RegisterPage({ currentPage, setCurrentPage }) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    requested_username: "",
    phone: "",
    address: "",
    requested_profile_image: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = await createRegistrationRequest(formData);

      setMessage(
        data.message || "Richiesta di registrazione inviata con successo"
      );

      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        requested_username: "",
        phone: "",
        address: "",
        requested_profile_image: "",
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-card-header">
          <h1>Registrazione</h1>
          <p>Invia la tua richiesta di accesso alla piattaforma.</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="first_name">Nome</label>
            <input
              id="first_name"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="last_name">Cognome</label>
            <input
              id="last_name"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="requested_username">Username richiesto</label>
            <input
              id="requested_username"
              type="text"
              name="requested_username"
              value={formData.requested_username}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="phone">Telefono</label>
            <input
              id="phone"
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="address">Indirizzo</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-field">
            <label htmlFor="requested_profile_image">
              Immagine profilo richiesta
            </label>
            <input
              id="requested_profile_image"
              type="text"
              name="requested_profile_image"
              value={formData.requested_profile_image}
              onChange={handleChange}
            />
          </div>

          <div className="container-buttons-register">
            {currentPage !== "login" && (
              <button
                type="button"
                className="register-submit-btn register-submit-btn-outlined"
                onClick={() => setCurrentPage("login")}
                style={{ width: "auto", padding: "10px 20px" }}
              >
                Vai a Login
              </button>
            )}

            <button
              className="register-submit-btn register-submit-btn-active"
              type="submit"
            >
              Invia richiesta
            </button>
          </div>
        </form>

        {message && <p className="register-message">{message}</p>}
      </div>
    </div>
  );
}

export default RegisterPage;