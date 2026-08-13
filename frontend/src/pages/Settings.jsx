import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getCurrentUserId } from "../utils/auth";
import ChangePasswordModal from "../components/ChangePassword";
import InterestsModal from "../components/InterestSettings";
import "../styles/Settings.css";

function Settings() {
    const navigate = useNavigate();
    const userId = getCurrentUserId();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingNotif, setSavingNotif] = useState(false);
    const [msg, setMsg] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showInterestsModal, setShowInterestsModal] = useState(false);

    useEffect(() => {
        if (!userId) {
            navigate("/login");
            return;
        }
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/profile/${userId}/`);
            setProfile(response.data);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleNotifications = async () => {
        try {
            setSavingNotif(true);
            const response = await api.put(`/profile/${userId}/`, {
                ...profile,
                email_notifications: !profile.email_notifications,
            });
            setProfile(response.data);
            setMsg("Podešavanje sačuvano.");
        } catch (err) {
            console.log(err);
            setMsg("Greška pri čuvanju podešavanja.");
        } finally {
            setSavingNotif(false);
        }
    };

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

    if (loading) return <h2 className="settings-loading">Učitavanje...</h2>;

    return (
        <div className="settings-page">
            <h1>Podešavanja</h1>

            <div className="settings-card">
                <h3>Obavještenja</h3>

                <div className="settings-row">
                    <div>
                        <p className="settings-row-title">Email obavještenja</p>
                        <p className="settings-row-desc">
                            Primaj podsjetnike i preporuke novih događaja na email.
                        </p>
                    </div>

                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={profile?.email_notifications || false}
                            onChange={toggleNotifications}
                            disabled={savingNotif}
                        />
                        <span className="slider"></span>
                    </label>
                </div>

                {msg && <p className="settings-msg">{msg}</p>}
            </div>

            <div className="settings-card">
                <h3>Nalog</h3>

                <button className="settings-action-btn" onClick={() => navigate("/profile")}>
                    Uredi profil
                </button>

                <button
                    className="settings-action-btn"
                    onClick={() => setShowPasswordModal(true)}
                >
                    Promijeni lozinku
                </button>

                <button className="settings-action-btn" onClick={() => setShowInterestsModal(true)}>
                    Lični interesi
                </button>
            </div>

            <div className="settings-card logout-zone">
                <h3>Podešavanja naloga</h3>

                <button className="logout-btn" onClick={handleLogout}>
                    Odjavi se
                </button>

                <button className="delete-btn" onClick={handleDeleteAccount}>
                    Obriši nalog
                </button>
            </div>

            {showPasswordModal && (
                <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
            )}

            {showInterestsModal && (
                <InterestsModal onClose={() => setShowInterestsModal(false)} />
            )}
        </div>
    );
}

export default Settings;