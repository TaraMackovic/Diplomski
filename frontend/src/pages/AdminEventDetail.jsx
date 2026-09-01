import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/AdminPanel.css";

const STATUS_LABELS = {
    active: "Aktivan",
    cancelled: "Otkazan",
    finished: "Završen",
};

function AdminEventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvent();
    }, [id]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin-api/events/${id}/`);
            setEvent(response.data);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p className="admin-empty">Učitavanje...</p>;
    if (!event) return <p className="admin-empty">Događaj ne postoji.</p>;

    const rows = [
        ["Naslov", event.title],
        ["Opis", event.description || "—"],
        ["Kategorija", event.category_name || "—"],
        ["Lokacija", event.location],
        ["Latitude", event.latitude ?? "—"],
        ["Longitude", event.longitude ?? "—"],
        ["Datum", new Date(event.date).toLocaleString("sr-RS")],
        ["Vrijeme poznato", event.time_known ? "Da" : "Ne"],
        ["Cijena", `${event.price} KM`],
        ["Status", STATUS_LABELS[event.status] || event.status],
        ["Tagovi", event.tags || "—"],
        ["Sačuvano puta", event.saved_count],
        ["Kreiran", new Date(event.created_at).toLocaleString("sr-RS")],
        ["Izmijenjen", new Date(event.updated_at).toLocaleString("sr-RS")],
    ];

    return (
        <div>
            <h1 className="admin-page-title">{event.title}</h1>

            {event.image && (
                <img
                    src={event.image}
                    alt={event.title}
                    style={{ width: "100%", maxWidth: 500, borderRadius: 18, marginBottom: 24 }}
                />
            )}

            <div className="admin-table-wrapper" style={{ marginBottom: 24 }}>
                <table className="admin-table">
                    <tbody>
                        {rows.map(([label, value]) => (
                            <tr key={label}>
                                <th style={{ width: 200 }}>{label}</th>
                                <td>{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {event.sources?.length > 0 && (
                <div className="admin-table-wrapper" style={{ marginBottom: 24 }}>
                    <table className="admin-table">
                        <thead>
                            <tr><th>Izvor</th><th>URL</th></tr>
                        </thead>
                        <tbody>
                            {event.sources.map((s) => (
                                <tr key={s.id}>
                                    <td>{s.source}</td>
                                    <td><a href={s.source_url} target="_blank" rel="noreferrer">{s.source_url}</a></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="admin-row-actions">
                <button className="admin-btn" onClick={() => navigate(`/admin/events/${id}/edit`)}>
                    Uredi
                </button>
                <button className="admin-btn admin-btn-outline" onClick={() => navigate("/admin/events")}>
                    Nazad na listu
                </button>
            </div>
        </div>
    );
}

export default AdminEventDetail;