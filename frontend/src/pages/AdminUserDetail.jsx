import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/AdminPanel.css";

function AdminUserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, [id]);

    const loadUser = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin-api/users/${id}/`);
            setUser(response.data);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p className="admin-empty">Učitavanje...</p>;
    if (!user) return <p className="admin-empty">Korisnik ne postoji.</p>;

    const rows = [
        ["Username", user.username],
        ["Ime", user.first_name || "—"],
        ["Prezime", user.last_name || "—"],
        ["Email", user.email],
        ["Telefon", user.phone_number || "—"],
        ["Registrovan", new Date(user.date_joined).toLocaleString("sr-RS")],
        ["Sačuvani događaji", user.saved_events_count],
        ["Status", user.is_active ? "Aktivan" : "Deaktiviran"],
        ["Uloga", user.is_staff ? "Administrator" : "Korisnik"],
    ];

    return (
        <div>
            <h1 className="admin-page-title">{user.username}</h1>

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

            <button className="admin-btn admin-btn-outline" onClick={() => navigate("/admin/users")}>
                Nazad na listu
            </button>
        </div>
    );
}

export default AdminUserDetail;