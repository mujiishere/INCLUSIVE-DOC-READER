// Top header navigation used across authenticated screens.
import { Moon, Search, Sun } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { clearToken, getCurrentUser, getToken } from "../services/authService";
import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "docuorbit-theme";


function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}


function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isLoggedIn = Boolean(getToken());
    const [isAdmin, setIsAdmin] = useState(false);
    const [headerQuery, setHeaderQuery] = useState("");
    const [theme, setTheme] = useState(getInitialTheme);

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
            { to: "/admin", label: "Admin" },
            { to: "/users", label: "Users" },
        ]
        : [];

    function goToSearch() {
        if (isAdmin) {
            return;
        }
        if (location.pathname !== "/search") {
            navigate(buildSearchUrl(headerQuery));
        }
    }

    function goToUpload() {
        if (!isAdmin && location.pathname !== "/upload") {
            navigate("/upload");
        }
    }

    function buildSearchUrl(queryValue) {
        const params = new URLSearchParams(location.pathname === "/search" ? location.search : "");
        const trimmed = queryValue.trim();
        if (trimmed) {
            params.set("q", trimmed);
        } else {
            params.delete("q");
        }
        const qs = params.toString();
        return qs ? `/search?${qs}` : "/search";
    }

    function handleSearchSubmit(e) {
        e.preventDefault();
        if (isAdmin) {
            return;
        }
        navigate(buildSearchUrl(headerQuery));
    }

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setHeaderQuery(params.get("q") || "");
    }, [location.pathname, location.search]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    function toggleTheme() {
        setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
    }

    if (!isLoggedIn) {
        return null;
    }

    return (
        <header className="top-header">
            <button
                className="header-brand"
                onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}
                title="Go to dashboard"
            >
                <span className="brand-icon">D</span>
                <span className="header-brand-text">
                    <strong className="brand-title">DocuOrbit</strong>
                    <small className="brand-subtitle">OCR Platform</small>
                </span>
            </button>

            <div className="header-center">
                <form className="header-search-trigger" onSubmit={handleSearchSubmit}>
                    <Search className="header-search-icon" size={16} />
                    <input
                        type="text"
                        className="header-search-input"
                        placeholder={isAdmin ? "Search unavailable" : "Search documents"}
                        value={headerQuery}
                        onChange={(e) => setHeaderQuery(e.target.value)}
                        onFocus={goToSearch}
                        disabled={isAdmin}
                    />
                </form>
                {!isAdmin && (
                    <button
                        type="button"
                        className="header-upload-btn"
                        onClick={goToUpload}
                    >
                        Upload
                    </button>
                )}
            </div>

            <div className="header-actions">
                {menuItems.map((item) => (
                    <Link key={item.to} to={item.to} className="header-link">
                        {item.label}
                    </Link>
                ))}
                <button
                    type="button"
                    className="header-theme-btn"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                    {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                    {theme === "dark" ? "Light" : "Dark"}
                </button>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}


export default Navbar;
