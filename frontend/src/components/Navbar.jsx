import { NavLink, useNavigate } from "react-router-dom";

import homeIcon from "../assets/icons/icon_home.png";
import savedIcon from "../assets/icons/icon_saved.png";
import profileIcon from "../assets/icons/icon_account.png";
import settingsIcon from "../assets/icons/icon_settings.png";
import logo from "../assets/icons/welcome_logo.png";

import "../styles/Navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem("access_token");

    const navItems = isLoggedIn
        ? [
              { to: "/userHome", label: "Home", icon: homeIcon },
              { to: "/saved", label: "Saved", icon: savedIcon },
              { to: "/profile", label: "Profile", icon: profileIcon },
              { to: "/settings", label: "Settings", icon: settingsIcon },
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
            </nav>
        </>
    );
}

export default Navbar;