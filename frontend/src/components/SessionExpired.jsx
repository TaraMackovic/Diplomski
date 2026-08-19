import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../styles/GuestAccess.css";

function SessionExpired({ onClose }) {
    const navigate = useNavigate();

    const goHome = () => {
        onClose();
        navigate("/userHome");
    };

    return createPortal(
        <div className="guest-overlay" onClick={goHome}>
            <div className="guest-box" onClick={(e) => e.stopPropagation()}>
                <h2>401 Error: Sesija je istekla</h2>
                <p>Vaša prijava je istekla. Molimo prijavite se ponovo.</p>
                <button className="guest-button" onClick={goHome}>
                    Nazad na početnu
                </button>
            </div>
        </div>,
        document.body
    );
}

export default SessionExpired;