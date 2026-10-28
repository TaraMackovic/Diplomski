import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Confirmation from "../components/Confirmation";
import useInfiniteList from "../utils/useInfiniteList";
import { formatEventDate } from "../utils/formatEventDate";

import "../styles/AdminPanel.css";

const STATUS_LABELS = {
    active: "Aktivan",
    cancelled: "Otkazan",
    finished: "Završen",
};

function AdminEvents() {
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("");
    const [ordering, setOrdering] = useState("-start_date");

    const [deleteTarget, setDeleteTarget] = useState(null);

    const {
        items: events,
        loading,
        loadingMore,
        error,
        hasMore,
        sentinelRef,
        reload,
    } = useInfiniteList("/admin-api/events/", { search, category, status, ordering });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const response = await api.get("/admin-api/categories/");
            setCategories(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin-api/events/${deleteTarget.id}/`);
            setDeleteTarget(null);
            reload();
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
                    <option value="-start_date">Datum (najnoviji)</option>
                    <option value="start_date">Datum (najstariji)</option>
                    <option value="title">Naziv (rastuće)</option>
                    <option value="-title">Naziv (opadajuće)</option>
                    <option value="-created_at">Kreirano (najnovije)</option>
                </select>

                <button className="admin-btn" onClick={() => navigate("/admin/events/new")}>
                    + Novi događaj
                </button>
            </div>

            {loading ? (
                <p className="admin-empty">Učitavanje...</p>
            ) : error ? (
                <p className="admin-empty">Ne mogu da učitam događaje.</p>
            ) : (
                <div className="admin-table-wrapper admin-table-scroll">
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
                                    <td>{formatEventDate(event.start_date, event.end_date, { timeKnown: event.time_known, locale: "sr-Latn-RS" })}</td>
                                    <td>
                                        <span className={`admin-badge badge-${event.status}`}>
                                            {STATUS_LABELS[event.status] || event.status}
                                        </span>
                                    </td>
                                    <td>{event.sources?.[0]?.source || "—"}</td>
                                    <td>{new Date(event.created_at).toLocaleDateString("sr-Latn-RS")}</td>
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

                    <div ref={sentinelRef} className="admin-load-more">
                        {loadingMore ? "Učitavanje..." : hasMore ? "" : ""}
                    </div>
                </div>
            )}

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