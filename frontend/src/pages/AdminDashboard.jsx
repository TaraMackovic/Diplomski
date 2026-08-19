import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/AdminPanel.css";

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin-api/dashboard/");
            setStats(response.data);
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam statistiku.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p className="admin-empty">Učitavanje...</p>;
    if (error) return <p className="admin-empty">{error}</p>;
    if (!stats) return null;

    const cards = [
        { label: "Ukupno događaja", value: stats.total_events },
        { label: "Aktivni događaji", value: stats.active_events }, 
        { label: "Novi korisnici (30 dana)", value: stats.new_users_last_30_days },
        { label: "Kategorije", value: stats.total_categories },
        { label: "Korisnici", value: stats.total_users },
        { label: "Završeni događaji", value: stats.past_events },
        { label: "Otkazani događaji", value: stats.cancelled_events },
        { label: "Sačuvani događaji", value: stats.total_saved_events },
    ];

    return (
        <div>
            <h1 className="admin-page-title">Dashboard</h1>

            <div className="admin-stats-grid">
                {cards.map((c) => (
                    <div className="admin-stat-card" key={c.label}>
                        <div className="admin-stat-value">{c.value}</div>
                        <div className="admin-stat-label">{c.label}</div>
                    </div>
                ))}
            </div>

            <div className="admin-dashboard-tables">
                <div className="admin-table-wrapper">
                    <table className="admin-table admin-table-split">
                        <thead>
                            <tr>
                                <th>Kategorija</th>
                                <th>Broj događaja</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.events_by_category.length === 0 ? (
                                <tr><td colSpan={2} className="admin-empty">Nema podataka</td></tr>
                            ) : stats.events_by_category.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.name}</td>
                                    <td>{c.event_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table admin-table-split">
                        <thead>
                            <tr>
                                <th>Najpopularniji događaji</th>
                                <th>Sačuvano</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.popular_events.length === 0 ? (
                                <tr><td colSpan={2} className="admin-empty">Nema podataka</td></tr>
                            ) : stats.popular_events.map((e) => (
                                <tr key={e.id}>
                                    <td>{e.title}</td>
                                    <td>{e.saved_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;