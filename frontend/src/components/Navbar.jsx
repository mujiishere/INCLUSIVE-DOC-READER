// Top navigation links and logout button.
import { Link, useNavigate } from "react-router-dom";

import { clearToken, getToken } from "../services/authService";


function Navbar() {
    const navigate = useNavigate();
    const isLoggedIn = Boolean(getToken());

    function handleLogout() {
        clearToken();
        navigate("/login");
    }

    return (
        <nav className="navbar">
            <Link to="/documents">Documents</Link>

            {isLoggedIn && <Link to="/upload">Upload</Link>}
            {!isLoggedIn && <Link to="/register">Register</Link>}
            {!isLoggedIn && <Link to="/login">Login</Link>}

            {isLoggedIn && <button onClick={handleLogout}>Logout</button>}
        </nav>
    );
}


export default Navbar;
