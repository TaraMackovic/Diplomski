import { createPortal } from "react-dom";
import "../styles/Confirmation.css";

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Obriši", danger = true, extraError }) {
    return createPortal(
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                <div className="confirm-message">{message}</div>
                {extraError && <p className="confirm-error">{extraError}</p>}
                <div className="confirm-actions">
                    <button className="confirm-cancel" onClick={onCancel}>Otkaži</button>
                    <button
                        className={danger ? "confirm-danger" : "confirm-primary"}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ConfirmModal;