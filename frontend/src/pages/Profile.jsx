import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getCurrentUserId } from "../utils/auth";
import "../styles/Profile.css";

function Profile() {
    const navigate = useNavigate();
    const userId = getCurrentUserId();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        phone_number: "",
        city: "",
        profile_image: "",
    });

    const [savedCount, setSavedCount] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");

    useEffect(() => {
        if (!userId) {
            navigate("/login");
            return;
        }
        loadProfile();
        loadSavedCount();
    }, [userId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/profile/${userId}/`);
            setProfile(response.data);
            setForm({
                first_name: response.data.first_name || "",
                last_name: response.data.last_name || "",
                phone_number: response.data.phone_number || "",
                city: response.data.city || "",
                profile_image: response.data.profile_image || "",
            });
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam profil.");
        } finally {
            setLoading(false);
        }
    };

    const loadSavedCount = async () => {
        try {
            const response = await api.get("/saved-events/");
            setSavedCount(response.data.length);
        } catch (err) {
            console.log(err);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveMsg("");
            const response = await api.put(`/profile/${userId}/`, form);
            setProfile(response.data);
            setEditing(false);
            setSaveMsg("Profil je uspješno ažuriran.");
        } catch (err) {
            console.log(err);
            setSaveMsg("Greška pri čuvanju profila.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            phone_number: profile.phone_number || "",
            city: profile.city || "",
            profile_image: profile.profile_image || "",
        });
        setEditing(false);
        setSaveMsg("");
    };

    if (loading) return <h2 className="profile-loading">Učitavanje profila...</h2>;
    if (error) return <h2 className="profile-loading">{error}</h2>;
    if (!profile) return null;

    const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("sr-RS", {
              month: "long",
              year: "numeric",
          })
        : null;

    return (
        <div className="profile-page">
            <div className="profile-header-card">
                <div className="profile-avatar">
                    {profile.profile_image ? (
                        <img src={profile.profile_image} alt="avatar" />
                    ) : (
                        <span>{initials || "?"}</span>
                    )}
                </div>

                <div className="profile-header-info">
                    <h1>
                        {profile.first_name} {profile.last_name}
                    </h1>
                    <p className="profile-username">@{profile.username}</p>
                    {memberSince && (
                        <p className="profile-since">Član od {memberSince}</p>
                    )}
                </div>

                {!editing && (
                    <button className="edit-btn" onClick={() => setEditing(true)}>
                        Uredi profil
                    </button>
                )}
            </div>

            <div className="profile-stats-row">
                <div className="stat-card">
                    <span className="stat-number">{savedCount}</span>
                    <span className="stat-label">Sačuvanih događaja</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">
                        {profile.email_notifications ? "Uključena" : "Isključena"}
                    </span>
                    <span className="stat-label">Email obavještenja</span>
                </div>
            </div>

            <div className="profile-details-card">
                <h3>Informacije o nalogu</h3>

                {!editing ? (
                    <div className="profile-info-list">
                        <div className="info-row">
                            <span className="info-label">Ime</span>
                            <span className="info-value">{profile.first_name || "—"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Prezime</span>
                            <span className="info-value">{profile.last_name || "—"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Telefon</span>
                            <span className="info-value">{profile.phone_number || "—"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Email</span>
                            <span className="info-value">{profile.email}</span>
                        </div>
                    </div>
                ) : (
                    <div className="profile-edit-form">
                        <label>
                            Ime
                            <input
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Prezime
                            <input
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Telefon
                            <input
                                name="phone_number"
                                value={form.phone_number}
                                onChange={handleChange}
                            />
                        </label>


                        <label>
                            URL profilne slike
                            <input
                                name="profile_image"
                                value={form.profile_image}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </label>

                        <div className="form-actions">
                            <button
                                className="save-btn"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Čuvanje..." : "Sačuvaj izmjene"}
                            </button>
                            <button className="cancel-btn" onClick={handleCancel}>
                                Otkaži
                            </button>
                            
                        </div>
                        {editing && (
                                <p className="email-note">
                                    Email adresa: <strong>{profile.email}</strong> (promjena emaila zahtijeva poseban proces verifikacije)
                                </p>
                            )}
                    </div>
                )}

                {saveMsg && <p className="save-msg">{saveMsg}</p>}
            </div>
        </div>
    );
}

export default Profile;