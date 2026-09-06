import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/AdminPanel.css";

function toDatetimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AdminEventForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        date: "",
        time_known: true,
        location: "",
        latitude: "",
        longitude: "",
        price: "0",
        status: "active",
        tags: "",
    });

    useEffect(() => {
        loadCategories();
        if (isEdit) loadEvent();
    }, [id]);

    const loadCategories = async () => {
        try {
            const response = await api.get("/admin-api/categories/");
            setCategories(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const loadEvent = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin-api/events/${id}/`);
            const e = response.data;
            setForm({
                title: e.title,
                description: e.description || "",
                category: e.category || "",
                date: toDatetimeLocal(e.date),
                time_known: e.time_known,
                location: e.location,
                latitude: e.latitude ?? "",
                longitude: e.longitude ?? "",
                price: e.price,
                status: e.status,
                tags: e.tags || "",
            });
            setImageFile(null);
            setImagePreview(e.image || "");
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam događaj.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
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

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview("");
    };

    const validate = () => {
        if (!form.title.trim()) return "Naslov je obavezan.";
        if (!form.location.trim()) return "Lokacija je obavezna.";
        if (!form.date) return "Datum je obavezan.";
        if (form.price !== "" && Number(form.price) < 0) return "Cijena ne može biti negativna.";
        if (form.latitude && (Number(form.latitude) < -90 || Number(form.latitude) > 90)) {
            return "Latitude mora biti između -90 i 90.";
        }
        if (form.longitude && (Number(form.longitude) < -180 || Number(form.longitude) > 180)) {
            return "Longitude mora biti između -180 i 180.";
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        const data = new FormData();
        data.append("title", form.title);
        data.append("description", form.description);
        data.append("date", form.date);
        data.append("time_known", form.time_known);
        data.append("location", form.location);
        data.append("price", form.price || 0);
        data.append("status", form.status);
        data.append("tags", form.tags);

        // Ova tri polja saljemo SAMO ako imaju vrijednost - prazan string
        // bi izazvao gresku validacije na backendu (ocekuje broj ili nista)
        if (form.category) data.append("category", form.category);
        if (form.latitude) data.append("latitude", form.latitude);
        if (form.longitude) data.append("longitude", form.longitude);

        if (imageFile) {
            data.append("image", imageFile);
        }

        try {
            setSaving(true);
            if (isEdit) {
                await api.put(`/admin-api/events/${id}/`, data, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                await api.post("/admin-api/events/", data, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }
            navigate("/admin/events");
        } catch (err) {
            console.log(err);
            const responseData = err.response?.data;
            if (responseData && typeof responseData === "object") {
                const firstError = Object.values(responseData)[0];
                setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
            } else {
                setError("Greška prilikom čuvanja događaja.");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="admin-empty">Učitavanje...</p>;

    return (
        <div>
            <h1 className="admin-page-title">{isEdit ? "Uredi događaj" : "Novi događaj"}</h1>

            <form className="admin-form" onSubmit={handleSubmit}>
                <label>
                    Naslov
                    <input name="title" value={form.title} onChange={handleChange} />
                </label>

                <label>
                    Opis
                    <textarea name="description" rows={4} value={form.description} onChange={handleChange} />
                </label>

                <div className="admin-form-row">
                    <div>
                        <label>
                            Kategorija
                            <select name="category" value={form.category} onChange={handleChange}>
                                <option value="">Bez kategorije</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div>
                        <label>
                            Status
                            <select name="status" value={form.status} onChange={handleChange}>
                                <option value="active">Aktivan</option>
                                <option value="cancelled">Otkazan</option>
                                <option value="finished">Završen</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="admin-form-row">
                    <div>
                        <label>
                            Datum i vrijeme
                            <input type="datetime-local" name="date" value={form.date} onChange={handleChange} />
                        </label>
                    </div>
                    <div>
                        <label>
                            Cijena (KM)
                            <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} />
                        </label>
                    </div>
                </div>

                <label className="admin-checkbox-row">
                    <input type="checkbox" name="time_known" checked={form.time_known} onChange={handleChange} />
                    Vrijeme je poznato
                </label>

                <label>
                    Lokacija
                    <input name="location" value={form.location} onChange={handleChange} />
                </label>

                <div className="admin-form-row">
                    <div>
                        <label>
                            Latitude
                            <input type="number" step="any" name="latitude" value={form.latitude} onChange={handleChange} />
                        </label>
                    </div>
                    <div>
                        <label>
                            Longitude
                            <input type="number" step="any" name="longitude" value={form.longitude} onChange={handleChange} />
                        </label>
                    </div>
                </div>

                <div className="admin-photo-field">
                    <label>Slika događaja</label>

                    <div className="admin-photo-box" onClick={handleChooseImageClick}>
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt="Pregled slike"
                                className="admin-photo-box-preview"
                            />
                        ) : (
                            <svg
                                className="admin-photo-box-icon"
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
                            className="admin-photo-box-btn"
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
                        className="admin-photo-input-hidden"
                    />

                   
                </div>

                <label>
                    Tagovi (odvojeni zarezom)
                    <input name="tags" placeholder="muzika, festival" value={form.tags} onChange={handleChange} />
                </label>

                {error && <p className="admin-form-error">{error}</p>}

                <div className="admin-row-actions">
                    <button type="submit" className="admin-btn" disabled={saving}>
                        {saving ? "Čuvanje..." : "Sačuvaj"}
                    </button>
                    <button type="button" className="admin-btn admin-btn-outline" onClick={() => navigate("/admin/events")}>
                        Otkaži
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AdminEventForm;