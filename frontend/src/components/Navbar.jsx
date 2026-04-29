// Left sidebar navigation used across authenticated screens.
import { Link, useLocation, useNavigate } from "react-router-dom";

import { clearToken, getToken } from "../services/authService";


function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isLoggedIn = Boolean(getToken());

    function handleLogout() {
        clearToken();
        navigate("/login");
    }

    const menuItems = [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/upload", label: "Upload" },
        { to: "/search", label: "Search" },
        { to: "/admin", label: "Admin" },
        { to: "/users", label: "Users" },
    ];

    function isActivePath(path) {
        if (path === "/search") {
            return location.pathname === "/search" || location.pathname.startsWith("/documents/");
        }
        return location.pathname === path;
    }

    if (!isLoggedIn) {
        return null;
    }

    return (
        <aside className="sidebar">
            <div className="brand-block">
                <div className="brand-icon">D</div>
                <div>
                    <h1 className="brand-title">DocuOrbit</h1>
                    <p className="brand-subtitle">OCR Platform</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={isActivePath(item.to) ? "nav-link active" : "nav-link"}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <button className="logout-btn" onClick={handleLogout}>
                Logout
            </button>
        </aside>
    );
}


export default Navbar;
