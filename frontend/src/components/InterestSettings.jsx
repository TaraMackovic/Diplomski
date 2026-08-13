import InterestSelector from "./InterestSelector";
import "../styles/ChangePassword.css";

function InterestsSettings({ onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Lični interesi</h2>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                <InterestSelector minRequired={3} showSkip={false} onSaved={onClose} />
            </div>
        </div>
    );
}

export default InterestsSettings;