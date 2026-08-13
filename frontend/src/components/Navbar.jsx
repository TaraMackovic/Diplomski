import { NavLink, useNavigate } from "react-router-dom";

import homeIcon from "../assets/icons/icon_home.png";
import savedIcon from "../assets/icons/icon_saved.png";
import profileIcon from "../assets/icons/icon_account.png";
import settingsIcon from "../assets/icons/icon_settings.png";
import logo from "../assets/icons/welcome_logo.png";

import "../styles/Navbar.css";

function Navbar() {
    const navigate = useNavigate();

    const navItems = [
        { to: "/userHome", label: "Home", icon: homeIcon },
        { to: "/saved", label: "Saved", icon: savedIcon },
        { to: "/profile", label: "Profile", icon: profileIcon },
        { to: "/settings", label: "Settings", icon: settingsIcon },
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
                        {navItems.map(({ to, label, icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    isActive
                                        ? "navbar-link active"
                                        : "navbar-link"
                                }
                            >
                                <img
                                    src={icon}
                                    alt={label}
                                    className="navbar-icon"
                                />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>
            

            {/* Mobile navbar */}
            <nav className="bottom-tabbar">
                {navItems.map(({ to, label, icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            isActive
                                ? "tabbar-item active"
                                : "tabbar-item"
                        }
                    >
                        <img
                            src={icon}
                            alt={label}
                            className="navbar-icon"
                        />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}

export default Navbar;