import { useState } from "react";
import { login } from "../services/authService";
import "../styles/components/LoginPage.css";

function LoginPage({ onLoginSuccess, currentPage, setCurrentPage }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
      const data = await login(formData);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.must_change_password === true) {
        setMessage("Devi cambiare la password prima di continuare.");
        onLoginSuccess({
          ...data.user,
          forcePasswordChange: true,
        });
        return;
      }

      onLoginSuccess(data.user);
      setMessage(data.message || "Login effettuato con successo");
      console.log("Risposta login:", data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <h1>Accedi</h1>
          <p>Inserisci email e password per entrare nella tua chat.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Inserisci la tua email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Inserisci la tua password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="login-submit-btn">
            Accedi
          </button>
        </form>

        <div className="container-buttons-register">
          {currentPage !== "register" && (
            <button
              className="register-submit-btn register-submit-btn-outlined"
              onClick={() => setCurrentPage("register")}
              style={{ width: "auto", padding: "10px 20px" }}
            >
              Vai a Registrazione
            </button>
          )}
        </div>

        {message && <p className="login-message">{message}</p>}
      </div>
    </div>
  );
}

export default LoginPage;