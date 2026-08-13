import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";

import "../styles/Login.css";

import passwordIcon from "../assets/icons/icon_password.png";
import viewPasswordIcon from "../assets/icons/icon_viewpassword.png";
import welcomeLogo from "../assets/icons/welcome_logo.png";

function ResetPassword() {

    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("Lozinke se ne poklapaju.");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/password-reset/confirm/", {
                uid,
                token,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });

            setSuccess(response.data.message);

            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            setError(
                err.response?.data?.message || "Greška prilikom resetovanja lozinke."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>NOVA LOZINKA</h1>
                <img src={welcomeLogo} alt="Welcome" className="welcome-logo" />
                <p className="subtitle">
                    Unesite novu lozinku za svoj nalog.
                </p>

                {!success && (
                    <>
                        <div className="input-box">
                            <img src={passwordIcon} alt="" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nova lozinka"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <img src={viewPasswordIcon} alt="" />
                            </button>
                        </div>

                        <div className="input-box">
                            <img src={passwordIcon} alt="" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Potvrdi novu lozinku"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button
                            className="auth-button"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? "Čuvanje..." : "Sačuvaj novu lozinku"}
                        </button>
                    </>
                )}

                {error && <p className="error">{error}</p>}
                {success && <p className="success-msg">{success}</p>}

                {!success && (
                    <p className="bottom-text">
                        <Link to="/login">Nazad na prijavu</Link>
                    </p>
                )}
            </div>
        </div>
    );
}

export default ResetPassword;