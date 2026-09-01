import { useEffect, useState } from "react";
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

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        date: "",
        time_known: true,
        location: "",
        latitude: "",
        longitude: "",
        image: "",
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
                image: e.image || "",
                price: e.price,
                status: e.status,
                tags: e.tags || "",
            });
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

        const payload = {
            ...form,
            category: form.category || null,
            latitude: form.latitude || null,
            longitude: form.longitude || null,
            price: form.price || 0,
        };

        try {
            setSaving(true);
            if (isEdit) {
                await api.put(`/admin-api/events/${id}/`, payload);
            } else {
                await api.post("/admin-api/events/", payload);
            }
            navigate("/admin/events");
        } catch (err) {
            console.log(err);
            const data = err.response?.data;
            if (data && typeof data === "object") {
                const firstError = Object.values(data)[0];
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

                <label>
                    URL slike
                    <input name="image" placeholder="https://..." value={form.image} onChange={handleChange} />
                </label>

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