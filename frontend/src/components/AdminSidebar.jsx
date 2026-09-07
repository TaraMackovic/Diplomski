import { NavLink, useNavigate } from "react-router-dom";
import "../styles/AdminPanel.css";

function AdminSidebar() {

    const navigate = useNavigate()

    const links = [
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/users", label: "Korisnici" },
        { to: "/admin/events", label: "Događaji" },
        { to: "/admin/categories", label: "Kategorije" },
        { to: "/admin/interests", label: "Interesovanja" },
        { to: "/admin/profile", label: "Moj profil" },
        { to: "/admin/settings", label: "Podešavanja" },
    ];

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
            
        </nav>
    );
}

export default AdminSidebar;