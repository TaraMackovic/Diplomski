import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Pagination from "../components/Pagination";
import Confirmation from "../components/Confirmation";
import "../styles/AdminPanel.css";

const STATUS_LABELS = {
    active: "Aktivan",
    cancelled: "Otkazan",
    finished: "Završen",
};

function AdminEvents() {
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("");
    const [ordering, setOrdering] = useState("-date");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        loadEvents();
    }, [search, category, status, ordering, page]);

    useEffect(() => {
        setPage(1);
    }, [search, category, status, ordering]);

    const loadCategories = async () => {
        try {
            const response = await api.get("/admin-api/categories/");
            setCategories(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin-api/events/", {
                params: { search, category, status, ordering, page, page_size: 15 },
            });
            setEvents(response.data.results);
            setTotalPages(response.data.meta.total_pages);
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam događaje.");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin-api/events/${deleteTarget.id}/`);
            setDeleteTarget(null);
            loadEvents();
        } catch (err) {
            console.log(err);
            setDeleteTarget(null);
        }
    };

    return (
        <div>
            <h1 className="admin-page-title">Događaji</h1>

            <div className="admin-toolbar">
                <input
                    className="admin-search"
                    placeholder="Pretraži po nazivu ili lokaciji..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select className="admin-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Sve kategorije</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Svi statusi</option>
                    <option value="active">Aktivan</option>
                    <option value="cancelled">Otkazan</option>
                    <option value="finished">Završen</option>
                </select>

                <select className="admin-select" value={ordering} onChange={(e) => setOrdering(e.target.value)}>
                    <option value="-date">Datum (najnoviji)</option>
                    <option value="date">Datum (najstariji)</option>
                    <option value="title">Naziv (A-Š)</option>
                    <option value="-title">Naziv (Š-A)</option>
                    <option value="-created_at">Kreirano (najnovije)</option>
                </select>

                <button className="admin-btn" onClick={() => navigate("/admin/events/new")}>
                    + Novi događaj
                </button>
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
                                <th>Naslov</th>
                                <th>Kategorija</th>
                                <th>Lokacija</th>
                                <th>Datum</th>
                                <th>Status</th>
                                <th>Izvor</th>
                                <th>Kreiran</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr><td colSpan={8} className="admin-empty">Nema događaja.</td></tr>
                            ) : events.map((event) => (
                                <tr key={event.id}>
                                    <td>{event.title}</td>
                                    <td>{event.category_name || "—"}</td>
                                    <td>{event.location}</td>
                                    <td>{new Date(event.date).toLocaleString("sr-RS")}</td>
                                    <td>
                                        <span className={`admin-badge badge-${event.status}`}>
                                            {STATUS_LABELS[event.status] || event.status}
                                        </span>
                                    </td>
                                    <td>{event.sources?.[0]?.source || "—"}</td>
                                    <td>{new Date(event.created_at).toLocaleDateString("sr-RS")}</td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                className="admin-icon-btn"
                                                onClick={() => navigate(`/admin/events/${event.id}`)}
                                            >
                                                Detalji
                                            </button>
                                            <button
                                                className="admin-icon-btn"
                                                onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                                            >
                                                Uredi
                                            </button>
                                            <button
                                                className="admin-icon-btn danger"
                                                onClick={() => setDeleteTarget(event)}
                                            >
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

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            {deleteTarget && (
                <Confirmation
                    title="Obriši događaj"
                    message={`Da li ste sigurni da želite obrisati "${deleteTarget.title}"?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}

export default AdminEvents;