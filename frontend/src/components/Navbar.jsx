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

            <div className="header-center" style={{ gap: "20px" }}>
                {!isAdmin ? (
                    <>
                        <Link to="/upload" className="header-link" style={{ fontSize: "1rem", fontWeight: 600 }}>Upload</Link>
                        <Link to="/search" className="header-link" style={{ fontSize: "1rem", fontWeight: 600 }}>View Documents</Link>
                        <Link to="/search" className="header-link" style={{ fontSize: "1rem", fontWeight: 600 }}>Search</Link>
                    </>
                ) : (
                    <>
                        <Link to="/admin" className="header-link" style={{ fontSize: "1rem", fontWeight: 600 }}>Dashboard</Link>
                        <Link to="/users" className="header-link" style={{ fontSize: "1rem", fontWeight: 600 }}>Users</Link>
                    </>
                )}
            </div>

            <div className="header-actions">
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
