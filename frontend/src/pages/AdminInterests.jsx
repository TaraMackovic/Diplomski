import { useEffect, useState } from "react";
import api from "../services/api";
import Confirmation from "../components/Confirmation";
import "../styles/AdminPanel.css";

function AdminInterests() {
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editing, setEditing] = useState(null);
    const [name, setName] = useState("");
    const [keywords, setKeywords] = useState("");

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    const [removeUsersConfirm, setRemoveUsersConfirm] = useState(false);
    const [removeUsersCount, setRemoveUsersCount] = useState(0);
    const [removingUsers, setRemovingUsers] = useState(false);

    useEffect(() => {
        loadInterests();
    }, []);

    const loadInterests = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin-api/interests/");
            setInterests(response.data);
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam interesovanja.");
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing({ id: null });
        setName("");
        setKeywords("");
        setFormError("");
    };

    const openEdit = (interest) => {
        setEditing(interest);
        setName(interest.name);
        setKeywords(interest.keywords || "");
        setFormError("");
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setFormError("Naziv interesovanja je obavezan.");
            return;
        }

        try {
            setSaving(true);

            const data = {
                name: name.trim(),
                keywords: keywords.trim(),
            };

            if (editing.id) {
                await api.put(`/admin-api/interests/${editing.id}/`, data);
            } else {
                await api.post("/admin-api/interests/", data);
            }

            setEditing(null);
            loadInterests();
        } catch (err) {
            console.log(err);

            const responseData = err.response?.data;

            if (responseData?.name?.[0]) {
                setFormError(responseData.name[0]);
            } else if (responseData?.keywords?.[0]) {
                setFormError(responseData.keywords[0]);
            } else {
                setFormError("Greška prilikom čuvanja.");
            }
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin-api/interests/${deleteTarget.id}/`);
            setDeleteTarget(null);
            setDeleteError("");
            loadInterests();
        } catch (err) {
            console.log(err);

            if (err.response?.status === 400) {
                const userCount = err.response?.data?.user_count || 0;
                setRemoveUsersCount(userCount);
                setRemoveUsersConfirm(true);
            } else {
                setDeleteError(err.response?.data?.message || "Greška prilikom brisanja.");
            }
        }
    };

    const confirmRemoveUsersAndDelete = async () => {
        try {
            setRemovingUsers(true);

            await api.post(`/admin-api/interests/${deleteTarget.id}/remove-from-users/`);

            setRemoveUsersConfirm(false);
            setDeleteTarget(null);
            setDeleteError("");
            loadInterests();
        } catch (err) {
            console.log(err);
            setDeleteError(err.response?.data?.message || "Greška prilikom uklanjanja interesovanja od korisnika.");
        } finally {
            setRemovingUsers(false);
        }
    };

    return (
        <div>
            <h1 className="admin-page-title">Interesovanja</h1>

            <div className="admin-toolbar">
                <button className="admin-btn" onClick={openCreate}>+ Novo interesovanje</button>
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
                                <th>Ključne riječi</th>
                                <th>Broj korisnika</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>

                        <tbody>
                            {interests.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="admin-empty">Nema interesovanja.</td>
                                </tr>
                            ) : (
                                interests.map((interest) => (
                                    <tr key={interest.id}>
                                        <td>{interest.name}</td>
                                        <td>{interest.keywords || "-"}</td>
                                        <td>{interest.user_count ?? 0}</td>
                                        <td>
                                            <div className="admin-row-actions">
                                                <button className="admin-icon-btn" onClick={() => openEdit(interest)}>Uredi</button>
                                                <button className="admin-icon-btn danger" onClick={() => { setDeleteTarget(interest); setDeleteError(""); }}>Obriši</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <Confirmation
                    title={editing.id ? "Uredi interesovanje" : "Novo interesovanje"}
                    danger={false}
                    confirmLabel={saving ? "Čuvanje..." : "Sačuvaj"}
                    onConfirm={handleSave}
                    onCancel={() => setEditing(null)}
                    extraError={formError}
                    message={
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                                    Naziv interesovanja
                                </label>
                                <input
                                    className="admin-search"
                                    style={{ width: "100%" }}
                                    placeholder="npr. Muzika"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                                    Ključne riječi
                                </label>
                                <input
                                    className="admin-search"
                                    style={{ width: "100%" }}
                                    placeholder="npr. koncert, festival, bend"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                />
                            </div>
                        </div>
                    }
                />
            )}

            {deleteTarget && !removeUsersConfirm && (
                <Confirmation
                    title="Obriši interesovanje"
                    message={`Da li ste sigurni da želite obrisati "${deleteTarget.name}"?`}
                    onConfirm={confirmDelete}
                    onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
                    extraError={deleteError}
                />
            )}

            {deleteTarget && removeUsersConfirm && (
                <Confirmation
                    title="Interesovanje se koristi"
                    message={
                        <div>
                            <p>
                                Interesovanje <strong>"{deleteTarget.name}"</strong> trenutno koristi{" "}
                                <strong>{removeUsersCount} {removeUsersCount === 1 ? "korisnik" : "korisnika"}</strong>.
                            </p>
                            <p style={{ marginTop: "10px" }}>
                                Ako nastavite, interesovanje će biti uklonjeno od svih korisnika i zatim obrisano.
                            </p>
                        </div>
                    }
                    confirmLabel={removingUsers ? "Brisanje..." : "Ukloni i obriši"}
                    onConfirm={confirmRemoveUsersAndDelete}
                    onCancel={() => { setRemoveUsersConfirm(false); setRemoveUsersCount(0); setDeleteError(""); }}
                    extraError={deleteError}
                />
            )}
        </div>
    );
}

export default AdminInterests;
