// Public header that updates based on authentication state.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { clearToken, getCurrentUser, getToken } from "../services/authService";


function PublicHeader() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        async function loadUser() {
            const token = getToken();
            if (!token) {
                setUser(null);
                return;
            }

            try {
                const data = await getCurrentUser();
                setUser(data);
            } catch {
                setUser(null);
            }
        }

        loadUser();
    }, []);

    function handleLogout() {
        clearToken();
        setUser(null);
        setMenuOpen(false);
        navigate("/");
    }

    return (
        <header className="public-header">
            <div className="public-brand">
                <div className="brand-icon">D</div>
                <div>
                    <h1 className="brand-title">DocuOrbit</h1>
                    <p className="brand-subtitle">Inclusive OCR Platform</p>
                </div>
            </div>

            <div className="public-actions">
                <Link to="/" className="header-link">Home</Link>
                <button className="header-link-btn" onClick={() => navigate("/upload")}>Upload</button>
                <button className="header-link-btn" onClick={() => navigate("/search")}>My Files</button>

                {!user ? (
                    <>
                        <Link to="/auth" className="header-auth-btn">Login</Link>
                        <Link to="/auth?tab=register" className="header-auth-btn outline">Sign Up</Link>
                    </>
                ) : (
                    <div className="user-menu-wrap">
                        <button className="header-auth-btn" onClick={() => setMenuOpen((prev) => !prev)}>
                            Welcome, {user.username}
                        </button>
                        {menuOpen && (
                            <div className="user-dropdown">
                                <button className="dropdown-btn" onClick={() => { setMenuOpen(false); navigate("/dashboard"); }}>
                                    Dashboard
                                </button>
                                <button className="dropdown-btn" onClick={() => { setMenuOpen(false); navigate("/search"); }}>
                                    My Documents
                                </button>
                                {(user.is_staff || user.is_superuser) && (
                                    <button className="dropdown-btn" onClick={() => { setMenuOpen(false); navigate("/admin"); }}>
                                        Admin Dashboard
                                    </button>
                                )}
                                <button className="dropdown-btn danger" onClick={handleLogout}>Logout</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}


export default PublicHeader;
