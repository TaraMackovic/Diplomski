import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

import "../styles/Login.css";

import emailIcon from "../assets/icons/icon_email.png";
import welcomeLogo from "../assets/icons/welcome_logo.png";

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setMessage("");

        if (!email) {
            setError("Unesite email adresu.");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/password-reset/", { email });
            setMessage(response.data.message);
            setSent(true);
        } catch (err) {
            setError(
                err.response?.data?.message || "Greška prilikom slanja zahtjeva."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>ZABORAVLJENA ŠIFRA</h1>
                <img src={welcomeLogo} alt="Welcome" className="welcome-logo" />
                <p className="subtitle">
                    Unesite email povezan sa nalogom.
                </p>
                <p className="subtitle">
                    Poslaćemo vam link za reset lozinke.
                </p>

                {!sent && (
                    <>
                        <div className="input-box">
                            <img src={emailIcon} alt="" />
                            <input
                                type="email"
                                placeholder="Email adresa"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            className="auth-button"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? "Slanje..." : "Pošalji link"}
                        </button>
                    </>
                )}

                {error && <p className="error">{error}</p>}
                {message && <p className="success-msg">{message}</p>}

                <p className="bottom-text">
                    Sjetili ste se lozinke?
                    <Link to="/login">Prijavite se</Link>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;