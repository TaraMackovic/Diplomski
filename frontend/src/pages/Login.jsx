import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

import "../styles/Login.css";

import emailIcon from "../assets/icons/icon_email.png";
import passwordIcon from "../assets/icons/icon_password.png";
import viewPasswordIcon from "../assets/icons/icon_viewpassword.png";
import welcomeLogo from "../assets/icons/welcome_logo.png";

function Login() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const login = async () => {
        try {
            const response = await api.post("/login/", {
                username,
                password,
            });
            localStorage.setItem("access_token", response.data.access);
            localStorage.setItem("refresh_token", response.data.refresh);
            navigate("/userHome");
        } catch (error) {
            setErrorMsg(
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Greška prilikom prijave."
            );
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>PRIJAVITE SE</h1>
                <img
                    src={welcomeLogo}
                    alt="Welcome"
                    className="welcome-logo"
                />
                <p className="subtitle">
                    Pronađi svoj sljedeći događaj.
                </p>
                <div className="input-box">
                    <img src={emailIcon} alt="" />
                    <input
                        type="text"
                        placeholder="Email ili korisničko ime"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className="input-box">
                    <img src={passwordIcon} alt="" />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Lozinka"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        <img src={viewPasswordIcon} alt="" />
                    </button>
                </div>
                <Link to="/forgot-password" className="forgot-password">
                    Zaboravljena šifra?
                </Link>
                <button
                    className="auth-button"
                    onClick={login}
                >
                    Prijava
                </button>
                {errorMsg &&
                    <p className="error">
                        {errorMsg}
                    </p>
                }
                <p className="bottom-text">
                    Nemate kreiran profil?
                    <Link to="/register">
                        Registrujte se
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;