import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordModal from "../components/ChangePassword";
import "../styles/Settings.css";

function AdminSettings() {
    const navigate = useNavigate();

    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
    };

    const handleDeleteAccount = () => {
        const confirmed = window.confirm(
            "Da li ste sigurni da želite trajno obrisati nalog? Ova akcija se ne može poništiti."
        );
        if (confirmed) {
            alert("Brisanje naloga još uvijek nije podržano.");
        }
    };

    return (
        <div className="settings-page">
            <h1>Podešavanja</h1>

            <div className="settings-card">
                <h3>Profil</h3>

                <button
                    className="settings-action-btn"
                    onClick={() => navigate("/admin/profile")}
                >
                    Uredi profil
                </button>

                <button
                    className="settings-action-btn"
                    onClick={() => setShowPasswordModal(true)}
                >
                    Promijeni lozinku
                </button>
            </div>

            <div className="settings-card">
                <h3>Administratori</h3>

                <p className="settings-row-desc">
                    Upravljajte korisnicima koji imaju administratorske privilegije.
                </p>

                <button
                    className="settings-action-btn"
                    onClick={() => navigate("/admin/users")}
                >
                    Upravljaj administratorima
                </button>
            </div>

            {showPasswordModal && (
                <ChangePasswordModal
                    onClose={() => setShowPasswordModal(false)}
                />
            )}

            <div className="settings-card logout-zone">
                <h3>Podešavanja naloga</h3>

                <button className="logout-btn" onClick={handleLogout}>
                    Odjavi se
                </button>

                <button className="delete-btn" onClick={handleDeleteAccount}>
                    Obriši nalog
                </button>
            </div>

        </div>
    );
}

export default AdminSettings;