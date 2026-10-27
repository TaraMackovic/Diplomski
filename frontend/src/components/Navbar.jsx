import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { logout } from "../utils/auth";
import Confirmation from "../components/Confirmation";

import homeIcon from "../assets/icons/icon_home.png";
import savedIcon from "../assets/icons/icon_saved.png";
import profileIcon from "../assets/icons/icon_account.png";
import settingsIcon from "../assets/icons/icon_settings.png";
import logoutIcon from "../assets/icons/icon_logout.png";
import logo from "../assets/icons/welcome_logo.png";

import "../styles/Navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const isLoggedIn = !!localStorage.getItem("access_token");
    const isStaff = localStorage.getItem("is_staff") === "true";

    if (isStaff && location.pathname.startsWith("/admin")) {
        return null;
    }

    const navItems = isLoggedIn
        ? [
              { to: "/userHome", label: "Početna", icon: homeIcon },
              { to: "/saved", label: "Sačuvano", icon: savedIcon },
              { to: "/profile", label: "Profil", icon: profileIcon },
              { to: "/settings", label: "Podešavanja", icon: settingsIcon },
          ]
        : [
              { to: "/userHome", label: "Home", icon: homeIcon },
              { to: "/login", label: "Prijava", button: true },
              { to: "/register", label: "Registracija", button: true },
          ];

    return (
        <>
            {/* Desktop navbar */}
            <nav className="top-navbar">
                <div className="navbar-container">
                    <div className="navbar-logo" onClick={() => navigate("/userHome")}>
                        <img src={logo} alt="Logo"/>
                    </div>

                    <div className="navbar-links">
                        {navItems.map(({ to, label, icon, button }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    button
                                        ? `navbar-button ${isActive ? "active" : ""}`
                                        : `navbar-link ${isActive ? "active" : ""}`
                                }
                            >
                                {icon && (
                                    <img
                                        src={icon}
                                        alt={label}
                                        className="navbar-icon"
                                    />
                                )}
                                <span>{label}</span>
                            </NavLink>
                        ))}

                        {isLoggedIn && (
                            <button
                                type="button"
                                className="navbar-link navbar-logout"
                                onClick={() => setShowLogoutConfirm(true)}
                            >
                                <img src={logoutIcon} alt="Odjava" className="navbar-icon" />
                                <span>Odjava</span>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile navbar */}
            <nav className="bottom-tabbar">
                {navItems.map(({ to, label, icon, button }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            button
                                ? `tabbar-button ${isActive ? "active" : ""}`
                                : `tabbar-item ${isActive ? "active" : ""}`
                        }
                    >
                        {icon && (
                            <img
                                src={icon}
                                alt={label}
                                className="navbar-icon"
                            />
                        )}
                        <span>{label}</span>
                    </NavLink>
                ))}

                {isLoggedIn && (
                    <button
                        type="button"
                        className="tabbar-item tabbar-logout"
                        onClick={() => setShowLogoutConfirm(true)}
                    >
                        <img src={logoutIcon} alt="Odjava" className="navbar-icon" />
                        <span>Odjava</span>
                    </button>
                )}
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

export default Navbar;