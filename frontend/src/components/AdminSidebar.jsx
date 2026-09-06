import { NavLink, useNavigate } from "react-router-dom";
import "../styles/AdminPanel.css";

function AdminSidebar() {

    const navigate = useNavigate()

    const links = [
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/categories", label: "Kategorije" },
        { to: "/admin/interests", label: "Interesovanja" },
        { to: "/admin/events", label: "Događaji" },
        { to: "/admin/users", label: "Korisnici" },
    ];

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
    };

    return (
        <nav className="admin-sidebar">
            <div className="admin-sidebar-title">Admin panel</div>
            {links.map(({ to, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => (isActive ? "admin-link active" : "admin-link")}
                >
                    {label}
                </NavLink>
            ))}
            <button className="admin-link admin-back" onClick={handleLogout}>
                ← Odjavi se
            </button>
            
        </nav>
    );
}

export default AdminSidebar;