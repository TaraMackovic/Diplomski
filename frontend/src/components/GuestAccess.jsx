import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../styles/GuestAccess.css";

function GuestAccess({ onClose }) {

    const navigate = useNavigate();

    return createPortal(
        <div className="guest-overlay" onClick={onClose}>
            <div className="guest-box" onClick={(e) => e.stopPropagation()}>
                <h2>Niste prijavljeni</h2>
                <p>Prijavite se ili se registrujte da biste nastavili.</p>
                <button className="guest-button" onClick={() => navigate("/login")}>
                    Prijava
                </button>
                <button className="guest-button-white" onClick={() => navigate("/register")}>
                    Registracija
                </button>
                <button className="guest-skip-btn" onClick={onClose}>
                    Nastavi kao gost
                </button>
            </div>
        </div>,
        document.body
    );
}

export default GuestAccess;