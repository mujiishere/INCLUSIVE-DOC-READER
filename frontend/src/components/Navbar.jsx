// Left sidebar navigation used across authenticated screens.
import { Link, useLocation, useNavigate } from "react-router-dom";

import { clearToken, getCurrentUser, getToken } from "../services/authService";
import { useEffect, useState } from "react";


function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isLoggedIn = Boolean(getToken());
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function loadUserRole() {
            if (!isLoggedIn) {
                setIsAdmin(false);
                return;
            }

            try {
                const user = await getCurrentUser();
                setIsAdmin(Boolean(user.is_staff || user.is_superuser));
            } catch {
                setIsAdmin(false);
            }
        }

        loadUserRole();
    }, [isLoggedIn]);

    function handleLogout() {
        clearToken();
        navigate("/login");
    }

    const menuItems = isAdmin
        ? [
            { to: "/admin", label: "Admin Dashboard" },
            { to: "/users", label: "Users" },
        ]
        : [
            { to: "/dashboard", label: "Dashboard" },
            { to: "/upload", label: "Upload" },
            { to: "/search", label: "Search" },
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
