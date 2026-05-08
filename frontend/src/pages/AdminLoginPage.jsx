// Admin login page: only staff/superuser accounts allowed.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import { loginAdminUser, saveToken } from "../services/authService";


function AdminLoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const data = await loginAdminUser(formData);
            saveToken(data.token);
            navigate("/admin");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="auth-page">
            <div className="card auth-card">
                <h2>Admin Login</h2>
                <p className="muted-text">Sign in with admin account to access admin dashboard.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        placeholder="Admin Username"
                        value={formData.username}
                        onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    />

                    <button type="submit">Admin Login</button>
                    {errorMessage && <p>{errorMessage}</p>}
                    {isSubmitting && <p>Signing in...</p>}
                </form>
                <p className="muted-text" style={{ marginTop: 8 }}>
                    Normal user? <Link to="/login">Go to User Login</Link>
                </p>
            </div>
        </section>
    );
}


export default AdminLoginPage;
