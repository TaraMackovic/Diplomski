import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getCurrentUserId } from "../utils/auth";
import "../styles/Profile.css";

function Profile() {
    const navigate = useNavigate();
    const userId = getCurrentUserId();
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [savedCount, setSavedCount] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [saveError, setSaveError] = useState(false);

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
                email: response.data.email || "",
                username: response.data.username || "",
            });
            setImageFile(null);
            setImagePreview(response.data.profile_image || "");
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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleChooseImageClick = () => {
        fileInputRef.current?.click();
    };

   const handleSave = async () => {
        try {
            setSaving(true);
            setSaveError(false);
            setSaveMsg("Profil je uspješno ažuriran.");

            const data = new FormData();
            data.append("first_name", form.first_name);
            data.append("last_name", form.last_name);
            data.append("username", form.username);
            if (imageFile) {
                data.append("profile_image", imageFile);
            }

            const response = await api.put(`/profile/${userId}/`, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setProfile(response.data);
            setImageFile(null);
            setImagePreview(response.data.profile_image || "");
            setEditing(false);
            setSaveMsg("Profil je uspješno ažuriran.");
        } catch (err) {
            console.log(err);
            const backendMsg = err.response?.data?.message;
            setSaveError(true);
            setSaveMsg(backendMsg || "Greška pri čuvanju profila.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
        });
        setImageFile(null);
        setImagePreview(profile.profile_image || "");
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
                    {imagePreview ? (
                        <img src={imagePreview} alt="avatar" />
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
                            <span className="info-label">Username</span>
                            <span className="info-value">{profile.username || "—"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">E-mail</span>
                            <span className="info-value">{profile.email || "—"}</span>
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
                            Username
                            <input
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                            />
                        </label>

                        <div className="image-upload-field">
                            <span className="image-upload-label">Profilna slika</span>
                            <div className="image-upload-box" onClick={handleChooseImageClick}>
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Pregled slike"
                                        className="image-upload-preview"
                                    />
                                ) : (
                                    <svg
                                        className="image-upload-icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9aa0b4" strokeWidth="1.5" />
                                        <circle cx="8.5" cy="8.5" r="1.5" stroke="#9aa0b4" strokeWidth="1.5" />
                                        <path
                                            d="M21 15l-5.5-5.5a2 2 0 0 0-2.83 0L3 19"
                                            stroke="#9aa0b4"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                                <button
                                    type="button"
                                    className="image-upload-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleChooseImageClick();
                                    }}
                                >
                                    Izaberite sliku
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="image-upload-input-hidden"
                            />
                        </div>
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
                    </div>
                )}

                {saveMsg && (
                    <p className={saveError ? "save-msg save-msg-error" : "save-msg"}>
                        {saveMsg}
                    </p>
                )}
            </div>
        </div>
    );
}

export default Profile;