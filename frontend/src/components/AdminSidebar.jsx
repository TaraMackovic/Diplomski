import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../utils/auth";
import Confirmation from "../components/Confirmation";
import "../styles/AdminPanel.css";

function AdminSidebar() {
    const [open, setOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const navigate = useNavigate();
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

                <button
                    type="button"
                    className="admin-link admin-logout"
                    onClick={() => {
                        close();
                        setShowLogoutConfirm(true);
                    }}
                >
                    Odjava
                </button>
            </nav>

            {showLogoutConfirm && (
                <Confirmation
                    title="Odjava"
                    message="Da li ste sigurni da se želite odjaviti?"
                    confirmLabel="Odjavi se"
                    danger={false}
                    onConfirm={() => logout(navigate)}
                    onCancel={() => setShowLogoutConfirm(false)}
                />
            )}
        </>
    );
}

export default AdminSidebar;