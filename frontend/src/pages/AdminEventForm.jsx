import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import LocationPicker from "../components/LocationPicker";
import "../styles/AdminPanel.css";

const COUNTRY_CODES = "";
const round6 = (n) => Number(n).toFixed(6);

async function geocodeAddress(query) {
    const country = COUNTRY_CODES ? `&countrycodes=${COUNTRY_CODES}` : "";
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=bs${country}&q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    if (!data.length) return null;
    return { lat: round6(data[0].lat), lng: round6(data[0].lon) };
}

async function reverseGeocode(lat, lng) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=bs&lat=${lat}&lon=${lng}`
    );
    if (!res.ok) throw new Error("Reverse geocoding failed");
    const data = await res.json();
    const a = data.address || {};

    const isPoi = !["place", "boundary", "highway"].includes(data.category);
    const place = isPoi ? data.name || "" : "";

    const street = a.road ? (a.house_number ? `${a.road} ${a.house_number}` : a.road) : "";

    const area = street ? "" : a.suburb || a.neighbourhood || a.city_district || "";

    const city = a.city || a.town || a.village || a.municipality || "";

    const parts = [place, street, area, city].filter(Boolean);
    const unique = parts.filter((p, i) => parts.indexOf(p) === i);

    return unique.length ? unique.join(", ") : data.display_name || "";
}

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

    const geocodedFor = useRef("");

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [error, setError] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        start_date: "",
        end_date: "",
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
                start_date: toDatetimeLocal(e.start_date),
                end_date: toDatetimeLocal(e.end_date),
                time_known: e.time_known,
                location: e.location,
                latitude: e.latitude ?? "",
                longitude: e.longitude ?? "",
                price: e.price,
                status: e.status,
                tags: e.tags || "",
            });
            geocodedFor.current =
                e.latitude != null && e.longitude != null ? (e.location || "").trim() : "";
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
        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
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

    const handleFindLocation = async () => {
        const query = form.location.trim();
        if (!query) {
            setError("Unesite lokaciju koju želite pronaći.");
            return;
        }
        setError("");
        setGeocoding(true);
        try {
            const result = await geocodeAddress(query);
            if (!result) {
                setError("Lokacija nije pronađena. Pokušajte preciznije ili označite na mapi.");
                return;
            }
            geocodedFor.current = query;
            setForm((f) => ({ ...f, latitude: result.lat, longitude: result.lng }));
        } catch (err) {
            console.log(err);
            setError("Greška prilikom pretrage lokacije.");
        } finally {
            setGeocoding(false);
        }
    };

    const handleMapPick = async (lat, lng) => {
        const latStr = round6(lat);
        const lngStr = round6(lng);
        setError("");
        setForm((f) => ({ ...f, latitude: latStr, longitude: lngStr }));
        try {
            const address = await reverseGeocode(latStr, lngStr);
            if (address) {
                geocodedFor.current = address.trim();
                setForm((f) => ({ ...f, location: address }));
            }
        } catch (err) {
            console.log(err); 
        }
    };

    const validate = () => {
        if (!form.title.trim()) return "Naslov je obavezan.";
        if (!form.location.trim()) return "Lokacija je obavezna.";
        if (!form.start_date) return "Datum početka je obavezan.";
        if (form.end_date && form.end_date < form.start_date) return "Kraj ne može biti prije početka.";
        if (form.price !== "" && Number(form.price) < 0) return "Cijena ne može biti negativna.";
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

        setSaving(true);

        let latitude = form.latitude;
        let longitude = form.longitude;
        const locationText = form.location.trim();

        if (!latitude || !longitude || locationText !== geocodedFor.current) {
            try {
                const result = await geocodeAddress(locationText);
                if (!result) {
                    setError("Lokacija nije pronađena. Provjerite naziv ili je označite na mapi.");
                    setSaving(false);
                    return;
                }
                latitude = result.lat;
                longitude = result.lng;
                geocodedFor.current = locationText;
                setForm((f) => ({ ...f, latitude, longitude }));
            } catch (err) {
                console.log(err);
                setError("Greška prilikom pretrage lokacije.");
                setSaving(false);
                return;
            }
        }

        const data = new FormData();
        data.append("title", form.title);
        data.append("description", form.description);
        data.append("start_date", form.start_date);
        data.append("end_date", form.end_date);
        data.append("time_known", form.time_known);
        data.append("location", form.location);
        data.append("price", form.price || 0);
        data.append("status", form.status);
        data.append("tags", form.tags);
        data.append("latitude", latitude);
        data.append("longitude", longitude);

        if (form.category) data.append("category", form.category);
        if (imageFile) data.append("image", imageFile);

        try {
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
                        
                        <label>Početak događaja
                            <input type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange} />
                        </label>
                    </div>
                </div>

                <div className="admin-form-row">
                    <div>       
                        <label>
                            Status
                            <select name="status" value={form.status} onChange={handleChange}>
                                <option value="active">Aktivan</option>
                                <option value="cancelled">Otkazan</option>
                                <option value="finished">Završen</option>
                            </select>
                        </label>
                        <label className="price-field">
                            Cijena (KM)
                            <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} />
                        </label>
                    </div>
                    <div>
                        
                        <label>Kraj događaja
                            <input type="datetime-local" name="end_date" min={form.start_date} value={form.end_date} onChange={handleChange} />
                        </label>
                    </div>
                </div>

                <label className="admin-checkbox-row">
                    <input type="checkbox" name="time_known" checked={form.time_known} onChange={handleChange} />
                    Vrijeme je poznato
                </label>

                <div className="admin-location-field">
                    <label htmlFor="admin-location-input">Lokacija</label>
                    <div className="admin-location-row">
                        <input
                            id="admin-location-input"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleFindLocation();
                                }
                            }}
                            placeholder="npr. Zetra, Sarajevo"
                        />
                        <button
                            type="button"
                            className="admin-btn admin-btn-outline"
                            onClick={handleFindLocation}
                            disabled={geocoding}
                        >
                            {geocoding ? "Tražim..." : "Pronađi na mapi"}
                        </button>
                    </div>

                    <LocationPicker
                        latitude={form.latitude}
                        longitude={form.longitude}
                        onPick={handleMapPick}
                    />
                    <p className="admin-hint">
                        Upišite lokaciju i kliknite „Pronađi na mapi“, ili kliknite direktno na mapu da izaberete tačnu poziciju.
                    </p>
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