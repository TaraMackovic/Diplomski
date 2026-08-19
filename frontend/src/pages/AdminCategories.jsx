import { useEffect, useState } from "react";
import api from "../services/api";
import Confirmation from "../components/Confirmation";
import "../styles/AdminPanel.css";

function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editing, setEditing] = useState(null);
    const [name, setName] = useState("");
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin-api/categories/");
            setCategories(response.data);
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam kategorije.");
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing({ id: null });
        setName("");
        setFormError("");
    };

    const openEdit = (category) => {
        setEditing(category);
        setName(category.name);
        setFormError("");
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setFormError("Naziv kategorije je obavezan.");
            return;
        }

        try {
            setSaving(true);
            if (editing.id) {
                await api.put(`/admin-api/categories/${editing.id}/`, { name });
            } else {
                await api.post("/admin-api/categories/", { name });
            }
            setEditing(null);
            loadCategories();
        } catch (err) {
            console.log(err);
            setFormError(err.response?.data?.name?.[0] || "Greška prilikom čuvanja.");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin-api/categories/${deleteTarget.id}/`);
            setDeleteTarget(null);
            setDeleteError("");
            loadCategories();
        } catch (err) {
            setDeleteError(err.response?.data?.message || "Greška prilikom brisanja.");
        }
    };

    return (
        <div>
            <h1 className="admin-page-title">Kategorije</h1>

            <div className="admin-toolbar">
                <button className="admin-btn" onClick={openCreate}>+ Nova kategorija</button>
            </div>

            {loading ? (
                <p className="admin-empty">Učitavanje...</p>
            ) : error ? (
                <p className="admin-empty">{error}</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Naziv</th>
                                <th>Broj događaja</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr><td colSpan={3} className="admin-empty">Nema kategorija.</td></tr>
                            ) : categories.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.name}</td>
                                    <td>{c.event_count}</td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button className="admin-icon-btn" onClick={() => openEdit(c)}>Uredi</button>
                                            <button className="admin-icon-btn danger" onClick={() => { setDeleteTarget(c); setDeleteError(""); }}>
                                                Obriši
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <Confirmation
                    title={editing.id ? "Uredi kategoriju" : "Nova kategorija"}
                    danger={false}
                    confirmLabel={saving ? "Čuvanje..." : "Sačuvaj"}
                    onConfirm={handleSave}
                    onCancel={() => setEditing(null)}
                    extraError={formError}
                    message={
                        <input
                            className="admin-search"
                            style={{ width: "100%" }}
                            placeholder="Naziv kategorije"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    }
                />
            )}

            {deleteTarget && (
                <Confirmation
                    title="Obriši kategoriju"
                    message={`Da li ste sigurni da želite obrisati "${deleteTarget.name}"?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                    extraError={deleteError}
                />
            )}
        </div>
    );
}

export default AdminCategories;