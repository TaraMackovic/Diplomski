import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/AdminPanel.css";

function AdminSidebar() {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

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
        <>
            <header className="admin-topbar">
                <button
                    type="button"
                    className="admin-burger"
                    aria-label="Meni"
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                >
                    {open ? "✕" : "☰"}
                </button>
                <span>Admin panel</span>
            </header>

            {open && <div className="admin-backdrop" onClick={close} />}

            <nav className={`admin-sidebar${open ? " open" : ""}`}>
                <div className="admin-sidebar-title">Admin panel</div>
                {links.map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={close}
                        className={({ isActive }) => (isActive ? "admin-link active" : "admin-link")}
                    >
                        {label}
                    </NavLink>
                ))}
            </nav>
        </>
    );
}

export default AdminSidebar;